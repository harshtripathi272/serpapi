import { Newspaper, SearchX } from "lucide-react";
import { Favicon } from "@/components/ui/Favicon";
import type { CheckReport } from "@/lib/schema";

function host(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Is the claimed event in this week's news? The event can be real while the photo is old.
export function NewsNow({ news }: { news: NonNullable<CheckReport["current_news"]> }) {
  if (news.articles.length === 0) {
    return (
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-fill text-sub">
          <SearchX size={19} />
        </span>
        <span>
          <span className="block text-[15px] font-semibold">Nothing in this week&rsquo;s news</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-sub">
            No article from the past 7 days matches &ldquo;{news.query}&rdquo;.
          </span>
        </span>
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-info-soft text-info">
          <Newspaper size={19} />
        </span>
        <span className="text-[14px] leading-relaxed text-sub">
          This week&rsquo;s news does mention &ldquo;{news.query}&rdquo;. The event may be real, but this photo is older.
        </span>
      </div>
      <ul className="grid gap-1">
        {news.articles.map((a) => (
          <li key={a.link}>
            <a href={a.link} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-fill active:bg-fill">
              <Favicon domain={host(a.link)} size={20} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-[14px] font-medium">{a.title}</span>
                <span className="text-[12px] text-mute">
                  {a.source}
                  {a.date_text ? ` · ${a.date_text}` : ""}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
