"use client";

import { MapPin, Wind } from "lucide-react";
import { motion } from "motion/react";
import { STATIC } from "@/components/ui/staticMode";
import type { CheckReport } from "@/lib/schema";

function span(first: number, last: number): string {
  return first === last ? String(first) : `${first} – ${last}`;
}

export function hasPastLives(r: CheckReport): boolean {
  return r.contexts.some((c) => c.kind !== "event") || r.falsely_shared_as.length > 0;
}

// The storms and places copies of this photo were attached to, in the order they first appeared.
export function PastLives({ report }: { report: CheckReport }) {
  const lives = report.contexts.filter((c) => c.kind !== "event");
  const events = report.contexts.filter((c) => c.kind === "event");
  const scripts = report.scripts.filter((s) => s.name !== "Latin");

  return (
    <div className="grid gap-4">
      {lives.length > 0 && (
        <ol className="relative grid gap-4 pl-7">
          <span className="absolute bottom-2 left-[9px] top-2 w-px bg-line" />
          {lives.map((c, i) => (
            <motion.li
              key={c.label}
              initial={STATIC ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
              className="relative"
            >
              <span className="absolute -left-7 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-card text-sub ring-1 ring-line">
                {c.kind === "storm" ? <Wind size={11} /> : <MapPin size={11} />}
              </span>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-semibold">{c.label}</p>
                <span className="flex-none text-[12px] font-medium tabular-nums text-mute">
                  {c.count} {c.count === 1 ? "copy" : "copies"}
                </span>
              </div>
              <p className="text-[13px] tabular-nums text-sub">{span(c.first_year, c.last_year)}</p>
            </motion.li>
          ))}
        </ol>
      )}

      {report.falsely_shared_as.length > 0 && (
        <div className="rounded-2xl bg-alert-soft p-3.5">
          <p className="text-[13px] font-semibold text-alert">Fact-checks say it was passed off as</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {report.falsely_shared_as.map((p) => (
              <span key={p} className="rounded-full bg-card px-3 py-1 text-[13px] font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.06)]">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {(events.length > 0 || scripts.length > 0) && (
        <p className="text-[13px] leading-relaxed text-sub">
          {events.length > 0 && <>Described as {events.map((e) => e.label.toLowerCase()).join(", ")}. </>}
          {scripts.length > 0 && <>Titles also appear in {scripts.map((s) => s.name).join(", ")}.</>}
        </p>
      )}
    </div>
  );
}
