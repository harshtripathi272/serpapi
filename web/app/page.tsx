"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { getExamples, startCheck } from "@/lib/api";
import type { Example } from "@/lib/schema";

export default function Home() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [claim, setClaim] = useState("");
  const [examples, setExamples] = useState<Example[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getExamples().then(setExamples, () => setExamples([]));
    // Deep link, used by the browser extension: /?image_url=...&claim=... starts a check right away.
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("image_url");
    if (linked) {
      setImageUrl(linked);
      setClaim(params.get("claim") ?? "");
      run({ imageUrl: linked, claim: params.get("claim") ?? undefined });
    }
  }, []);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function run(input: { file?: File | null; imageUrl?: string; claim?: string }) {
    setBusy(true);
    setError(null);
    try {
      router.push(`/check/${await startCheck(input)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file && !imageUrl.trim()) return setError("Add a photo or paste an image link.");
    run({ file, imageUrl: file ? undefined : imageUrl.trim(), claim: claim.trim() });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-4xl font-semibold tracking-tight">First Seen</h1>
      <p className="mt-3 text-lg text-neutral-600">
        Got a forwarded photo or video? See where it appeared online before, and when.
      </p>

      <form onSubmit={onSubmit} className="mt-10 grid gap-5">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="grid cursor-pointer place-items-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-white p-6 text-center hover:border-neutral-500"
        >
          {preview ? (
            file?.type.startsWith("video/") ? (
              <video src={preview} className="max-h-56 rounded" muted autoPlay loop playsInline />
            ) : (
              <img src={preview} alt="Selected photo" className="max-h-56 rounded" />
            )
          ) : (
            <span className="text-neutral-600">Drop the photo or video here, or click to choose one</span>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && <span className="text-sm text-neutral-500">{file.name}</span>}
        </label>

        {!file && (
          <label className="grid gap-1 text-sm">
            Or paste an image link
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…/photo.jpg"
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        )}

        <label className="grid gap-1 text-sm">
          What does the message say this photo shows? (optional)
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            rows={2}
            placeholder="e.g. Shark on the highway in today's Chennai floods"
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <button disabled={busy} className="rounded bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50">
          {busy ? "Checking…" : "Check this photo"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>

      {examples.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-neutral-500">Try a known viral photo</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex.id}
                disabled={busy}
                onClick={() => run({ imageUrl: ex.image_url, claim: ex.claim })}
                className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:border-neutral-500 disabled:opacity-50"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
