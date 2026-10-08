"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { CheckEvent, CheckReport } from "@/lib/schema";

// The SerpApi searches behind this result, live or from the cache.
export function HowWeChecked({ events, report }: { events: CheckEvent[]; report: CheckReport }) {
  const [open, setOpen] = useState(false);
  const calls = events.filter((e) => e.kind === "call");
  const source =
    report.credits_used > 0
      ? `${report.credits_used} live`
      : report.mode === "replay"
        ? "replayed from recorded results"
        : "from the cache";

  return (
    <section className="overflow-hidden rounded-3xl bg-card shadow-card">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-fill/60">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-fill text-sub">
          <Search size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">How we checked</span>
          <span className="block text-[13px] text-sub">
            {calls.length} SerpApi {calls.length === 1 ? "search" : "searches"} · {source}
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
          <ChevronDown size={18} className="text-mute" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ol className="grid gap-2.5 px-4 pb-3">
              {calls.map((e) => (
                <li key={e.seq} className="flex items-center gap-2.5 text-[13px]">
                  <Check size={15} strokeWidth={2.75} className="flex-none text-ok" />
                  <span className="flex-1">{e.message}</span>
                  <span className="flex-none rounded-md bg-fill px-1.5 py-0.5 text-[11px] font-semibold text-sub">
                    {e.cached ? "cached" : "live"}
                  </span>
                </li>
              ))}
            </ol>
            <p className="px-4 pb-4 text-[12px] text-mute">
              Searched on {report.searched_on}. Each photo check makes up to 3 searches; a video makes one per scene.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
