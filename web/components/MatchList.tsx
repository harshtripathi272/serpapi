import type { Match } from "@/lib/schema";

export function MatchList({ matches }: { matches: Match[] }) {
  return (
    <ol className="grid gap-2">
      {matches.map((m) => (
        <li key={m.link} className="flex gap-3 rounded border border-neutral-200 bg-white p-3">
          {m.thumbnail && (
            <img src={m.thumbnail} alt="" className="h-16 w-16 flex-none rounded object-cover" loading="lazy" />
          )}
          <div className="min-w-0">
            <p className="text-sm tabular-nums text-neutral-500">
              {m.date_text ?? "undated"} · {m.domain}
              {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
            </p>
            <a href={m.link} target="_blank" rel="noreferrer" className="line-clamp-2 font-medium hover:underline">
              {m.title}
            </a>
          </div>
        </li>
      ))}
    </ol>
  );
}
