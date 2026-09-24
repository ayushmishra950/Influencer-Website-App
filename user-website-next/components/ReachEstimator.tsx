'use client';

import { useState } from 'react';

/**
 * A rough planning aid, not a promise.
 *
 * The maths is deliberately visible and the ranges are wide, because a calculator that
 * prints one confident number for a campaign nobody has run yet is theatre. Every
 * output is labelled as an estimate and the assumptions are printed underneath.
 */
const TIERS = [
  { key: 'nano', label: 'Nano', followers: '1K–10K', reach: 4_000, rate: 2_500, note: 'Highest engagement, lowest reach' },
  { key: 'micro', label: 'Micro', followers: '10K–100K', reach: 25_000, rate: 8_000, note: 'The usual sweet spot' },
  { key: 'macro', label: 'Macro', followers: '100K–1M', reach: 140_000, rate: 45_000, note: 'Reach first, engagement second' },
] as const;

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);

const rupees = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;

export function ReachEstimator() {
  const [tier, setTier] = useState<(typeof TIERS)[number]['key']>('micro');
  const [count, setCount] = useState(10);

  const chosen = TIERS.find((t) => t.key === tier)!;
  const reach = chosen.reach * count;
  const budget = chosen.rate * count;

  return (
    <div className="card p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-5">
          <fieldset>
            <legend className="mb-2.5 text-[13px] font-semibold">Creator tier</legend>
            <div className="flex flex-wrap gap-2">
              {TIERS.map((option) => {
                const selected = option.key === tier;
                return (
                  <label
                    key={option.key}
                    className="chip cursor-pointer border px-3.5 py-2 text-[13px]"
                    style={{
                      background: selected ? 'var(--violet-bg)' : 'var(--ink-800)',
                      color: selected ? 'var(--violet-400)' : 'var(--text-2)',
                      borderColor: selected ? 'var(--violet-500)' : 'var(--line)',
                    }}
                  >
                    <input
                      type="radio"
                      name="tier"
                      checked={selected}
                      onChange={() => setTier(option.key)}
                      className="sr-only"
                    />
                    {option.label} · {option.followers}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-[12.5px]" style={{ color: 'var(--text-3)' }}>{chosen.note}</p>
          </fieldset>

          <label className="grid gap-2">
            <span className="text-[13px] font-semibold">
              Creators in the campaign: <span style={{ color: 'var(--violet-400)' }}>{count}</span>
            </span>
            <input
              type="range"
              min={1}
              max={50}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--violet-500)' }}
            />
            <span className="flex justify-between text-[12px]" style={{ color: 'var(--text-3)' }}>
              <span>1</span><span>50</span>
            </span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[300px]">
          <div className="rounded-xl border p-4" style={{ background: 'var(--ink-800)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>Estimated reach</p>
            <p className="mt-1 text-[26px] font-bold" style={{ color: 'var(--violet-400)' }}>
              {compact(Math.round(reach * 0.7))}–{compact(Math.round(reach * 1.3))}
            </p>
          </div>
          <div className="rounded-xl border p-4" style={{ background: 'var(--ink-800)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>Indicative budget</p>
            <p className="mt-1 text-[26px] font-bold">
              {rupees(budget * 0.7)}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>to {rupees(budget * 1.3)}</p>
          </div>
        </div>
      </div>

      <p className="mt-6 border-t pt-4 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
        A planning range, not a quote. It assumes one post per creator at typical Indian
        rates for the tier, ±30%. Real numbers depend on the niche, the city, usage rights
        and what each creator actually charges — which is published on their own profile.
      </p>
    </div>
  );
}
