import type { CheckReport } from "@/lib/schema";

const STYLES = {
  older_than_claimed: "border-red-300 bg-red-50 text-red-950",
  first_seen: "border-sky-300 bg-sky-50 text-sky-950",
  no_history: "border-neutral-300 bg-white text-neutral-900",
} as const;

export function VerdictCard({ report }: { report: CheckReport }) {
  const { verdict } = report;
  const stats = [
    { label: "copies found", value: report.total_matches },
    { label: "with a date", value: report.dated_matches },
    { label: "websites", value: report.domains },
    { label: "years active", value: report.years.length },
  ];
  return (
    <section className={`grid gap-4 rounded-lg border p-6 ${STYLES[verdict.label]}`}>
      {report.claim && <p className="text-sm opacity-70">Claim: &ldquo;{report.claim}&rdquo;</p>}
      <h1 className="text-3xl font-semibold tracking-tight">{verdict.headline}</h1>
      <p className="max-w-2xl">{verdict.detail}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dd className="text-2xl font-semibold tabular-nums">{s.value.toLocaleString()}</dd>
            <dt className="text-sm opacity-70">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
