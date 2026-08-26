/**
 * Slug generation for proposals served at the root: optimizeindex.com/<slug>.
 *
 * Sharing the root namespace with the marketing site is what makes the link
 * worth sending, but it means a careless slug could shadow a real page. Nothing
 * here is allowed to collide with a route, a redirect, a static asset directory
 * or a file the server publishes at the root.
 */

import { ROUTES, REDIRECTS, NOT_FOUND_ROUTE } from "../../src/routes";
import type { PrismaClient } from "@prisma/client";

/**
 * Names a proposal may never take.
 *
 * Built from src/routes.ts rather than typed out, so adding a marketing page
 * automatically reserves its slug. The literals below cover everything else the
 * server answers at the root: API and asset mounts, the files in public/, and a
 * short list of paths worth keeping free for later.
 */
function buildReserved(): Set<string> {
  const reserved = new Set<string>();

  const add = (path: string) => {
    // "/case-study/sujood-mats" reserves "case-study" — a proposal slug is a
    // single segment, so only the first one can collide.
    const first = path.replace(/^\/+/, "").split("/")[0];
    if (first) reserved.add(first.toLowerCase());
  };

  for (const route of ROUTES) add(route.path);
  add(NOT_FOUND_ROUTE.path);
  for (const from of Object.keys(REDIRECTS)) add(from);
  for (const to of Object.values(REDIRECTS)) add(to);

  for (const literal of [
    // Server mounts
    "api",
    "admin",
    "assets",
    "fonts",
    "uploads",
    "p",
    // Files published from public/
    "robots.txt",
    "sitemap.xml",
    "llms.txt",
    "favicon.ico",
    "favicon-48.png",
    "logo.png",
    "logo-160.png",
    "logo-160.webp",
    "index.html",
    "404",
    "404.html",
    "app-shell.html",
    // Kept free for obvious future pages
    "about",
    "blog",
    "contact",
    "pricing",
    "login",
    "logout",
    "dashboard",
    "settings",
    "account",
    "static",
    "public",
    "well-known",
  ]) {
    reserved.add(literal);
  }

  return reserved;
}

const RESERVED = buildReserved();

export function isReservedSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  // ".well-known" arrives with a leading dot from some clients; normalize it
  // the same way the check below normalizes everything else.
  return RESERVED.has(s) || RESERVED.has(s.replace(/^\./, ""));
}

/**
 * "ABC Logistics, LLC" -> "abc-logistics-llc"
 *
 * Strips accents so "Álvarez Hauling" becomes "alvarez-hauling" rather than
 * percent-encoded bytes in a link someone has to read over the phone.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['\p{Pf}]/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** True for a slug that is well-formed on its own terms, ignoring collisions. */
export function isValidSlugShape(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 60;
}

/**
 * Turns a company name (or an admin-chosen slug) into one that is valid,
 * unreserved and unused: "abc-logistics", then "abc-logistics-2", "-3", ...
 *
 * `excludeId` lets an existing proposal keep its own slug when it is re-saved
 * without a change — otherwise every save would bump it to "-2".
 */
export async function uniqueSlug(
  prisma: PrismaClient,
  desired: string,
  excludeId?: string,
): Promise<string> {
  let base = slugify(desired);

  if (!base || base.length < 2) base = "proposal";

  // A reserved base gets a suffix rather than an error: the admin typed a
  // company name, not a URL, and "Services Unlimited" is a real business.
  if (isReservedSlug(base)) base = `${base}-proposal`;

  for (let n = 1; n < 500; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (isReservedSlug(candidate)) continue;

    const existing = await prisma.proposal.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }

  // 500 proposals for one company name. Fall back to something unmistakably
  // unique rather than looping forever.
  return `${base}-${Date.now().toString(36)}`;
}
