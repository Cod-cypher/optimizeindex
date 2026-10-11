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
  // Kept at its published URL: favicon URLs should stay stable once crawled.
  await sharp(SOURCE)
    .resize(48, 48, { fit: 'contain', background: TRANSPARENT })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(PUBLIC, 'favicon-48.png'));

  // Google asks for a square favicon larger than 48x48 in a format it lists
  // (PNG or ICO, not SVG or WebP); the 48 px file alone sits exactly on that
  // line. 192 px also covers Android's home-screen icon. Linked from
  // index.html with sizes="192x192".
  // https://developers.google.com/search/docs/appearance/favicon-in-search
  await sharp(SOURCE)
    .resize(192, 192, { fit: 'contain', background: TRANSPARENT })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(PUBLIC, 'favicon-192.png'));

  // /favicon.ico, which browsers and some crawlers request without being told
  // to, and which 404'd. sharp cannot write ICO, so it is assembled by hand.
  await fs.writeFile(path.join(PUBLIC, 'favicon.ico'), await buildIco([16, 32, 48]));

  await buildOgCard();

  for (const f of [
    'logo.png',
    'logo-160.png',
    'logo-160.webp',
    'favicon-48.png',
    'favicon-192.png',
    'favicon.ico',
    'og-card.png',
  ]) {
    const { size } = await fs.stat(path.join(PUBLIC, f));
    console.log(`  ${f.padEnd(20)}${(size / 1024).toFixed(1)} KB`);
  }
}


/**
 * An ICO file with one PNG-compressed image per size.
 *
 * The container is a 6-byte ICONDIR header, then one 16-byte ICONDIRENTRY per
 * image, then the image data. Every browser that reads ICO accepts PNG
 * payloads (Windows has since Vista), so each entry is simply a PNG.
 * Full RGBA rather than a palette PNG, because some ICO readers only accept
 * 32-bit PNG payloads.
 */
async function buildIco(sizes: number[]): Promise<Buffer> {
  const images = await Promise.all(
    sizes.map((size) =>
      sharp(SOURCE)
        .resize(size, size, { fit: 'contain', background: TRANSPARENT })
        .ensureAlpha()
        .png({ compressionLevel: 9 })
        .toBuffer(),
    ),
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  images.forEach((png, i) => {
    const size = sizes[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // colour count: 0 for >= 8bpp
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // size of the image data
    entry.writeUInt32LE(offset, 12); // where the image data starts
    entries.push(entry);
    offset += png.length;
  });

  return Buffer.concat([header, ...entries, ...images]);
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
 *
 * The card is an identity surface (CLAUDE.md, Positioning): its copy leads with
 * AI and the revenue problem and never names a mechanism as what the company
 * is. It carries no figures, so no number on it can drift from a sourced one.
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
  <text x="80" y="425" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="${CREAM}" opacity="0.75">AI solutions for businesses missing revenue</text>
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
