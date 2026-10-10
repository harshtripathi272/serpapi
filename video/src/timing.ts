// Scene timing, shared by the video and by scripts/cues.ts (which exports the sound cues).
// Everything is derived from the voiceover: a scene lasts as long as its line.

export type Word = { text: string; start: number; end: number };
export type Clip = { duration: number; text: string; words: Word[] };

export const FPS = 30;
export const FADE = 14; // frames of cross-fade between scenes
export const LEAD = 0.4; // seconds before the voice starts in each scene
const TAIL = 0.75; // seconds of hold after the voice ends

export const SCENES = [
  "01-hook",
  "02-problem",
  "03-intro",
  "04-input",
  "05-searches",
  "06-verdict",
  "07-decides",
  "08-lives",
  "09-reply",
  "10-everywhere",
  "11-hood",
  "12-outro",
] as const;
export type SceneId = (typeof SCENES)[number];

const extra: Partial<Record<SceneId, number>> = { "03-intro": 0.4, "12-outro": 1.6 };
// Hero moments land before the voice starts, so the reveal gets its own beat.
const LEADS: Partial<Record<SceneId, number>> = { "03-intro": 0.9, "06-verdict": 1.0 };
export const lead = (id: SceneId) => LEADS[id] ?? LEAD;

export function makeTiming(clips: Record<string, Clip>) {
  const sceneFrames = (id: SceneId) => Math.ceil((lead(id) + clips[id].duration + TAIL + (extra[id] ?? 0)) * FPS);
  const totalFrames = SCENES.reduce((n, id) => n + sceneFrames(id), 0) - FADE * (SCENES.length - 1);
  // First frame of each scene on the film's timeline (scenes overlap by FADE).
  const sceneStart = (id: SceneId) => {
    let f = 0;
    for (const s of SCENES) {
      if (s === id) return f;
      f += sceneFrames(s) - FADE;
    }
    return f;
  };
  // When a word of the voiceover starts, in frames from the scene's start. Lets visuals land on the line.
  const at = (id: SceneId, word: string, nth = 0) => {
    const hits = clips[id].words.filter((w) => w.text.toLowerCase().startsWith(word.toLowerCase()));
    const w = hits[nth] ?? hits[0];
    return Math.round((lead(id) + (w?.start ?? 0)) * FPS);
  };
  return { sceneFrames, totalFrames, sceneStart, at };
}

// Stretches of the screen recording (public/app/flow.mp4) shown in the phone: start second, speed,
// and the frame of the scene they start on. Recording marks are in public/app/marks.json.
export const FLOW = {
  input: { from: 0, rate: 1, offset: 0 },
  searches: { from: 7.77, rate: 0.5, offset: 0, frames: 434 },
  verdict: { from: 15.0, rate: 1, offset: 0, frames: 96 },
  lives: { from: 18.3, rate: 0.64, offset: 0, frames: 410 },
  news: { from: 27.0, rate: 1, offset: 0, frames: 99 },
  reply: { from: 42.4, rate: 1, offset: 99, frames: 156 },
} as const;

// Frame in a scene at which the recording reaches second `t`.
export const flowFrame = (seg: { from: number; rate: number; offset: number }, t: number) =>
  Math.round(seg.offset + ((t - seg.from) / seg.rate) * FPS);
