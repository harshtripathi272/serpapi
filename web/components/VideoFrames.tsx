import type { CheckReport } from "@/lib/schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function clock(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// A video is checked one keyframe per scene. Each scene can come from a different old photo or clip.
export function VideoFrames({ frames }: { frames: CheckReport["frames"] }) {
  if (frames.length === 0) return null;
  return (
    <section className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold">Checked {frames.length} scenes from the video</h2>
      <ul className="grid gap-1 text-sm">
        {frames.map((f) => {
          const [y, m] = (f.first_seen ?? "").split("-").map(Number);
          return (
            <li key={f.time_s} className="flex flex-wrap gap-x-3">
              <span className="w-12 font-semibold tabular-nums">{clock(f.time_s)}</span>
              <span className="text-neutral-600">{f.scene_seconds}s scene</span>
              <span>{f.copies} copies online</span>
              {f.first_seen ? (
                <span className="font-medium">
                  since at least {MONTHS[m - 1]} {y} ({f.first_seen_domain})
                </span>
              ) : (
                <span className="text-neutral-500">no dated copies</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
