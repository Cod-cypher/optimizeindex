/**
 * One-off: downloads the Google Fonts we use into public/fonts/ and writes
 * src/fonts.css with local @font-face rules.
 *
 * Run with `npm run fonts` when the font list changes. The output is committed,
 * so a normal build never touches the network.
 *
 * Why: src/index.css used to `@import` Google Fonts from *inside* the bundled
 * CSS, so the browser couldn't discover the font request until the stylesheet
 * had downloaded and parsed — a four-deep blocking chain across two
 * third-party origins, with no preconnect. Serving the files ourselves removes
 * both round trips and the third-party dependency.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'public', 'fonts');
const CSS_OUT = path.join(process.cwd(), 'src', 'fonts.css');

// A modern Chrome UA is what makes Google serve woff2 rather than ttf.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const FAMILIES = [
  'Bricolage+Grotesque:opsz,wght@12..96,200..800',
  'Instrument+Serif:ital,wght@0,400;1,400',
  'Inter:wght@300..800',
  'Space+Mono:ital,wght@0,400;0,700;1,400;1,700',
];

/** Only the base latin subset. The site is English-only, and latin-ext was
 * doubling the number of font requests competing for bandwidth on first load. */
const KEEP_SUBSETS = ['latin'];

interface FontFace {
  family: string;
  style: string;
  weight: string;
  subset: string;
  unicodeRange: string;
  url: string;
}

/**
 * Google's CSS puts the subset name in a comment immediately BEFORE each
 * block:
 *
 *     \/* latin-ext *\/
 *     @font-face { ... }
 *     \/* latin *\/
 *     @font-face { ... }
 *
 * Pair the comment with the block that follows it in a single match. An
 * earlier version split on '@font-face' and scanned each chunk for a comment —
 * but a chunk holds its own declarations followed by the NEXT face's comment,
 * so every face inherited the following face's subset name. The latin-ext file
 * was then written out as '...-latin.woff2', and because the real latin face
 * produced the same filename it was skipped as a duplicate. The result was a
 * font with no basic ASCII in it: every mono label on the site silently fell
 * back to the system monospace, which is what made capital letters look like
 * they came from a different typeface.
 */
function parseFaces(css: string): FontFace[] {
  const faces: FontFace[] = [];
  const blockRe = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;

  for (const [, subset, block] of css.matchAll(blockRe)) {
    const family = block.match(/font-family:\s*'([^']+)'/)?.[1];
    const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    if (!family || !url) continue;

    faces.push({
      family,
      style: block.match(/font-style:\s*([^;]+);/)?.[1].trim() ?? 'normal',
      weight: block.match(/font-weight:\s*([^;]+);/)?.[1].trim() ?? '400',
      subset,
      unicodeRange: block.match(/unicode-range:\s*([^;]+);/)?.[1].trim() ?? '',
      url,
    });
  }
  return faces;
}

function fileNameFor(f: FontFace): string {
  const slug = f.family.toLowerCase().replace(/\s+/g, '-');
  const weight = f.weight.replace(/\s+/g, '-');
  return `${slug}-${weight}-${f.style}-${f.subset}.woff2`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const url = `https://fonts.googleapis.com/css2?${FAMILIES.map((f) => `family=${f}`).join('&')}&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Google Fonts CSS request failed: ${res.status}`);
  const css = await res.text();

  const faces = parseFaces(css).filter((f) => KEEP_SUBSETS.includes(f.subset));
  if (faces.length === 0) throw new Error('No font faces parsed — the CSS format may have changed.');

  // Guard against the off-by-one described above ever coming back: every face
  // we keep must actually cover basic ASCII. A subset that starts at U+0100 is
  // latin-ext wearing the wrong label, and would leave the site with no A-Z.
  for (const f of faces) {
    if (f.unicodeRange && !/U\+0000-00FF/i.test(f.unicodeRange)) {
      throw new Error(
        `${f.family} ${f.weight} ${f.style} was labelled "${f.subset}" but its ` +
          `unicode-range does not include basic latin (U+0000-00FF). ` +
          `The subset-to-block pairing is wrong — see parseFaces.`,
      );
    }
  }

  const rules: string[] = [];
  const seen = new Set<string>();

  for (const face of faces) {
    const name = fileNameFor(face);
    if (!seen.has(name)) {
      seen.add(name);
      const bin = await fetch(face.url, { headers: { 'User-Agent': UA } });
      if (!bin.ok) throw new Error(`Failed to download ${face.url}: ${bin.status}`);
      const buf = Buffer.from(await bin.arrayBuffer());
      await fs.writeFile(path.join(OUT_DIR, name), buf);
      console.log(`  ${name.padEnd(46)} ${(buf.length / 1024).toFixed(1)} KB`);
    }

    rules.push(
      [
        '@font-face {',
        `  font-family: '${face.family}';`,
        `  font-style: ${face.style};`,
        `  font-weight: ${face.weight};`,
        // swap keeps text visible during load — an invisible-text period is a
        // direct LCP penalty.
        `  font-display: swap;`,
        `  src: url('/fonts/${name}') format('woff2');`,
        face.unicodeRange ? `  unicode-range: ${face.unicodeRange};` : '',
        '}',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const header = [
    '/*',
    ' * Self-hosted fonts. GENERATED by scripts/fetch-fonts.ts — do not edit.',
    ' * Regenerate with `npm run fonts`.',
    ' *',
    ' * These replace the Google Fonts @import that used to sit at the top of',
    ' * index.css, where it forced the browser to download and parse the whole',
    ' * stylesheet before it could even discover the font request.',
    ' */',
    '',
  ].join('\n');

  await fs.writeFile(CSS_OUT, `${header}${rules.join('\n\n')}\n`, 'utf-8');
  console.log(`\n[fonts] ${seen.size} files in public/fonts, ${rules.length} @font-face rules in src/fonts.css`);
}

main().catch((err) => {
  console.error('[fonts] failed:', err);
  process.exit(1);
});
