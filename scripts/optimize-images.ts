/**
 * Regenerates the derived logo assets from public/logo.png.
 *
 * Run with `npm run images` after replacing the source logo. The outputs are
 * committed, so a normal build never runs this.
 *
 * The original was a 102 KB, 327x329 PNG doing three jobs at once: the header
 * mark (rendered at ~45 px), the favicon, and the og:image. Every cold visit
 * paid 102 KB for a logo. These variants each do one job at the right size.
 */

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const PUBLIC = path.join(process.cwd(), 'public');
const SOURCE = path.join(PUBLIC, 'logo.png');

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  const meta = await sharp(SOURCE).metadata();
  console.log(`  source: ${meta.width}x${meta.height} ${meta.format}`);

  // UI mark. Displayed at ~45-53 CSS px, so 160 covers 3x DPR with headroom.
  await sharp(SOURCE)
    .resize(160, 160, { fit: 'contain', background: TRANSPARENT })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(PUBLIC, 'logo-160.png'));

  await sharp(SOURCE)
    .resize(160, 160, { fit: 'contain', background: TRANSPARENT })
    .webp({ quality: 90 })
    .toFile(path.join(PUBLIC, 'logo-160.webp'));

  // Favicon. Previously the full 102 KB logo, downloaded on every cold visit.
  await sharp(SOURCE)
    .resize(48, 48, { fit: 'contain', background: TRANSPARENT })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(PUBLIC, 'favicon-48.png'));

  await buildOgCard();

  for (const f of ['logo.png', 'logo-160.png', 'logo-160.webp', 'favicon-48.png', 'og-card.png']) {
    const { size } = await fs.stat(path.join(PUBLIC, f));
    console.log(`  ${f.padEnd(20)}${(size / 1024).toFixed(1)} KB`);
  }
}


/**
 * The 1200x630 social card.
 *
 * og:image used to be logo.png — a 327x329 square. Every platform that expects
 * a 1.91:1 card either letterboxed it onto a grey field or cropped it, and
 * twitter:card had to stay on "summary" (the small square layout) because a
 * square image in a large-card slot looks broken. This gives the site a real
 * card so head.ts can use summary_large_image.
 *
 * Composed from an SVG rather than a design file so it stays in version
 * control as text and regenerates from `npm run images`. Fonts are not
 * embedded: SVG text in sharp renders with whatever the host has installed, so
 * the generic families below are deliberate — a missing font would silently
 * render the wrong shapes, and a card is not worth a font pipeline.
 */
async function buildOgCard() {
  const INK = '#141210';
  const CREAM = '#F6F1E6';
  const LIME = '#C9F31D';

  const logo = await sharp(SOURCE).resize(96, 96, { fit: 'contain', background: TRANSPARENT }).png().toBuffer();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${INK}"/>
  <rect x="0" y="0" width="1200" height="12" fill="${LIME}"/>
  <text x="80" y="250" font-family="Helvetica, Arial, sans-serif" font-size="82" font-weight="bold" fill="${CREAM}">Get found on Google</text>
  <text x="80" y="345" font-family="Helvetica, Arial, sans-serif" font-size="82" font-weight="bold" fill="${LIME}">and in AI answers</text>
  <text x="80" y="425" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="${CREAM}" opacity="0.75">Performance marketing measured in calls and revenue</text>
  <text x="196" y="556" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="bold" fill="${CREAM}">OptimizeIndex</text>
  <text x="196" y="592" font-family="monospace" font-size="20" fill="${CREAM}" opacity="0.55">optimizeindex.com</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .composite([{ input: logo, top: 500, left: 80 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'og-card.png'));
}

main().catch((err) => {
  console.error('[images] failed:', err);
  process.exit(1);
});
