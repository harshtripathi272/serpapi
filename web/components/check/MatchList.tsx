"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Favicon } from "@/components/ui/Favicon";
import type { Match } from "@/lib/schema";
import { shortDate } from "@/lib/verdict";

function Row({ m }: { m: Match }) {
  return (
    <a href={m.link} target="_blank" rel="noreferrer"
      className="flex gap-3 rounded-2xl p-2 transition-colors hover:bg-fill active:bg-fill">
      <span className="skeleton h-14 w-14 flex-none overflow-hidden rounded-xl">
        {m.thumbnail && <img src={m.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[14px] font-medium leading-snug">{m.title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[12px] text-mute">
          <Favicon domain={m.domain} size={14} />
          <span className="truncate">{m.domain}</span>
          {m.date && (
            <span className="flex-none rounded-md bg-fill px-1.5 py-0.5 font-semibold tabular-nums text-sub">{shortDate(m.date)}</span>
          )}
        </span>
      </span>
    </a>
  );
}

// The first few rows, then the rest on demand, growing smoothly.
export function MatchList({ matches, initial = 5 }: { matches: Match[]; initial?: number }) {
  const [all, setAll] = useState(false);
  const head = matches.slice(0, initial);
  const rest = matches.slice(initial);
  return (
    <div className="-m-2">
      {head.map((m) => <Row key={m.link} m={m} />)}
      <AnimatePresence initial={false}>
        {all && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {rest.map((m) => <Row key={m.link} m={m} />)}
          </motion.div>
        )}
      </AnimatePresence>
      {rest.length > 0 && (
        <button
          onClick={() => setAll((a) => !a)}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[14px] font-semibold text-brand transition-colors hover:bg-brand-soft active:scale-[0.99]"
        >
          {all ? "Show fewer" : `Show ${rest.length} more`}
          <motion.span animate={{ rotate: all ? 180 : 0 }}><ChevronDown size={16} /></motion.span>
        </button>
      )}
    </div>
  );
}
