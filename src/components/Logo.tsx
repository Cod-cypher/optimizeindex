/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number; // Controls the wordmark scale
  variant?: 'light' | 'dark'; // Light or dark theme adaptation
  withIcon?: boolean; // Brand mark image (public/logo.png) beside the text
  priority?: boolean; // Set on the above-the-fold header instance
}

export default function Logo({ className = '', size = 32, variant = 'light', withIcon = true, priority = false }: LogoProps) {
  // Brand colors
  const textColor = variant === 'light' ? 'text-[#1B3828]' : 'text-white';
  const taglineBg = variant === 'light' ? 'bg-[#1B3828] text-white' : 'bg-[#C9F31D] text-[#1B3828]';

  return (
    <div className={`inline-flex items-center gap-2 shrink-0 ${className}`}>
      {/* The mark renders at ~45-53 CSS px, so the UI uses a 160px asset
          rather than the full-size logo.png (which stays for og:image and
          schema). WebP with a PNG fallback: 7.8 KB against the 102 KB the
          original cost on every cold visit.

          width/height are required here — without an intrinsic aspect ratio
          the sticky header reflowed horizontally as the image decoded, which
          is a real CLS source. `priority` marks the above-the-fold instance;
          the footer copy loads lazily. */}
      {withIcon && (
        <picture>
          <source srcSet="/logo-160.webp" type="image/webp" />
          <img
            src="/logo-160.png"
            alt=""
            aria-hidden="true"
            width={160}
            height={160}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className="shrink-0 select-none object-contain"
            style={{ height: size * 1.4, width: 'auto' }}
            draggable={false}
          />
        </picture>
      )}

      {/* BRAND TYPOGRAPHY BLOCK */}
      <div className="flex flex-col justify-center select-none text-left">
        {/* Main Logo Text "OptimizeIndex" */}
        <span className={`font-display font-extrabold tracking-tight leading-none ${textColor}`} style={{ fontSize: size * 0.65 }}>
          Optimize<span className={variant === 'light' ? 'text-lime-700 font-black' : 'text-[#C9F31D] font-black'}>Index</span>
        </span>
        {/* Tagline "DATA-DRIVEN PERFORMANCE" */}
        <span
          className="font-mono tracking-widest font-bold uppercase leading-none mt-1"
          style={{ fontSize: Math.max(8, size * 0.22) }}
        >
          <span className={`inline-block px-1.5 py-0.5 rounded-sm ${taglineBg}`}>
            Data-Driven Performance
          </span>
        </span>
      </div>
    </div>
  );
}
