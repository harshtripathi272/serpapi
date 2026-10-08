import type { YearBucket } from "@/lib/schema";

// One bar per calendar year from the first copy to the last, empty years included.
export function YearChart({ years, firstYear }: { years: YearBucket[]; firstYear?: string }) {
  const counts = new Map(years.map((y) => [y.year, y.count]));
  const start = years[0].year;
  const end = years[years.length - 1].year;
  const all = Array.from({ length: end - start + 1 }, (_, i) => ({ year: start + i, count: counts.get(start + i) ?? 0 }));
  const max = Math.max(1, ...all.map((y) => y.count));

  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">Copies by year</h2>
      <div className="flex h-40 items-end gap-1 rounded border border-neutral-200 bg-white p-3">
        {all.map((y) => (
          <div key={y.year} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-neutral-500">{y.count || ""}</span>
            <div
              title={`${y.year}: ${y.count}`}
              className={String(y.year) === firstYear ? "w-full rounded-t bg-red-600" : "w-full rounded-t bg-neutral-700"}
              style={{ height: `${(y.count / max) * 100}%`, minHeight: y.count ? 2 : 0 }}
            />
            <span className="text-[10px] tabular-nums text-neutral-500">{String(y.year).slice(2)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
