/**
 * Field Core Web Vitals, from the site's own visitors.
 *
 * The 75th percentile of LCP, INP and CLS per landing page and device class
 * over the last 28 days, which is how Google assesses Core Web Vitals
 * (https://web.dev/articles/vitals). The data comes from the `web_vital`
 * events src/lib/tracker.ts sends; the percentile is computed in Postgres by
 * GET /api/admin/vitals.
 *
 * This is the site's own field data, not CrUX. Search Console's Core Web
 * Vitals report is the one Google uses, and it fills in only once the site has
 * enough Chrome traffic. Until then this is the closest thing to it, and every
 * figure sits beside its sample size because a percentile over a handful of
 * page loads is noise.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
// Same entry the tracker imports, so the bundle carries one copy of web-vitals.
import { CLSThresholds, INPThresholds, LCPThresholds } from 'web-vitals/attribution';
import { Banner, Card, Eyebrow, Heading } from '../portal/ui';
import { CHECK_STATUS } from '../components/audit/palette';

type MetricName = 'LCP' | 'INP' | 'CLS';

interface VitalRow {
  metric: MetricName;
  landing: string;
  device: string;
  p75: number;
  samples: number;
}

interface VitalsResponse {
  windowDays: number;
  rows: VitalRow[];
}

/** Google's published good / needs-improvement bounds, from web-vitals itself. */
const THRESHOLDS: Record<MetricName, readonly [number, number]> = {
  LCP: LCPThresholds,
  INP: INPThresholds,
  CLS: CLSThresholds,
};

const METRICS: { name: MetricName; label: string }[] = [
  { name: 'LCP', label: 'LCP (load)' },
  { name: 'INP', label: 'INP (response)' },
  { name: 'CLS', label: 'CLS (stability)' },
];

/** Verdict word plus the audit report's text-safe status ink; never colour alone. */
function verdict(metric: MetricName, value: number): { word: string; ink: string } {
  const [good, poor] = THRESHOLDS[metric];
  if (value <= good) return { word: 'Good', ink: CHECK_STATUS.pass.ink };
  if (value <= poor) return { word: 'Needs improvement', ink: CHECK_STATUS.warn.ink };
  return { word: 'Poor', ink: CHECK_STATUS.fail.ink };
}

function format(metric: MetricName, value: number): string {
  if (metric === 'CLS') return value.toFixed(2);
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

export default function VitalsPanel() {
  const [data, setData] = useState<VitalsResponse | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setData(null);
    try {
      const res = await fetch('/api/admin/vitals', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as VitalsResponse);
      setError('');
    } catch {
      setError('Could not load Core Web Vitals.');
      setData({ windowDays: 28, rows: [] });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // One table row per landing page and device class, one column per metric.
  const groups = useMemo(() => {
    const byKey = new Map<string, { landing: string; device: string; metrics: Partial<Record<MetricName, VitalRow>> }>();
    for (const row of data?.rows ?? []) {
      const key = `${row.landing}\u0000${row.device}`;
      const group = byKey.get(key) ?? { landing: row.landing, device: row.device, metrics: {} };
      group.metrics[row.metric] = row;
      byKey.set(key, group);
    }
    return [...byKey.values()];
  }, [data]);

  return (
    <div>
      <Eyebrow>Page experience</Eyebrow>
      <Heading level={2}>Core Web Vitals from real visits</Heading>
      <p className="mt-3 max-w-3xl text-sm text-stone leading-relaxed">
        75th percentile per landing page and device over the last {data?.windowDays ?? 28} days,
        with the number of page loads behind each figure (n). Good means at or under Google&apos;s
        threshold: LCP {format('LCP', LCPThresholds[0])}, INP {format('INP', INPThresholds[0])}, CLS{' '}
        {CLSThresholds[0]}. This is the site&apos;s own data, not the Chrome UX Report that Search
        Console shows; read n before reading the number.
      </p>

      <div className="mt-6">{error && <Banner tone="error">{error}</Banner>}</div>

      {data === null ? (
        <p className="font-mono text-[11px] text-stone">Loading…</p>
      ) : groups.length === 0 ? (
        <Card>
          <p className="text-sm text-stone">
            No web vitals recorded in this window yet. They arrive as visitors load pages on the
            live site.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-1.5 border-ink/15">
                <th scope="col" className="py-2 pr-4 font-mono text-[10px] uppercase tracking-wider text-stone">
                  Landing page
                </th>
                <th scope="col" className="py-2 pr-4 font-mono text-[10px] uppercase tracking-wider text-stone">
                  Device
                </th>
                {METRICS.map((m) => (
                  <th
                    key={m.name}
                    scope="col"
                    className="py-2 pr-4 font-mono text-[10px] uppercase tracking-wider text-stone"
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={`${g.landing}-${g.device}`} className="border-b-1.5 border-ink/10 last:border-b-0 align-top">
                  <td className="py-3 pr-4 font-mono text-[12px] text-ink break-all">{g.landing}</td>
                  <td className="py-3 pr-4 text-ink">{g.device}</td>
                  {METRICS.map((m) => {
                    const row = g.metrics[m.name];
                    if (!row) {
                      return (
                        <td key={m.name} className="py-3 pr-4 text-stone">
                          —
                        </td>
                      );
                    }
                    const v = verdict(m.name, row.p75);
                    return (
                      <td key={m.name} className="py-3 pr-4">
                        <span className="block font-bold text-ink tabular-nums">{format(m.name, row.p75)}</span>
                        <span className="block text-[12px] font-bold" style={{ color: v.ink }}>
                          {v.word}
                        </span>
                        <span className="block font-mono text-[11px] text-stone">n = {row.samples}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
