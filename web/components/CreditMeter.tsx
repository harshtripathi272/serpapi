export function CreditMeter({ credits, mode }: { credits: number; mode?: string }) {
  return (
    <p className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm tabular-nums">
      {credits} SerpApi {credits === 1 ? "search" : "searches"}
      {mode && <span className="text-neutral-500"> · {mode} mode</span>}
    </p>
  );
}
