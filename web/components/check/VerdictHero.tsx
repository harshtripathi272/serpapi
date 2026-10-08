"use client";

import { ArrowUpRight, ChevronDown, Forward, Info, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { Favicon } from "@/components/ui/Favicon";
import type { CheckReport } from "@/lib/schema";
import { TONE, longDate, monthYear, verdictView } from "@/lib/verdict";

const ICON = { alert: ShieldAlert, info: ShieldCheck, neutral: ShieldQuestion } as const;

export function VerdictHero({ report }: { report: CheckReport }) {
  const v = verdictView(report);
  const tone = TONE[v.tone];
  const Icon = ICON[v.tone];
  const first = report.first_seen;
  const outlier = report.earliest_uncorroborated;
  const [open, setOpen] = useState(false);

  return (
    <motion.section
      id="overview"
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl bg-card shadow-card"
    >
      <div className={`px-5 pb-5 pt-4 ${tone.band}`}>
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] ${tone.text}`}>
          <Icon size={14} strokeWidth={2.5} /> {v.kicker}
        </span>
        <h1 className="mt-3 text-[1.85rem] font-extrabold leading-[1.1] tracking-[-0.02em]">{v.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-sub">{v.sub}</p>
      </div>

      {report.claim && (
        <div className="px-5 pt-4">
          <div className="relative ml-1 max-w-[92%] rounded-2xl rounded-tl-sm bg-chat px-3.5 py-2.5 shadow-[0_1px_1px_rgb(0_0_0/0.06)]">
            <p className="flex items-center gap-1 text-[11px] font-medium italic text-[#5b7a52]">
              <Forward size={12} /> Forwarded
            </p>
            <p className="mt-0.5 text-[14px] leading-snug">{report.claim}</p>
          </div>
        </div>
      )}

      {first?.date && (
        <a
          href={first.link}
          target="_blank"
          rel="noreferrer"
          className="mx-5 mt-4 flex items-center gap-3 rounded-2xl bg-fill p-3 transition-colors hover:bg-line active:scale-[0.99]"
        >
          <Favicon domain={first.domain} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium text-sub">Earliest well-attested copy</span>
            <span className="block truncate text-[14px] font-semibold">
              {first.domain} · {longDate(first.date)}
            </span>
          </span>
          <ArrowUpRight size={18} className="flex-none text-mute" />
        </a>
      )}

      <dl className="mx-2 mt-4 grid grid-cols-3 divide-x divide-line">
        {[
          { label: "copies found", value: report.total_matches },
          { label: "websites", value: report.domains },
          { label: report.fact_checks.length === 1 ? "fact-check" : "fact-checks", value: report.fact_checks.length },
        ].map((s) => (
          <div key={s.label} className="px-3 text-center">
            <dd className="text-[1.6rem] font-extrabold leading-none tracking-tight">
              <CountUp value={s.value} />
            </dd>
            <dt className="mt-1.5 text-[12px] font-medium text-sub">{s.label}</dt>
          </div>
        ))}
      </dl>

      {outlier?.date && (
        <p className="mx-5 mt-4 flex gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-[13px] leading-snug text-warn">
          <Info size={16} className="mt-0.5 flex-none" />
          Some pages are dated earlier ({monthYear(outlier.date)}, {outlier.domain}), but too few sites agree to rely on
          that date.
        </p>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 flex w-full items-center justify-between border-t border-line px-5 py-3.5 text-[14px] font-semibold text-sub transition-colors hover:bg-fill"
        aria-expanded={open}
      >
        Why we say this
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden px-5 text-[14px] leading-relaxed text-sub"
          >
            <span className="block pb-5">{report.verdict.detail}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
