import type { CheckEvent } from "@/lib/schema";

export function ProgressLog({ events }: { events: CheckEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium text-neutral-500">SerpApi calls</h2>
      <ol className="rounded border border-neutral-200 bg-white p-3 font-mono text-xs">
        {events.map((e) => (
          <li key={e.seq} className={e.kind === "error" ? "text-red-700" : undefined}>
            {e.message}
            {e.cached && <span className="text-neutral-400"> (cached)</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
