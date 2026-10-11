/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

interface StarburstProps {
  text: string;
  className?: string;
  size?: number;
  rotationSpeed?: number;
  /** When set, the sticker is a real <button>; without it, it is decoration. */
  onClick?: () => void;
  /**
   * Accessible name for the button form. Defaults to the visible text; give a
   * fuller one when the sticker's few words do not say what clicking does
   * (keep the visible words inside it, so voice control can still match them).
   */
  ariaLabel?: string;
}

/**
 * The rotating sticker.
 *
 * Two forms, chosen by whether it does anything. With an onClick it renders a
 * <button type="button">, so it is reachable by keyboard and announced as a
 * control — it used to be a clickable <div>, which neither a keyboard user nor
 * an agent driving the page could find. Without one it is aria-hidden, because
 * a spinning "ADMIN ONLY" is texture, not content.
 *
 * Everything inside is a <span>: a <button> may only contain phrasing content.
 * The outer element takes the caller's className (usually its absolute
 * position), and the inner span is the positioned box the label sits in.
 */
export default function Starburst({
  text,
  className = '',
  size = 96,
  rotationSpeed = 20,
  onClick,
  ariaLabel,
}: StarburstProps) {
  // SVG points for 16-point starburst
  const points = 16;
  const outerRadius = size / 2 - 2;
  const innerRadius = outerRadius * 0.82;
  const cx = size / 2;
  const cy = size / 2;

  const pathPoints: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    pathPoints.push(`${x},${y}`);
  }
  const pointsString = pathPoints.join(' ');

  const body = (
    <span className="relative block" style={{ width: size, height: size }}>
      <motion.span
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: rotationSpeed,
          ease: 'linear'
        }}
        className="block w-full h-full"
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full drop-shadow-sm" aria-hidden="true" focusable="false">
          <polygon
            points={pointsString}
            fill="#C9F31D"
            stroke="#141210"
            strokeWidth={1.5}
            strokeLinejoin="miter"
          />
        </svg>
      </motion.span>
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="font-mono font-bold text-ink uppercase tracking-tighter text-center leading-none select-none" style={{ fontSize: size * 0.12 }}>
          {text.split(' ').map((line, idx) => (
            <span key={idx} className="block">
              {line}
            </span>
          ))}
        </span>
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? text}
        className={`select-none cursor-pointer rounded-full focus-ring ${className}`}
      >
        {body}
      </button>
    );
  }

  return (
    <span aria-hidden="true" className={`block select-none ${className}`}>
      {body}
    </span>
  );
}
