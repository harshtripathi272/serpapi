"use client";

import { toPng } from "html-to-image";
import { Copy, Download, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/ui/Bars";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import type { CheckReport } from "@/lib/schema";
import { verdictView, type Lang } from "@/lib/verdict";

const KICKER = { alert: "text-[#ff8f80]", info: "text-[#8ec5ff]", neutral: "text-[#c2c4ca]" } as const;

export function ReplyPanel({ report }: { report: CheckReport }) {
  const toast = useToast();
  const [lang, setLang] = useState<Lang>("en");
  const [canShare, setCanShare] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const v = verdictView(report, lang);
  const text = report.reply?.[lang] ?? "";
  const max = Math.max(1, ...report.years.map((y) => y.count));
  const firstYear = report.first_seen?.date?.slice(0, 4);

  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  async function png(): Promise<Blob | null> {
    if (!card.current) return null;
    const url = await toPng(card.current, { pixelRatio: 3, cacheBust: true });
    return await (await fetch(url)).blob();
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    toast("Message copied. Paste it in the group.");
  }

  async function save() {
    const blob = await png();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `first-seen-${report.check_id}-${lang}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Image saved");
  }

  async function share() {
    const blob = await png();
    const file = blob ? new File([blob], "first-seen.png", { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ text, files: [file] });
      else await navigator.share({ text });
    } catch {
      // The person closed the share sheet; nothing to do.
    }
  }

  return (
    <div className="grid gap-4">
      <Segmented
        id="reply-lang"
        value={lang}
        onChange={setLang}
        options={[
          { value: "en", label: "English" },
          { value: "hi", label: "हिंदी" },
        ]}
      />

      <div ref={card} className="mx-auto flex aspect-square w-full max-w-[19rem] flex-col justify-between rounded-[22px] bg-ink p-5 text-white">
        <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] text-[#a8aab1]">
          <LogoMark size={18} /> FIRST SEEN
        </p>
        <div>
          <p className={`text-[12px] font-extrabold uppercase tracking-[0.1em] ${KICKER[v.tone]}`}>{v.kicker}</p>
          <p className="mt-1.5 text-[1.55rem] font-extrabold leading-[1.15] tracking-tight">{v.title}</p>
          {report.first_seen && <p className="mt-1.5 text-[13px] text-[#a8aab1]">{report.first_seen.domain}</p>}
        </div>
        <div className="flex h-10 items-end gap-[3px]">
          {report.years.map((y) => (
            <div
              key={y.year}
              className={`flex-1 rounded-t-sm ${String(y.year) === firstYear ? "bg-brand" : "bg-white/25"}`}
              style={{ height: `${Math.max(8, (y.count / max) * 100)}%` }}
            />
          ))}
        </div>
        <p className="text-[11px] text-[#a8aab1]">
          {report.total_matches} copies · {report.domains} websites · Google Lens via SerpApi
        </p>
      </div>

      <p className="rounded-2xl bg-fill p-4 text-[15px] leading-relaxed">{text}</p>

      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" className="col-span-2" onClick={copy}>
          <Copy size={18} /> Copy message
        </Button>
        {canShare && (
          <Button variant="secondary" onClick={share}>
            <Share2 size={16} /> Share
          </Button>
        )}
        <Button variant="secondary" onClick={save} className={canShare ? "" : "col-span-2"}>
          <Download size={16} /> Save image
        </Button>
      </div>
    </div>
  );
}
