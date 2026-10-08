import { Film } from "lucide-react";
import type { CheckReport } from "@/lib/schema";
import { monthYear } from "@/lib/verdict";

function clock(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// A video is checked one scene at a time. Each scene can come from a different old photo or clip.
export function VideoFrames({ frames }: { frames: CheckReport["frames"] }) {
  if (frames.length === 0) return null;
  return (
    <section className="rounded-3xl bg-card p-4 shadow-card">
      <p className="flex items-center gap-2 text-[15px] font-bold">
        <Film size={17} className="text-sub" /> Checked {frames.length} {frames.length === 1 ? "scene" : "scenes"} from the video
      </p>
      <ol className="mt-3 grid gap-2">
        {frames.map((f) => (
          <li key={f.time_s} className="flex items-center gap-3 rounded-2xl bg-fill/70 p-3">
            <span className="flex h-10 w-12 flex-none items-center justify-center rounded-xl bg-ink text-[13px] font-bold tabular-nums text-white">
              {clock(f.time_s)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">
                {f.first_seen ? `Online since at least ${monthYear(f.first_seen)}` : "No dated copies found"}
              </span>
              <span className="block truncate text-[12px] text-sub">
                {f.copies} copies · {f.scene_seconds}s scene{f.first_seen_domain ? ` · ${f.first_seen_domain}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
