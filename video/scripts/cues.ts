// Export audio/cues.json for sound-layer/scripts/mix.py from the film's own timing.
// Every frame below comes from src/timing.ts (scene starts, voiceover word times, recording marks),
// the same values the scenes animate from. Run from video/: node scripts/cues.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { measureSpring } from "remotion";
import { FLOW, FPS, SCENES, flowFrame, lead, makeTiming, type Clip, type SceneId } from "../src/timing.ts";

const clips = JSON.parse(readFileSync("public/vo/clips.json", "utf8")) as Record<string, Clip>;
const marks = JSON.parse(readFileSync("public/app/marks.json", "utf8")) as Record<string, number>;
const { sceneStart, totalFrames, at } = makeTiming(clips);

// Sounds picked with `sfx.py browse` (see audio/browse-*.png). One family: soft taps, paper and air.
const S = JSON.parse(readFileSync("scripts/sounds.json", "utf8")) as Record<string, string>;

type Cue = { id: string; frame: number; sound: string; weight?: "hero" | "support"; visual?: string; pan?: number; stop_before?: boolean; build?: boolean; align?: string };
const cues: Cue[] = [];
const cue = (scene: SceneId, local: number, id: string, sound: string, extra: Partial<Cue> = {}) =>
  cues.push({ id: `${scene}:${id}`, frame: sceneStart(scene) + Math.round(local), sound, weight: "support", visual: "appear", ...extra });

// Springs (useEnter) cover most of their distance in the first ~4 frames after their delay.
const POP = 4;
// Frames until a useEnter spring visibly stops (same configs as the scenes).
const settle = (damping: number, stiffness: number) => measureSpring({ fps: FPS, config: { damping, stiffness, mass: 0.9 }, threshold: 0.02 });
// The intro logo springs in at this frame (src/scenes/Intro.tsx).
const LOGO_AT = 4;
// The screencast paints a frame after each recorded mark.
const PAINT = 1;

// 01 Hook: the forward arrives; the question lands.
cue("01-hook", 10 + POP, "message", S.message, { pan: -0.25 });

// 03 Intro: the logo is the first hero.
cue("03-intro", LOGO_AT + POP, "logo", S.hero, { weight: "hero", visual: "appear", stop_before: true, build: true });

// 04 Input: taps in the recording.
cue("04-input", flowFrame(FLOW.input, marks.link), "tab", S.tap, { pan: -0.35 });
for (let i = 0; i < 4; i++) cue("04-input", flowFrame(FLOW.input, marks.link + 1.35 + i * 0.45), `key${i}`, S.key, { pan: -0.35, visual: "move" });
cue("04-input", flowFrame(FLOW.input, marks.submit), "submit", S.press, { pan: -0.35, visual: "cut" });

// 05 Three searches: each card comes in on its line.
cue("05-searches", at("05-searches", "Google") - 8 + POP, "lens", S.card, { pan: 0.3 });
cue("05-searches", at("05-searches", "Similar") - 8 + POP, "similar", S.card, { pan: 0.3 });
cue("05-searches", at("05-searches", "And") - 8 + POP, "news", S.card, { pan: 0.3 });

// 06 Verdict: the result replaces the tracker. Second hero.
cue("06-verdict", flowFrame(FLOW.verdict, marks.result) + PAINT, "verdict", S.hero, { weight: "hero", visual: "appear", pan: -0.2, stop_before: true, build: true });
cue("06-verdict", at("06-verdict", "online") + POP, "stats", S.tick, { pan: 0.3 });

// 07 How it decides: dots fall, March is rejected, December is ringed (third hero).
const drop = at("07-decides", "Dates") + 6;
cue("07-decides", drop + 18, "dots-b", S.paper, { pan: 0.2, visual: "move" });
cue("07-decides", at("07-decides", "Two") + POP, "march", S.tick, { pan: -0.4 });
cue("07-decides", at("07-decides", "So"), "reject", S.soft, { pan: -0.4 });
cue("07-decides", at("07-decides", "three") + POP, "first-seen", S.hero, { weight: "hero", pan: 0.2, stop_before: true });

// 08 Past lives.
cue("08-lives", at("08-lives", "Cyclone") + POP, "chip1", S.chip, { pan: 0.3 });
cue("08-lives", at("08-lives", "Ahmedabad") + POP, "chip2", S.chip, { pan: 0.35 });
cue("08-lives", at("08-lives", "BOOM") - 4 + POP, "boom", S.card, { pan: 0.3 });

// 09 News and reply: the sheet slides up, then Hindi is tapped.
cue("09-reply", POP, "news", S.card, { pan: 0.3 });
cue("09-reply", flowFrame(FLOW.reply, marks.reply) + 6, "sheet", S.swish, { pan: -0.35, visual: "move" });
cue("09-reply", flowFrame(FLOW.reply, marks.hindi), "hindi", S.tap, { pan: -0.35 });

// 10 Everywhere: right-click menu, the pick, the video phone.
const right = at("10-everywhere", "Right-click");
cue("10-everywhere", right + 4 + POP, "menu", S.press, { pan: -0.4 });
cue("10-everywhere", right + 26, "pick", S.tap, { pan: -0.3 });
cue("10-everywhere", at("10-everywhere", "Or") - 4 + POP, "video", S.slide, { pan: 0.4, visual: "move" });

// 11 Under the hood.
cue("11-hood", at("11-hood", "marked") + POP, "row1", S.card, { pan: 0.3 });
cue("11-hood", at("11-hood", "Repeat") + POP, "row2", S.card, { pan: 0.3 });
cue("11-hood", at("11-hood", "replay") + POP, "row3", S.card, { pan: 0.3 });

// 12 Outro: last hero.
cue("12-outro", settle(14, 130), "logo", S.hero, { weight: "hero", visual: "land", stop_before: true, build: true });

const voice = SCENES.map((id) => ({ file: `public/vo/${id}.mp3`, start_s: +((sceneStart(id) + lead(id) * FPS) / FPS).toFixed(3) }));
const sheet = {
  fps: FPS,
  duration_s: +(totalFrames / FPS).toFixed(3),
  energy: "calm",
  lufs: -16,
  kit: "audio/kit",
  music: { file: "public/pad.mp3", start_s: 0, loop: false, fade_out_s: 2.5 },
  voice,
  duck_db: 8,
  silence_ok: [[+(totalFrames / FPS - 1).toFixed(2), +(totalFrames / FPS).toFixed(2)]],
  cues: cues.sort((a, b) => a.frame - b.frame),
};
mkdirSync("audio", { recursive: true });
writeFileSync("audio/cues.json", JSON.stringify(sheet, null, 2));
console.log(`${cues.length} cues, ${voice.length} voice clips, ${sheet.duration_s}s`);
