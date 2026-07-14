/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TICKER_ITEMS } from '../data';
import { Sparkles } from 'lucide-react';

export default function Marquee() {
  // Duplicate the list multiple times to allow infinite seamless scrolling
  const listItems = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="relative w-full bg-ink overflow-hidden border-y-1.5 border-ink py-4 select-none">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] transition-all duration-300">
        {listItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-4 mx-8 shrink-0 font-mono text-xs uppercase tracking-widest text-cream"
          >
            {/* Value (money first!) */}
            <span className="font-display font-extrabold text-lime text-lg">
              {item.value}
            </span>
            {/* Stat Label */}
            <span className="text-cream/90 font-medium">
              {item.stat}
            </span>
            {/* Lime 8-point separator icon */}
            <Sparkles className="w-3 h-3 text-lime fill-lime shrink-0 ml-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
