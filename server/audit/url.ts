/**
 * URL normalization and SSRF-safe fetching for the site audit.
 *
 * The audit endpoints turn this server into an outbound HTTP client driven by
 * whatever a stranger types into the homepage. Everything in this file exists
 * to stop that from becoming a way to read the private network — cloud
 * metadata at 169.254.169.254 above all.
 *
 * We use node:http/https rather than global fetch so we can pass a custom
 * `lookup`. That closes the DNS-rebinding window: the address we validate is
 * the exact address the socket connects to, not one resolved a moment earlier
 * in a separate call.
 */

import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";
import zlib from "node:zlib";
import { URL } from "node:url";

export const AUDIT_USER_AGENT =
  "OptimizeIndexAudit/1.0 (+https://optimizeindex.com/audit)";

/** Error codes the client maps to specific UI states. */
export type AuditErrorCode =
  | "INVALID_URL"
  | "BLOCKED_HOST"
  | "DNS_FAILED"
  | "UNREACHABLE"
  | "TIMEOUT"
  | "TOO_MANY_REDIRECTS"
  | "TOO_LARGE"
  | "BOT_BLOCKED"
  | "BAD_STATUS";

export class AuditError extends Error {
  code: AuditErrorCode;
  status?: number;
  constructor(code: AuditErrorCode, message: string, status?: number) {
    super(message);
    this.name = "AuditError";
    this.code = code;
    this.status = status;
  }
}

/* -------------------------------------------------------------------------
   Address classification
------------------------------------------------------------------------- */

function ipv4Bytes(ip: string): number[] | null {
  if (!net.isIPv4(ip)) return null;
  return ip.split(".").map(Number);
}

/** Expands any valid IPv6 text form (including ::ffff:1.2.3.4) to 16 bytes. */
function ipv6Bytes(input: string): number[] | null {
  const ip = input.split("%")[0]; // drop any zone id
  if (!net.isIPv6(ip)) return null;

  // A trailing dotted-quad (IPv4-mapped / NAT64) occupies the last two groups.
  let v4Tail: number[] | null = null;
  let work = ip;
  const lastColon = work.lastIndexOf(":");
  const tail = work.slice(lastColon + 1);
  if (tail.includes(".")) {
    v4Tail = ipv4Bytes(tail);
    if (!v4Tail) return null;
    work = work.slice(0, lastColon + 1) + "0:0";
  }

  const halves = work.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const back = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - back.length;
  if (halves.length === 1 ? missing !== 0 : missing < 0) return null;

  const groups = [
    ...head,
    ...Array(halves.length === 2 ? missing : 0).fill("0"),
    ...back,
  ];
  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const g of groups) {
    const n = parseInt(g || "0", 16);
    if (Number.isNaN(n) || n < 0 || n > 0xffff) return null;
    bytes.push((n >> 8) & 0xff, n & 0xff);
  }
  if (v4Tail) bytes.splice(12, 4, ...v4Tail);
  return bytes;
}

function isBlockedIPv4(b: number[]): boolean {
  const [a, c, d] = b;
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 100 && c >= 64 && c <= 127) return true; // 100.64/10 CGNAT
  if (a === 169 && c === 254) return true; // link-local — cloud metadata
  if (a === 172 && c >= 16 && c <= 31) return true; // private
  if (a === 192 && c === 0 && d === 0) return true; // IETF protocol assignments
  if (a === 192 && c === 0 && d === 2) return true; // TEST-NET-1
  if (a === 192 && c === 168) return true; // private
  if (a === 198 && (c === 18 || c === 19)) return true; // benchmarking
  if (a === 198 && c === 51 && d === 100) return true; // TEST-NET-2
  if (a === 203 && c === 0 && d === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

function isBlockedIPv6(b: number[]): boolean {
  const allZero = b.every((x) => x === 0);
  if (allZero) return true; // ::
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true; // ::1

  // IPv4-mapped ::ffff:a.b.c.d — judge by the embedded v4 address.
  if (
    b.slice(0, 10).every((x) => x === 0) &&
    b[10] === 0xff &&
    b[11] === 0xff
  ) {
    return isBlockedIPv4(b.slice(12));
  }
  // NAT64 64:ff9b::/96 — likewise.
  if (
    b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b &&
    b.slice(4, 12).every((x) => x === 0)
  ) {
    return isBlockedIPv4(b.slice(12));
  }

  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (b[0] === 0xff) return true; // ff00::/8 multicast
  return false;
}

/** True when this address must never be connected to. */
export function isBlockedAddress(ip: string): boolean {
  const v4 = ipv4Bytes(ip);
  if (v4) return isBlockedIPv4(v4);
  const v6 = ipv6Bytes(ip);
  if (v6) return isBlockedIPv6(v6);
  return true; // unparseable — refuse rather than guess
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  return /\.(local|internal|localdomain|home\.arpa|test|invalid|localhost)$/.test(h);
}

/* -------------------------------------------------------------------------
   Normalization
------------------------------------------------------------------------- */

export interface NormalizedUrl {
  url: URL;
  domain: string;
}

/**
 * Accepts what a person actually types — `example.com`, `www.example.com`,
 * `https://example.com/pricing` — and returns a URL we are willing to fetch.
 * Bare input is assumed https; scan.ts falls back to http if https fails.
 */
export function normalizeInput(raw: string): NormalizedUrl {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || trimmed.length > 2000) {
    throw new AuditError("INVALID_URL", "Enter a website address.");
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new AuditError("INVALID_URL", "That doesn't look like a website address.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AuditError("INVALID_URL", "Only http and https addresses can be checked.");
  }
  // Credentials in a URL are only ever used to smuggle past naive parsers.
  if (url.username || url.password) {
    throw new AuditError("INVALID_URL", "Remove the credentials from the address.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new AuditError("INVALID_URL", "Only standard web ports can be checked.");
  }
  if (!url.hostname || !url.hostname.includes(".")) {
    throw new AuditError("INVALID_URL", "Enter a full domain, like example.com.");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new AuditError("BLOCKED_HOST", "Enter a public website address.");
  }
  // An IP literal is never a real prospect and is the usual SSRF probe.
  if (net.isIP(url.hostname)) {
    throw new AuditError("BLOCKED_HOST", "Enter a public website address.");
  }

  url.hash = "";
  const domain = url.hostname.toLowerCase().replace(/^www\./, "");
  return { url, domain };
}

/* -------------------------------------------------------------------------
   Guarded fetching
------------------------------------------------------------------------- */

/**
 * A drop-in for dns.lookup that refuses to hand back a private address.
 * Passed to http.request, so validation happens at connect time and there is
 * no window for the name to be re-resolved to something else.
 */
const guardedLookup: NonNullable<http.RequestOptions["lookup"]> = (
  hostname,
  options,
  callback,
) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) {
      callback(new AuditError("DNS_FAILED", `Couldn't resolve ${hostname}.`), "", 4);
      return;
    }
    const list = addresses as dns.LookupAddress[];
    for (const a of list) {
      if (isBlockedAddress(a.address)) {
        callback(new AuditError("BLOCKED_HOST", "Enter a public website address."), "", 4);
        return;
      }
    }
    if ((options as dns.LookupAllOptions).all) {
      (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    } else {
      callback(null, list[0].address, list[0].family);
    }
  });
};

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  accept?: string;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  finalUrl: URL;
  headers: http.IncomingHttpHeaders;
  body: string;
  redirects: number;
  truncated: boolean;
}

function decompress(buf: Buffer, encoding?: string): Buffer {
  try {
    const enc = (encoding || "").toLowerCase();
    if (enc.includes("br")) return zlib.brotliDecompressSync(buf);
    if (enc.includes("gzip")) return zlib.gunzipSync(buf);
    if (enc.includes("deflate")) return zlib.inflateSync(buf);
  } catch {
    // Truncated bodies fail to inflate — fall through and use the raw bytes.
  }
  return buf;
}

function requestOnce(
  url: URL,
  opts: Required<Omit<FetchOptions, "maxRedirects">>,
): Promise<{ res: http.IncomingMessage; body: Buffer; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: "GET",
        lookup: guardedLookup,
        headers: {
          "User-Agent": AUDIT_USER_AGENT,
          Accept: opts.accept,
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
        },
        // Some sites present certs we can't chain; a TLS complaint shouldn't
        // block an SEO audit, and we never send credentials.
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > opts.maxBytes) {
            truncated = true;
            res.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({ res, body: Buffer.concat(chunks), truncated }),
        );
        res.on("close", () => {
          if (truncated) resolve({ res, body: Buffer.concat(chunks), truncated });
        });
        res.on("error", (e) => reject(e));
      },
    );

    req.setTimeout(opts.timeoutMs, () => {
      req.destroy(new AuditError("TIMEOUT", "The site took too long to respond."));
    });
    req.on("error", (err: NodeJS.ErrnoException) => {
      if (err instanceof AuditError) return reject(err);
      if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
        return reject(new AuditError("DNS_FAILED", "Couldn't resolve that domain."));
      }
      reject(new AuditError("UNREACHABLE", "Couldn't reach that site."));
    });
    req.end();
  });
}

/**
 * Fetches a URL, following redirects by hand so every hop is re-validated.
 * Never throws on an HTTP error status — the caller decides what a 404 on
 * /llms.txt means versus a 404 on the homepage.
 */
export async function safeFetch(
  input: URL | string,
  options: FetchOptions = {},
): Promise<FetchResult> {
  const opts = {
    timeoutMs: options.timeoutMs ?? 10000,
    maxBytes: options.maxBytes ?? 2 * 1024 * 1024,
    accept: options.accept ?? "text/html,application/xhtml+xml,*/*;q=0.8",
  };
  const maxRedirects = options.maxRedirects ?? 3;

  let current = typeof input === "string" ? new URL(input) : new URL(input.toString());
  let redirects = 0;

  for (;;) {
    if (isBlockedHostname(current.hostname)) {
      throw new AuditError("BLOCKED_HOST", "Enter a public website address.");
    }
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      throw new AuditError("BLOCKED_HOST", "That site redirects somewhere we can't follow.");
    }

    const { res, body, truncated } = await requestOnce(current, opts);
    const status = res.statusCode || 0;
    const location = res.headers.location;

    if (status >= 300 && status < 400 && location) {
      if (redirects >= maxRedirects) {
        throw new AuditError("TOO_MANY_REDIRECTS", "That site redirects too many times.");
      }
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new AuditError("UNREACHABLE", "That site redirects somewhere invalid.");
      }
      // A redirect target with credentials is a bypass attempt, not a website.
      if (next.username || next.password) {
        throw new AuditError("BLOCKED_HOST", "That site redirects somewhere we can't follow.");
      }
      current = next;
      redirects += 1;
      continue;
    }

    const text = decompress(body, res.headers["content-encoding"] as string).toString("utf8");
    return {
      ok: status >= 200 && status < 300,
      status,
      finalUrl: current,
      headers: res.headers,
      body: text,
      redirects,
      truncated,
    };
  }
}
