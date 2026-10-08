"use client";

import { ClipboardPaste, Forward, ImageUp, Link2, Loader2, Search, Share2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type DragEvent } from "react";
import { BottomBar, TopBar } from "@/components/ui/Bars";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { getExamples, startCheck } from "@/lib/api";
import type { Example } from "@/lib/schema";

const EASE = [0.22, 1, 0.36, 1] as const;

function formatSize(bytes: number): string {
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}

export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [claim, setClaim] = useState("");
  const [examples, setExamples] = useState<Example[]>([]);
  const [busy, setBusy] = useState(false);

  async function run(input: { file?: File | null; imageUrl?: string; claim?: string }) {
    setBusy(true);
    try {
      router.push(`/check/${await startCheck(input)}`);
    } catch (err) {
      toast(err instanceof Error && err.message.includes("Failed to fetch")
        ? "Can't reach the First Seen server. Is the backend running?"
        : "Couldn't start the check. Try again.");
      setBusy(false);
    }
  }

  useEffect(() => {
    getExamples().then(setExamples, () => setExamples([]));
    // Deep link, used by the browser extension: /?image_url=...&claim=... starts a check right away.
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("image_url");
    if (linked) {
      setMode("link");
      setImageUrl(linked);
      setClaim(params.get("claim") ?? "");
      run({ imageUrl: linked, claim: params.get("claim") ?? undefined });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const ready = mode === "upload" ? Boolean(file) : /^https?:\/\/\S+/.test(imageUrl.trim());
  const isVideo = file?.type.startsWith("video/");

  function submit() {
    if (!ready || busy) return;
    run(mode === "upload" ? { file, claim: claim.trim() } : { imageUrl: imageUrl.trim(), claim: claim.trim() });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function pasteLink() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (/^https?:\/\//.test(text)) setImageUrl(text);
      else toast("No link on the clipboard");
    } catch {
      toast("Allow clipboard access, or paste with Ctrl+V");
    }
  }

  return (
    <>
      <TopBar narrow />
      <main className="mx-auto max-w-xl px-4 pb-40 pt-3">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-[2.15rem] font-extrabold leading-[1.06] tracking-[-0.025em]"
        >
          Before you forward it, see where it&rsquo;s been.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.06 }}
          className="mt-3 text-[15px] leading-relaxed text-sub"
        >
          Add a photo or video from a forward. First Seen finds every earlier copy on the web and tells you when
          it first appeared.
        </motion.p>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.12 }}
          className="mt-6 grid gap-4 rounded-3xl bg-card p-4 shadow-card"
        >
          <Segmented
            id="input"
            value={mode}
            onChange={setMode}
            options={[
              { value: "upload", label: <><ImageUp size={16} /> Photo or video</> },
              { value: "link", label: <><Link2 size={16} /> Paste a link</> },
            ]}
          />

          <AnimatePresence mode="wait" initial={false}>
            {mode === "upload" ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                {file && preview ? (
                  <div className="relative overflow-hidden rounded-2xl bg-fill">
                    {isVideo ? (
                      <video src={preview} className="max-h-72 w-full object-contain" muted autoPlay loop playsInline />
                    ) : (
                      <img src={preview} alt="Selected" className="max-h-72 w-full object-contain" />
                    )}
                    <div className="flex items-center justify-between gap-3 bg-card/95 px-3 py-2.5 text-[13px]">
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="flex-none text-mute">{formatSize(file.size)}</span>
                    </div>
                    <button
                      aria-label="Remove"
                      onClick={() => setFile(null)}
                      className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur transition active:scale-90"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 text-center transition-colors duration-200 ${
                      dragging ? "border-brand bg-brand-soft" : "border-line bg-fill/60 hover:border-mute"
                    }`}
                  >
                    <motion.span
                      animate={dragging ? { scale: 1.08, y: -2 } : { scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-brand shadow-card"
                    >
                      <ImageUp size={22} />
                    </motion.span>
                    <span>
                      <span className="block text-[15px] font-semibold">Drop the forwarded photo or video</span>
                      <span className="mt-0.5 block text-[13px] text-sub">or tap to choose · JPG, PNG, WebP, MP4</span>
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                      className="sr-only"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="link"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="flex items-center gap-2 rounded-2xl bg-fill px-3 py-2 ring-1 ring-transparent transition focus-within:bg-card focus-within:ring-brand"
              >
                <Link2 size={18} className="flex-none text-mute" />
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  inputMode="url"
                  placeholder="https://… link to the image"
                  className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute"
                />
                <Button variant="secondary" size="sm" onClick={pasteLink}>
                  <ClipboardPaste size={15} /> Paste
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <label className="grid gap-1.5">
            <span className="flex items-center gap-2 px-1 text-[13px] font-semibold">
              What does the message say?
              <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] font-semibold text-mute">optional</span>
            </span>
            <textarea
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              rows={2}
              placeholder="e.g. Ahmedabad airport flooded today, or आज की तस्वीर"
              className="resize-none rounded-2xl bg-fill px-4 py-3 text-[15px] leading-relaxed outline-none ring-1 ring-transparent transition placeholder:text-mute focus:bg-card focus:ring-brand"
            />
          </label>
        </motion.section>

        {examples.length > 0 && (
          <section className="mt-9">
            <h2 className="px-1 text-[12px] font-bold uppercase tracking-[0.1em] text-mute">Try a viral photo</h2>
            <div className="no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-3">
              {examples.map((ex, i) => (
                <motion.button
                  key={ex.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, ease: EASE, delay: 0.2 + i * 0.07 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={busy}
                  onClick={() => run({ imageUrl: ex.image_url, claim: ex.claim })}
                  className="w-[15rem] flex-none snap-start overflow-hidden rounded-2xl bg-card text-left shadow-card"
                >
                  <div className="skeleton aspect-[4/3] w-full">
                    {ex.thumbnail && (
                      <img src={ex.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="flex items-center gap-1 text-[11px] font-medium italic text-mute">
                      <Forward size={12} /> Forwarded
                    </p>
                    <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug">{ex.claim}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <h2 className="px-1 text-[12px] font-bold uppercase tracking-[0.1em] text-mute">How it works</h2>
          <ol className="mt-3 grid gap-px overflow-hidden rounded-3xl bg-line shadow-card">
            {[
              { icon: ImageUp, title: "Add the forward", body: "Upload the photo or video, or paste a link to it." },
              { icon: Search, title: "We find every copy", body: "Google Lens through SerpApi, with the date each page shows." },
              { icon: Share2, title: "Reply to the group", body: "A short message in English or Hindi, ready to paste back." },
            ].map((step, i) => (
              <li key={step.title} className="flex items-start gap-3 bg-card p-4">
                <span className="relative flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <step.icon size={19} />
                  <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{step.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-sub">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <BottomBar narrow>
        <Button size="lg" className="w-full" disabled={!ready || busy} onClick={submit}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          {busy ? "Starting the check…" : isVideo ? "Check this video" : "Check this photo"}
        </Button>
      </BottomBar>
    </>
  );
}
