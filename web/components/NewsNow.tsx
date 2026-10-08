import type { CheckReport } from "@/lib/schema";

// Is the claimed event in the news this week? The event can be real while the photo is old.
export function NewsNow({ news }: { news: NonNullable<CheckReport["current_news"]> }) {
  return (
    <section className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold">Is this happening now?</h2>
      {news.articles.length === 0 ? (
        <p className="text-sm text-neutral-600">
          No news from the past week matches &ldquo;{news.query}&rdquo;.
        </p>
      ) : (
        <>
          <p className="text-sm text-neutral-600">
            News from the past week mentions &ldquo;{news.query}&rdquo;. The event may be real, but the photo is older.
          </p>
          <ul className="grid gap-1 text-sm">
            {news.articles.map((a) => (
              <li key={a.link}>
                <a href={a.link} target="_blank" rel="noreferrer" className="hover:underline">
                  {a.title}
                </a>
                <span className="text-neutral-500">
                  {" "}
                  · {a.source}
                  {a.date_text ? ` · ${a.date_text}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
