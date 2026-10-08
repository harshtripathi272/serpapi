import type { FactCheck } from "@/lib/schema";

export function FactChecks({ checks }: { checks: FactCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">Already called out</h2>
      <ul className="grid gap-2">
        {checks.map((f) => (
          <li key={f.link} className="rounded border border-neutral-200 bg-white p-3">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{f.publisher}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  f.found_in === "copies" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
                }`}
              >
                {f.found_in === "copies" ? "shows this exact photo" : "shows a similar photo"}
              </span>
              {f.date_text && <span className="text-neutral-500">{f.date_text}</span>}
            </p>
            <a href={f.link} target="_blank" rel="noreferrer" className="mt-1 line-clamp-2 block hover:underline">
              {f.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
