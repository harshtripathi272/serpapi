"use client";

import { ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { Favicon } from "@/components/ui/Favicon";
import { STATIC } from "@/components/ui/staticMode";
import type { FactCheck } from "@/lib/schema";

function host(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// A swipeable row of fact-checks, like a carousel of offers.
export function FactChecks({ checks }: { checks: FactCheck[] }) {
  if (checks.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-3xl bg-card p-4 shadow-card">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-fill text-sub">
          <ShieldCheck size={19} />
        </span>
        <span>
          <span className="block text-[15px] font-semibold">No fact-checks found yet</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-sub">
            No fact-checking page shows this photo. It may not have been checked yet.
          </span>
        </span>
      </div>
    );
  }
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-2">
      {checks.map((f, i) => (
        <motion.a
          key={f.link}
          href={f.link}
          target="_blank"
          rel="noreferrer"
          initial={STATIC ? false : { opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
          whileTap={{ scale: 0.97 }}
          className="flex w-[16.5rem] flex-none snap-start flex-col rounded-3xl bg-card p-4 shadow-card"
        >
          <span className="flex items-center gap-2">
            <Favicon domain={host(f.link)} size={22} />
            <span className="truncate text-[14px] font-bold">{f.publisher}</span>
          </span>
          <span
            className={`mt-2.5 w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${
              f.found_in === "copies" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"
            }`}
          >
            {f.found_in === "copies" ? "Shows this exact photo" : "Shows a similar photo"}
          </span>
          <span className="mt-2 line-clamp-3 text-[14px] leading-snug">{f.title}</span>
          {f.date_text && <span className="mt-auto pt-3 text-[12px] text-mute">{f.date_text}</span>}
        </motion.a>
      ))}
    </div>
  );
}
