"use client";

import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import type { CheckReport } from "@/lib/schema";

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HI_MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

function headline(report: CheckReport, lang: "en" | "hi"): { kicker: string; title: string } {
  const date = report.first_seen?.date;
  if (report.verdict.label === "no_history" || !date) {
    return lang === "en"
      ? { kicker: "Checked", title: "No earlier copies found" }
      : { kicker: "जाँचा गया", title: "कोई पुरानी कॉपी नहीं मिली" };
  }
  const [y, m] = date.split("-").map(Number);
  const old = report.verdict.label === "older_than_claimed";
  return lang === "en"
    ? { kicker: old ? "Not new" : "First seen", title: `Online since at least ${EN_MONTHS[m - 1]} ${y}` }
    : { kicker: old ? "नई नहीं है" : "पहली बार दिखी", title: `कम से कम ${HI_MONTHS[m - 1]} ${y} से ऑनलाइन` };
}

export function ReplyCard({ report }: { report: CheckReport }) {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [copied, setCopied] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  if (!report.reply) return null;

  const text = report.reply[lang];
  const { kicker, title } = headline(report, lang);
  const old = report.verdict.label === "older_than_claimed";
  const max = Math.max(1, ...report.years.map((y) => y.count));

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function download() {
    if (!card.current) return;
    const url = await toPng(card.current, { pixelRatio: 3, cacheBust: true });
    const a = document.createElement("a");
    a.href = url;
    a.download = `first-seen-${report.check_id}-${lang}.png`;
    a.click();
  }

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Reply to the group it came from</h2>
        <div className="flex rounded-full border border-neutral-300 bg-white p-0.5 text-sm">
          {(["en", "hi"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-full px-3 py-1 ${lang === l ? "bg-neutral-900 text-white" : "text-neutral-600"}`}
            >
              {l === "en" ? "English" : "हिंदी"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
        <div ref={card} className="flex aspect-square flex-col justify-between rounded-xl bg-neutral-950 p-6 text-white">
          <p className="text-xs font-medium tracking-[0.25em] text-neutral-400">FIRST SEEN</p>
          <div>
            <p className={`text-sm font-semibold uppercase tracking-wide ${old ? "text-red-400" : "text-sky-300"}`}>{kicker}</p>
            <p className="mt-1 text-[1.7rem] font-semibold leading-tight">{title}</p>
            {report.first_seen && <p className="mt-2 text-sm text-neutral-400">{report.first_seen.domain}</p>}
          </div>
          <div className="flex h-12 items-end gap-0.5">
            {report.years.map((y) => (
              <div
                key={y.year}
                className={`flex-1 rounded-t ${String(y.year) === report.first_seen?.date?.slice(0, 4) ? "bg-red-500" : "bg-neutral-600"}`}
                style={{ height: `${Math.max(6, (y.count / max) * 100)}%` }}
              />
            ))}
          </div>
          <p className="text-xs text-neutral-400">
            {report.total_matches} copies · {report.domains} websites · Google Lens via SerpApi
          </p>
        </div>

        <div className="grid content-start gap-3">
          <p className="rounded-lg border border-neutral-200 bg-white p-4 text-[15px] leading-relaxed">{text}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
              {copied ? "Copied" : "Copy message"}
            </button>
            <button onClick={download} className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium">
              Download image
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
