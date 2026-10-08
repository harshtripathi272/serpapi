"use client";

import { Check, Loader2, Minus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { CheckEvent } from "@/lib/schema";

type StepId = "copies" | "checks" | "news" | "reply";

const STEPS: { id: StepId; title: string; sub: string }[] = [
  { id: "copies", title: "Finding every copy online", sub: "Google Lens · exact matches" },
  { id: "checks", title: "Looking for earlier fact-checks", sub: "Google Lens · similar images" },
  { id: "news", title: "Checking this week's news", sub: "Google News · past 7 days" },
  { id: "reply", title: "Writing your reply", sub: "English and हिंदी" },
];

function progress(events: CheckEvent[]) {
  const done = new Set<StepId>();
  let news = false;
  let video = false;
  let finished = false;
  for (const e of events) {
    if (e.message.includes("copies found")) done.add("copies");
    if (e.message.startsWith("Google Lens: visually similar")) done.add("checks");
    if (e.message.startsWith("Google News")) {
      done.add("news");
      news = true;
    }
    if (e.message.startsWith("Pulled")) video = true;
    if (e.kind === "done") finished = true;
  }
  if (finished) STEPS.forEach((s) => done.add(s.id));
  return { done, skippedNews: finished && !news, video };
}

// Order-tracking style progress. Steps tick over at a readable pace even when cached results
// arrive at once, then onComplete hands over to the report.
export function Tracking({ events, onComplete }: { events: CheckEvent[]; onComplete: () => void }) {
  const { done, skippedNews, video } = useMemo(() => progress(events), [events]);
  const firstOpen = STEPS.findIndex((s) => !done.has(s.id));
  const reached = firstOpen === -1 ? STEPS.length : firstOpen;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown < reached) {
      const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : 380);
      return () => clearTimeout(t);
    }
    if (shown === STEPS.length) {
      const t = setTimeout(onComplete, 420);
      return () => clearTimeout(t);
    }
  }, [shown, reached, onComplete]);

  const fill = Math.min(shown, STEPS.length - 1) / (STEPS.length - 1);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl bg-card p-5 shadow-card"
    >
      <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-mute">
        {video ? "Checking your video, scene by scene" : "Checking your photo"}
      </p>
      <h1 className="mt-1 text-[1.45rem] font-extrabold leading-tight tracking-tight">Searching the web for earlier copies</h1>

      <ol className="relative mt-6 grid gap-6">
        <span className="absolute bottom-4 left-[15px] top-4 w-0.5 rounded-full bg-line" />
        <motion.span
          className="absolute left-[15px] top-4 w-0.5 origin-top rounded-full bg-ok"
          style={{ height: "calc(100% - 2rem)" }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: fill }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
        {STEPS.map((s, i) => {
          const skipped = s.id === "news" && skippedNews && i < shown;
          const state = i < shown ? (skipped ? "skipped" : "done") : i === shown ? "active" : "pending";
          return (
            <li key={s.id} className="relative flex items-start gap-3.5">
              <span
                className={`relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors duration-300 ${
                  state === "done"
                    ? "bg-ok text-white"
                    : state === "active"
                      ? "bg-brand-soft text-brand ring-2 ring-brand"
                      : "bg-fill text-mute ring-1 ring-line"
                }`}
              >
                {state === "done" && (
                  <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 20 }}>
                    <Check size={16} strokeWidth={3} />
                  </motion.span>
                )}
                {state === "active" && <Loader2 size={16} className="animate-spin" />}
                {state === "skipped" && <Minus size={16} />}
                {state === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-mute" />}
              </span>
              <span className="pt-0.5">
                <span className={`block text-[15px] font-semibold transition-colors ${state === "pending" ? "text-mute" : "text-ink"}`}>
                  {s.title}
                </span>
                <span className="mt-0.5 block text-[13px] text-sub">{skipped ? "Skipped: no claim was given" : s.sub}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-[13px] text-mute">Usually 5 to 15 seconds. Results you&rsquo;ve checked before are instant.</p>
    </motion.section>
  );
}

export function TrackingSkeleton() {
  return (
    <div className="mt-4 grid gap-3" aria-hidden="true">
      <div className="skeleton h-24 rounded-3xl" />
      <div className="skeleton h-40 rounded-3xl" />
    </div>
  );
}
