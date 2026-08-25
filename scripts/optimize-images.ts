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

  for (const f of ['logo.png', 'logo-160.png', 'logo-160.webp', 'favicon-48.png']) {
    const { size } = await fs.stat(path.join(PUBLIC, f));
    console.log(`  ${f.padEnd(20)}${(size / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error('[images] failed:', err);
  process.exit(1);
});
