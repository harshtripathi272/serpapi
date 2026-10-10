import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadDevanagari } from "@remotion/google-fonts/NotoSansDevanagari";
import clipsJson from "../public/vo/clips.json";
import { makeTiming, type Clip } from "./timing";

const jakarta = loadJakarta("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
const devanagari = loadDevanagari("normal", { weights: ["500", "700"], subsets: ["devanagari"] });

export const FONT = `${jakarta.fontFamily}, ${devanagari.fontFamily}, "Segoe UI Emoji", sans-serif`;

// The app's own tokens (web/app/globals.css).
export const C = {
  canvas: "#f4f4f6",
  card: "#ffffff",
  ink: "#16171b",
  sub: "#5b5e66",
  mute: "#9a9da5",
  line: "#e9e9ed",
  fill: "#f1f1f4",
  brand: "#fc5a1e",
  brandSoft: "#fff0e8",
  alert: "#d4382c",
  alertSoft: "#fdecea",
  ok: "#0f7f55",
  okSoft: "#e4f4ec",
  warn: "#9a5800",
  warnSoft: "#fff2dc",
  chat: "#e3f8d3",
};

export { FADE, FPS, LEAD, lead, SCENES, type Clip, type SceneId, type Word } from "./timing";
export const CLIPS = clipsJson as Record<string, Clip>;
export const { sceneFrames, totalFrames: TOTAL_FRAMES, sceneStart, at } = makeTiming(CLIPS);
