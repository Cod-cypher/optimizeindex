/**
 * Admin authentication.
 *
 * Deliberately dependency-free — password hashing, session signing and cookie
 * parsing are all a few lines of `node:crypto` plus a string split, and the
 * repo already hand-rolls its rate limiting and URL normalization rather than
 * pulling a package in for each.
 *
 * Sessions are stateless: an HMAC-signed payload in an httpOnly cookie. There
 * is no server-side session store, so "log out everywhere" is done by rotating
 * SESSION_SECRET, and a deactivated account is caught by the `isActive` check
 * in requireAdmin on the next request rather than instantly.
 */

import crypto from "node:crypto";
import type express from "express";
import type { PrismaClient } from "@prisma/client";

export const SESSION_COOKIE = "oi_admin";

/** 7 days. Long enough not to be annoying, short enough to bound a stolen cookie. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SCRYPT_KEYLEN = 64;

/* -------------------------------------------------------------------------
   Secret
------------------------------------------------------------------------- */

/**
 * Reads SESSION_SECRET, failing loudly in production.
 *
 * A missing secret is not a degraded mode — it would mean either unsigned
 * sessions or a secret that changes on restart, so the server refuses to serve
 * admin routes without one. In development we fall back to an ephemeral random
 * value: `npm run dev` works out of the box, and restarting just logs you out.
 */
let cachedSecret: string | null = null;

export function sessionSecret(): string {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters. Admin sessions cannot be " +
        "signed without it. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
    );
  }

  console.warn(
    "[Auth] SESSION_SECRET not set — using a random per-process secret. " +
      "Admin sessions will not survive a restart. Set one in .env before deploying.",
  );
  cachedSecret = crypto.randomBytes(48).toString("hex");
  return cachedSecret;
}

/* -------------------------------------------------------------------------
   Passwords
------------------------------------------------------------------------- */

/** Returns "<saltHex>:<derivedKeyHex>", which is what AdminUser.passwordHash stores. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

/** Constant-time. Returns false rather than throwing on a malformed stored hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, keyHex] = String(stored).split(":");
  if (!saltHex || !keyHex) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(keyHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT_KEYLEN) return false;

  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), SCRYPT_KEYLEN);
  return crypto.timingSafeEqual(actual, expected);
}

/* -------------------------------------------------------------------------
   Sessions
------------------------------------------------------------------------- */

interface SessionPayload {
  uid: string;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(data).digest("base64url");
}

export function signSession(userId: string): string {
  const payload: SessionPayload = { uid: userId, exp: Date.now() + SESSION_TTL_MS };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(body)}`;
}

/** Returns the user id, or null if the token is malformed, forged or expired. */
export function verifySession(token: string | undefined): string | null {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = hmac(body);
  // Compare as bytes, and bail on a length mismatch first — timingSafeEqual
  // throws rather than returning false when the lengths differ.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (!payload?.uid || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------
   Cookies
------------------------------------------------------------------------- */

/** Minimal replacement for cookie-parser — one header, split twice. */
export function readCookie(req: express.Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return part.slice(eq + 1).trim();
    }
  }
  return undefined;
}

/**
 * `Secure` is set in production only. The flag makes browsers refuse to send
 * the cookie over plain HTTP, so setting it in development would silently break
 * login on http://localhost.
 *
 * NOTE: production is currently served over HTTP (deploy/nginx-optimizeindex.conf
 * has no SSL block — certbot has not been run). Admin login will not work until
 * it is. That is the correct failure mode: a session cookie should not travel
 * in the clear.
 */
export function setSessionCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000,
    )}`,
  );
}

export function clearSessionCookie(res: express.Response) {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=0`);
}

/* -------------------------------------------------------------------------
   Login throttling
------------------------------------------------------------------------- */

/**
 * Separate from server/audit/ratelimit.ts on purpose: that limiter's windows
 * (8 per 10 minutes) and its copy are written for the public audit tool. A
 * login form needs a much tighter ceiling and a different message.
 *
 * In-process, which is sufficient for the single PM2 instance this app runs as
 * (see ecosystem.config.cjs). Must move to the database if it is ever scaled out.
 */
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginHits = new Map<string, number[]>();

export function checkLoginRate(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();

  // Opportunistic sweep so the Map cannot grow without bound.
  for (const [k, times] of loginHits) {
    if (times.length === 0 || now - times[times.length - 1] > LOGIN_WINDOW_MS) loginHits.delete(k);
  }

  const times = (loginHits.get(key) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
  if (times.length >= LOGIN_LIMIT) {
    loginHits.set(key, times);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((LOGIN_WINDOW_MS - (now - times[0])) / 1000)),
    };
  }

  times.push(now);
  loginHits.set(key, times);
  return { allowed: true };
}

/** Called on a successful login so a legitimate typo streak doesn't lock someone out. */
export function clearLoginRate(key: string) {
  loginHits.delete(key);
}

/* -------------------------------------------------------------------------
   Middleware
------------------------------------------------------------------------- */

export interface AdminRequest extends express.Request {
  adminId?: string;
  adminEmail?: string;
}

/**
 * Guards /api/admin/*. Responds 401 JSON — the admin UI is a client-side app
 * and handles the redirect to the login screen itself, so a redirect here would
 * just produce HTML in a fetch() response.
 */
export function requireAdmin(prisma: PrismaClient) {
  return async (req: AdminRequest, res: express.Response, next: express.NextFunction) => {
    const userId = verifySession(readCookie(req, SESSION_COOKIE));
    if (!userId) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }

    try {
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isActive: true },
      });
      // A valid signature is not enough: the account may have been deactivated
      // or deleted since the cookie was issued.
      if (!user || !user.isActive) {
        clearSessionCookie(res);
        res.status(401).json({ error: "unauthenticated" });
        return;
      }
      req.adminId = user.id;
      req.adminEmail = user.email;
      next();
    } catch (err) {
      console.error("[Auth] Session lookup failed:", err);
      res.status(503).json({ error: "auth_unavailable" });
    }
  };
}
