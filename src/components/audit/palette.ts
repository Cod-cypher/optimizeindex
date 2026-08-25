/**
 * Status palette for the audit report.
 *
 * These three values are not a taste call — they were run through the
 * colorblind-separation validator against the cream (#F6F1E6) surface:
 *
 *   Lightness band       PASS  all inside L 0.43-0.77
 *   Chroma floor         PASS  all >= 0.1 (none read as gray)
 *   CVD separation       PASS  worst adjacent pair dE 20.0 (protan), 28.8 (tritan)
 *   Normal-vision floor  PASS  worst adjacent pair dE 29.3
 *   Contrast vs surface  WARN  amber 1.9:1 -> relieved by an always-visible
 *                              numeric label and a 1.5px ink border on every fill
 *
 * The previous pairing (#B4232A critical / #8F5700 warning) failed badly: dE 1.8
 * under deuteranopia, meaning a red-green colorblind visitor could not tell a
 * critical issue from a warning at all, and only 12.5 with full colour vision.
 *
 * Rules that come with these values:
 *   - status colours are reserved; never reuse one as a "category 4" hue
 *   - never ship status as colour alone — always an icon plus a text label
 *   - re-run the validator before changing any of them:
 *     node scripts/validate_palette.js "#17794A,#E0A82E,#A8191F" --mode light --surface "#F6F1E6"
 */

export type ScoreBand = 'strong' | 'fair' | 'weak' | 'critical';

export interface BandStyle {
  /** Mark fill — always paired with a border and a visible number. */
  fill: string;
  /** Unfilled meter track: a lighter step of the same hue, so state reads
   *  across the whole bar rather than only the filled part. */
  track: string;
  /** Text-safe step, >= 4.5:1 on cream. Fills are not always text-safe. */
  ink: string;
  label: string;
}

export const BANDS: Record<ScoreBand, BandStyle> = {
  strong: { fill: '#17794A', track: '#C9E4D5', ink: '#0F5533', label: 'Strong' },
  fair: { fill: '#E0A82E', track: '#F5E3BE', ink: '#7A5605', label: 'Needs work' },
  weak: { fill: '#E0A82E', track: '#F5E3BE', ink: '#7A5605', label: 'Weak' },
  critical: { fill: '#A8191F', track: '#F0CBCC', ink: '#8E151A', label: 'Critical' },
};

export function bandFor(score: number): ScoreBand {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'weak';
  return 'critical';
}

export function bandStyle(score: number): BandStyle {
  return BANDS[bandFor(score)];
}

/**
 * Status steps for the forest (#1B3828) surface — the Core Web Vitals strip.
 *
 * Selected against that surface rather than lightened from the values above.
 * Everything on a dark ground has to be light enough for contrast, which
 * compresses the lightness range and makes green-vs-amber collapse under
 * deuteranopia — the first three candidates I tried scored dE 1.6 to 6.6.
 * These were chosen for lightness spread instead of hue:
 *
 *   CVD separation       PASS  worst adjacent dE 11.1 (deutan), 14.0 (tritan)
 *   Normal-vision floor  PASS  worst adjacent dE 17.6
 *   Contrast vs surface  PASS  all >= 3:1
 *
 * Each is still shipped with a verdict word, never colour alone.
 */
export const DARK_STATUS = {
  good: { fill: '#8FE0A0', word: 'Good' },
  warn: { fill: '#D9A21B', word: 'Needs work' },
  poor: { fill: '#E85D62', word: 'Poor' },
  none: { fill: '#8FA396', word: 'Not measured' },
} as const;

export type DarkStatus = keyof typeof DARK_STATUS;

/**
 * Google's published Core Web Vitals bands. `good` at or below the first
 * threshold, `poor` above the second.
 */
export function vitalStatus(
  value: number | null,
  goodAtOrBelow: number,
  poorAbove: number,
): DarkStatus {
  if (value == null) return 'none';
  if (value <= goodAtOrBelow) return 'good';
  if (value <= poorAbove) return 'warn';
  return 'poor';
}

/**
 * Per-check status, same palette, same never-colour-alone rule.
 *
 * `on` is the glyph colour that sits *inside* the fill. It is not always white:
 * the amber fill is light, and a white icon on it measured 2.14:1 — under the
 * 3:1 a non-text glyph needs. Ink on amber measures 8.73:1.
 */
export const CHECK_STATUS = {
  pass: { fill: '#17794A', on: '#FFFFFF', ink: '#0F5533', word: 'Passing' },
  warn: { fill: '#E0A82E', on: '#141210', ink: '#7A5605', word: 'Needs work' },
  fail: { fill: '#A8191F', on: '#FFFFFF', ink: '#8E151A', word: 'Failing' },
  unknown: { fill: '#8A867C', on: '#141210', ink: '#54514A', word: 'Not measured' },
} as const;
