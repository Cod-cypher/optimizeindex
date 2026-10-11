/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Faq } from '../types';

interface FaqSectionProps {
  heading: string;
  faqs: Faq[];
  /** Dark sections (forest/ink) invert the palette. */
  tone?: 'light' | 'dark';
  id?: string;
}

/**
 * Renders as plain <details>/<summary> rather than a JS accordion, so the
 * answers are in the HTML and readable by crawlers and AI assistants even
 * before — or without — hydration. That is the entire point of the section.
 *
 * Each item is <details data-faq-item><summary><h3>…</h3></summary><div>…</div>.
 * An earlier version put <dt> inside <summary> and <dd> inside <details>,
 * which is invalid HTML (both must be children of a <dl>). The question is an
 * h3 so the outline runs h2 (section) → h3 (question) without skipping a level,
 * which scripts/verify-seo.ts checks. The FAQPage JSON-LD in src/routes.ts is
 * generated from the same arrays, and the gate counts [data-faq-item] against
 * its mainEntity — keep the attribute.
 */
export default function FaqSection({ heading, faqs, tone = 'light', id }: FaqSectionProps) {
  const dark = tone === 'dark';

  return (
    <section
      id={id}
      className={`px-6 md:px-12 py-16 border-t-1.5 border-ink ${dark ? 'bg-forest' : 'bg-cream'}`}
    >
      <div className="max-w-3xl mx-auto">
        <h2
          className={`font-display font-extrabold text-2xl md:text-3xl tracking-tight leading-tight ${
            dark ? 'text-cream' : 'text-ink'
          }`}
        >
          {heading}
        </h2>

        <ul className="mt-6 space-y-3 list-none p-0">
          {faqs.map((faq, i) => (
            <li
              key={i}
              className={`border-1.5 border-ink rounded-xl overflow-hidden ${
                dark ? 'bg-ink/40' : 'bg-paper'
              }`}
            >
              <details data-faq-item className="group" open={i === 0}>
                <summary
                  className={`cursor-pointer list-none px-5 py-4 flex items-start justify-between gap-4 focus-ring ${
                    dark ? 'text-cream' : 'text-ink'
                  }`}
                >
                  <h3 className="font-sans font-bold text-[15px] leading-snug">{faq.question}</h3>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 mt-0.5 font-mono text-lg leading-none transition-transform group-open:rotate-45 ${
                      dark ? 'text-lime' : 'text-stone'
                    }`}
                  >
                    +
                  </span>
                </summary>
                <div
                  className={`px-5 pb-4 -mt-1 font-sans text-sm leading-relaxed ${
                    dark ? 'text-cream/80' : 'text-stone'
                  }`}
                >
                  {faq.answer}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
