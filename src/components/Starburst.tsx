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
  onClick?: () => void;
}

export default function Starburst({ text, className = '', size = 96, rotationSpeed = 20, onClick }: StarburstProps) {
  // SVG points for 16-point starburst
  const points = 16;
  const outerRadius = size / 2 - 2;
  const innerRadius = outerRadius * 0.82;
  const cx = size / 2;
  const cy = size / 2;

  let pathPoints: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    pathPoints.push(`${x},${y}`);
  }
  const pointsString = pathPoints.join(' ');

  return (
    <div 
      onClick={onClick}
      className={`relative select-none ${className} ${onClick ? 'cursor-pointer' : ''}`} 
      style={{ width: size, height: size }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: rotationSpeed,
          ease: 'linear'
        }}
        className="w-full h-full"
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full drop-shadow-sm">
          <polygon
            points={pointsString}
            fill="#C9F31D"
            stroke="#141210"
            strokeWidth={1.5}
            strokeLinejoin="miter"
          />
        </svg>
      </motion.div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="font-mono font-bold text-ink uppercase tracking-tighter text-center leading-none select-none" style={{ fontSize: size * 0.12 }}>
          {text.split(' ').map((line, idx) => (
            <span key={idx} className="block">
              {line}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
