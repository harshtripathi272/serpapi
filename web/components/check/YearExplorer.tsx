"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { STATIC } from "@/components/ui/staticMode";
import type { CheckReport } from "@/lib/schema";
import { MatchList } from "./MatchList";

// Copies per year as bars you can tap. The selected year's copies show underneath.
export function YearExplorer({ report }: { report: CheckReport }) {
  const firstYear = report.first_seen?.date ? Number(report.first_seen.date.slice(0, 4)) : undefined;
  const counts = new Map(report.years.map((y) => [y.year, y]));
  const start = report.years[0].year;
  const end = report.years[report.years.length - 1].year;
  const all = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const max = Math.max(1, ...report.years.map((y) => y.count));
  const [year, setYear] = useState<number>(firstYear ?? end);
  const bucket = counts.get(year);
  // In the first-seen year, lead with the copy the verdict rests on, not a weakly dated page.
  const first = report.first_seen;
  const examples =
    bucket && first && year === firstYear
      ? [first, ...bucket.examples.filter((m) => m.link !== first.link)]
      : bucket?.examples ?? [];
  const labelEvery = all.length > 12 ? 3 : all.length > 6 ? 2 : 1;

  return (
    <div className="grid gap-4">
      <div className="flex h-36 items-end gap-[3px]" role="group" aria-label="Copies by year">
        {all.map((y, i) => {
          const n = counts.get(y)?.count ?? 0;
          const selected = y === year;
          return (
            <button
              key={y}
              disabled={n === 0}
              onClick={() => setYear(y)}
              aria-pressed={selected}
              aria-label={`${y}: ${n} copies`}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5 disabled:cursor-default"
            >
              <span className={`text-[10px] font-bold tabular-nums transition-opacity ${selected ? "text-ink opacity-100" : "opacity-0"}`}>
                {n}
              </span>
              <motion.span
                className={`w-full rounded-t-md transition-colors duration-200 ${
                  selected ? "bg-brand" : y === firstYear ? "bg-ink/70" : "bg-ink/15 group-hover:bg-ink/30"
                }`}
                initial={STATIC ? false : { height: 0 }}
                {...(STATIC
                  ? { animate: { height: `${n ? Math.max(6, (n / max) * 100) : 2}%` } }
                  : { whileInView: { height: `${n ? Math.max(6, (n / max) * 100) : 2}%` }, viewport: { once: true } })}
                transition={{ type: "spring", stiffness: 160, damping: 20, delay: i * 0.025 }}
              />
              <span className={`text-[10px] tabular-nums ${selected ? "font-bold text-ink" : "text-mute"}`}>
                {(i % labelEvery === 0 || selected) ? `’${String(y).slice(2)}` : ""}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={year}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl bg-fill/70 p-3"
        >
          <div className="flex flex-wrap items-center gap-2 px-1">
            <p className="text-[15px] font-bold">{year}</p>
            <p className="text-[13px] text-sub">
              {bucket?.count ?? 0} {bucket?.count === 1 ? "copy" : "copies"}
              {year === firstYear ? " · first well-attested year" : ""}
            </p>
            {bucket?.tags.map((t) => (
              <span key={t} className="rounded-full bg-card px-2 py-0.5 text-[12px] font-semibold">{t}</span>
            ))}
          </div>
          {examples.length > 0 && (
            <div className="mt-2">
              <MatchList matches={examples} initial={3} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <p className="px-1 text-[12px] text-mute">Tap a year to see what pages said that year.</p>
    </div>
  );
}
