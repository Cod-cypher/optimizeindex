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

        <dl className="mt-6 space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`border-1.5 border-ink rounded-xl overflow-hidden ${
                dark ? 'bg-ink/40' : 'bg-paper'
              }`}
            >
              <details className="group" open={i === 0}>
                <summary
                  className={`cursor-pointer list-none px-5 py-4 flex items-start justify-between gap-4 focus-ring ${
                    dark ? 'text-cream' : 'text-ink'
                  }`}
                >
                  <dt className="font-sans font-bold text-[15px] leading-snug">{faq.question}</dt>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 mt-0.5 font-mono text-lg leading-none transition-transform group-open:rotate-45 ${
                      dark ? 'text-lime' : 'text-stone'
                    }`}
                  >
                    +
                  </span>
                </summary>
                <dd
                  className={`px-5 pb-4 -mt-1 font-sans text-sm leading-relaxed ${
                    dark ? 'text-cream/80' : 'text-stone'
                  }`}
                >
                  {faq.answer}
                </dd>
              </details>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
