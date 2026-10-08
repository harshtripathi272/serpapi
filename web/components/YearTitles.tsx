import type { YearBucket } from "@/lib/schema";

// What pages said the photo showed, year by year. Recycled photos get new captions each time.
export function YearTitles({ years }: { years: YearBucket[] }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">What it was said to show</h2>
      <ol className="grid gap-3">
        {years.map((y) => (
          <li key={y.year} className="grid grid-cols-[3.5rem_1fr] gap-3">
            <span className="font-semibold tabular-nums">{y.year}</span>
            <ul className="grid gap-1 text-sm">
              {y.examples.map((m) => (
                <li key={m.link} className="truncate">
                  <a href={m.link} target="_blank" rel="noreferrer" className="hover:underline">
                    {m.title}
                  </a>
                  <span className="text-neutral-500"> · {m.domain}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
