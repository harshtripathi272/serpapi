import type { CheckReport } from "@/lib/schema";

function span(first: number, last: number): string {
  return first === last ? String(first) : `${first}–${last}`;
}

// The storms and places copies of this photo were attached to, in the order they first appeared.
export function PastLives({ report }: { report: CheckReport }) {
  const lives = report.contexts.filter((c) => c.kind !== "event");
  const events = report.contexts.filter((c) => c.kind === "event");
  const scripts = report.scripts.filter((s) => s.name !== "Latin");
  if (lives.length === 0 && report.falsely_shared_as.length === 0) return null;

  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-semibold">Past lives of this photo</h2>
      {lives.length > 0 && (
        <ol className="grid gap-2 border-l-2 border-neutral-300 pl-4">
          {lives.map((c) => (
            <li key={c.label} className="relative">
              <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-neutral-700" />
              <span className="w-24 font-semibold tabular-nums">{span(c.first_year, c.last_year)}</span>
              <span className="ml-3 font-medium">{c.label}</span>
              <span className="ml-2 text-sm text-neutral-500">
                {c.count} {c.count === 1 ? "copy" : "copies"}
              </span>
            </li>
          ))}
        </ol>
      )}
      {report.falsely_shared_as.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-600">Fact-checks say it was passed off as</span>
          {report.falsely_shared_as.map((p) => (
            <span key={p} className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-900">
              {p}
            </span>
          ))}
        </div>
      )}
      {(events.length > 0 || scripts.length > 0) && (
        <p className="text-sm text-neutral-600">
          {events.length > 0 && <>Described as: {events.map((e) => e.label.toLowerCase()).join(", ")}. </>}
          {scripts.length > 0 && <>Titles also in {scripts.map((s) => s.name).join(", ")}.</>}
        </p>
      )}
    </section>
  );
}
