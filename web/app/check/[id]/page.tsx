"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CreditMeter } from "@/components/CreditMeter";
import { MatchList } from "@/components/MatchList";
import { ProgressLog } from "@/components/ProgressLog";
import { VerdictCard } from "@/components/VerdictCard";
import { YearChart } from "@/components/YearChart";
import { YearTitles } from "@/components/YearTitles";
import { eventsUrl, getReport } from "@/lib/api";
import { CheckEventSchema, type CheckEvent, type CheckReport } from "@/lib/schema";

export default function CheckPage() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<CheckEvent[]>([]);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // EventSource reconnects on drops and the server replays from the start, so dedupe by seq.
    const source = new EventSource(eventsUrl(id));
    source.onmessage = (msg) => {
      const event = CheckEventSchema.parse(JSON.parse(msg.data));
      setEvents((prev) => (prev.some((e) => e.seq === event.seq) ? prev : [...prev, event]));
      if (event.kind === "done") {
        source.close();
        getReport(id).then(setReport, (e: unknown) => setError(String(e)));
      } else if (event.kind === "error") {
        source.close();
        setError(event.message);
      }
    };
    return () => source.close();
  }, [id]);

  const credits = events.at(-1)?.credits_used ?? 0;

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-lg font-semibold">
          First Seen
        </Link>
        <CreditMeter credits={credits} mode={report?.mode} />
      </header>

      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
      {!report && !error && <p className="text-neutral-600">Searching for earlier copies of this photo…</p>}

      {report && (
        <>
          <VerdictCard report={report} />
          {report.years.length > 0 && <YearChart years={report.years} firstYear={report.first_seen?.date?.slice(0, 4)} />}
          {report.earliest.length > 0 && (
            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">Earliest copies</h2>
              <MatchList matches={report.earliest} />
            </section>
          )}
          {report.years.length > 1 && <YearTitles years={report.years} />}
        </>
      )}

      <ProgressLog events={events} />
    </main>
  );
}
