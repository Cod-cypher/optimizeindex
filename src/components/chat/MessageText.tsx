/**
 * Renders message text, turning a small allowlist of things into real links.
 *
 * The default everywhere else in this widget is plain text, and that is a
 * safety decision rather than laziness: the assistant is a language model, and
 * a phone number or URL it invented must not be tappable. Someone acting on a
 * hallucinated number is a worse outcome than someone having to copy a real one.
 *
 * So linkifying is scoped two ways.
 *
 *   Anyone's message  — only OptimizeIndex's own phone number and email
 *                       addresses, matched against the constants in
 *                       src/routes.ts. The model cannot invent a different
 *                       number into a link because nothing else matches.
 *
 *   An AGENT message  — additionally any http(s) URL, because a human typed it.
 *                       This is what lets Ali paste a booking link or send the
 *                       "tap to call us" line from the console.
 *
 * Everything else stays literal, including anything that looks like markup.
 * React escapes the text nodes, so there is no injection surface here.
 */

import type { ReactNode } from 'react';
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY } from '../../routes';

/** Addresses a message may turn into a mailto:. Ours only. */
const KNOWN_EMAILS = [CONTACT_EMAIL, 'ali@optimizeindex.com'];

/**
 * Ways the phone number gets written. All resolve to the same tel: target, so
 * a visitor tapping any of them reaches the same place.
 */
const PHONE_FORMS = [
  CONTACT_PHONE, // +12028107042
  CONTACT_PHONE_DISPLAY, // 202 810 7042
  '+1 202 810 7042',
  '(202) 810-7042',
  '202-810-7042',
];

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface Token {
  text: string;
  href?: string;
}

/**
 * Splits text into plain and linkable tokens.
 *
 * One pass with a combined pattern, so a message containing both an email and a
 * phone number does not need the tokens re-scanned and cannot double-wrap.
 */
function tokenize(text: string, allowUrls: boolean): Token[] {
  const parts: string[] = [
    ...KNOWN_EMAILS.map(escapeForRegex),
    ...PHONE_FORMS.map(escapeForRegex),
  ];
  if (allowUrls) parts.push('https?://[^\\s<>")]+');

  const pattern = new RegExp(`(${parts.join('|')})`, 'gi');

  const tokens: Token[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) tokens.push({ text: text.slice(last, match.index) });
    tokens.push({ text: match[0], href: hrefFor(match[0]) });
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last) });

  return tokens;
}

function hrefFor(value: string): string {
  const lower = value.toLowerCase();
  if (KNOWN_EMAILS.some((e) => e.toLowerCase() === lower)) return `mailto:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  // Every accepted phone form maps to the one canonical tel: target.
  return `tel:${CONTACT_PHONE}`;
}

export default function MessageText({
  content,
  fromAgent = false,
}: {
  content: string;
  fromAgent?: boolean;
}): ReactNode {
  const tokens = tokenize(content, fromAgent);

  return (
    <>
      {tokens.map((token, i) =>
        token.href ? (
          <a
            key={i}
            href={token.href}
            // Only matters for the http(s) case; harmless on tel: and mailto:.
            rel="noopener noreferrer"
            className="underline underline-offset-2 decoration-2 hover:opacity-70 focus-ring rounded-sm"
          >
            {token.text}
          </a>
        ) : (
          <span key={i}>{token.text}</span>
        ),
      )}
    </>
  );
}
