"use client";

import { AlertTriangle, BarChart3, Copy, Globe, History, Newspaper, Share2, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FactChecks } from "@/components/check/FactChecks";
import { HowWeChecked } from "@/components/check/HowWeChecked";
import { MatchList } from "@/components/check/MatchList";
import { NewsNow } from "@/components/check/NewsNow";
import { PastLives, hasPastLives } from "@/components/check/PastLives";
import { ReplyPanel } from "@/components/check/ReplyPanel";
import { Section } from "@/components/check/Section";
import { SectionTabs } from "@/components/check/SectionTabs";
import { Tracking, TrackingSkeleton } from "@/components/check/Tracking";
import { VerdictHero } from "@/components/check/VerdictHero";
import { VideoFrames } from "@/components/check/VideoFrames";
import { YearExplorer } from "@/components/check/YearExplorer";
import { BottomBar, TopBar } from "@/components/ui/Bars";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { eventsUrl, getReport } from "@/lib/api";
import { CheckEventSchema, type CheckEvent, type CheckReport } from "@/lib/schema";

export default function CheckPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [events, setEvents] = useState<CheckEvent[]>([]);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracked, setTracked] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    // EventSource reconnects on drops and the server replays from the start, so dedupe by seq.
    let received = false;
    const source = new EventSource(eventsUrl(id));
    source.onmessage = (msg) => {
      received = true;
      const event = CheckEventSchema.parse(JSON.parse(msg.data));
      setEvents((prev) => (prev.some((e) => e.seq === event.seq) ? prev : [...prev, event]));
      if (event.kind === "done") {
        source.close();
        getReport(id).then(setReport, () => setError("The result couldn't be loaded. Try the check again."));
      } else if (event.kind === "error") {
        source.close();
        setError(event.message);
      }
    };
    source.onerror = () => {
      if (!received) {
        source.close();
        setError("This check isn't available any more, or the server is offline. Start a new one.");
      }
    };
    return () => source.close();
  }, [id]);

  const onTracked = useCallback(() => setTracked(true), []);
  const ready = Boolean(report && tracked);

  const sections = useMemo(() => {
    if (!report) return [];
    return [
      { id: "overview", label: "Verdict", show: true },
      { id: "lives", label: "Past lives", show: hasPastLives(report) },
      { id: "checks", label: "Fact-checks", show: true },
      { id: "news", label: "News", show: Boolean(report.current_news) },
      { id: "timeline", label: "By year", show: report.years.length > 0 },
      { id: "copies", label: "Copies", show: report.earliest.length > 0 },
    ].filter((s) => s.show);
  }, [report]);

  async function copyReply() {
    if (!report?.reply) return;
    await navigator.clipboard.writeText(report.reply.en);
    toast("Message copied. Paste it in the group.");
  }

  return (
    <>
      <TopBar back />
      <main className="mx-auto max-w-2xl px-4 pb-36 pt-2">
        {error ? (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-card p-6 text-center shadow-card"
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-alert-soft text-alert">
              <AlertTriangle size={22} />
            </span>
            <h1 className="mt-4 text-[1.25rem] font-extrabold tracking-tight">Couldn&rsquo;t check this one</h1>
            <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-sub">{error}</p>
            <Button className="mt-5" onClick={() => router.push("/")}>Try another photo</Button>
          </motion.section>
        ) : (
          <AnimatePresence mode="wait">
            {!ready || !report ? (
              <motion.div key="tracking" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                <Tracking events={events} onComplete={onTracked} />
                <TrackingSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="report"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-[minmax(0,1fr)] gap-6"
              >
                <VerdictHero report={report} />
                <SectionTabs sections={sections} />
                <VideoFrames frames={report.frames} />
                {hasPastLives(report) && (
                  <Section id="lives" icon={History} title="Past lives of this photo">
                    <PastLives report={report} />
                  </Section>
                )}
                <Section
                  id="checks"
                  icon={ShieldCheck}
                  title="Already called out"
                  aside={report.fact_checks.length ? `${report.fact_checks.length} found` : undefined}
                  bare
                >
                  <FactChecks checks={report.fact_checks} />
                </Section>
                {report.current_news && (
                  <Section id="news" icon={Newspaper} title="Is it happening now?">
                    <NewsNow news={report.current_news} />
                  </Section>
                )}
                {report.years.length > 0 && (
                  <Section id="timeline" icon={BarChart3} title="Copies by year" aside={`${report.dated_matches} dated`}>
                    <YearExplorer report={report} />
                  </Section>
                )}
                {report.earliest.length > 0 && (
                  <Section id="copies" icon={Globe} title="Earliest copies" aside={`${report.earliest.length} sites`}>
                    <MatchList matches={report.earliest} />
                  </Section>
                )}
                <HowWeChecked events={events} report={report} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {ready && report?.reply && (
        <BottomBar>
          <Button size="lg" className="flex-1" onClick={() => setSheet(true)}>
            <Share2 size={18} /> Reply to the group
          </Button>
          <Button variant="secondary" size="iconLg" aria-label="Copy the reply" onClick={copyReply}>
            <Copy size={18} />
          </Button>
        </BottomBar>
      )}
      {report && (
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Reply to the group">
          <ReplyPanel report={report} />
        </Sheet>
      )}
    </>
  );
}
