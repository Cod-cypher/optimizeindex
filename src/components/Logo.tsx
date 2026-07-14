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
}

export default function Logo({ className = '', size = 32, variant = 'light', withIcon = true }: LogoProps) {
  // Brand colors
  const textColor = variant === 'light' ? 'text-[#1B3828]' : 'text-white';
  const taglineBg = variant === 'light' ? 'bg-[#1B3828] text-white' : 'bg-[#C9F31D] text-[#1B3828]';

  return (
    <div className={`inline-flex items-center gap-2 shrink-0 ${className}`}>
      {withIcon && (
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="shrink-0 select-none object-contain"
          style={{ height: size * 1.4, width: 'auto' }}
          draggable={false}
        />
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
