// Records the real app at phone size with Chrome's screencast, and takes stills.
// Needs the API on :8000 and the web app on :3000. Run from video/: node scripts/capture.mjs
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const OUT = path.resolve("public/app");
const FRAMES = path.resolve("capture-frames");
mkdirSync(OUT, { recursive: true });
mkdirSync(FRAMES, { recursive: true });

const CHENNAI = "https://i.ndtvimg.com/video/images/vod/medium/2015-12/big_393136_1449034155.jpg";
const CLAIM = "Ahmedabad airport flooded today after heavy rain";
const SHARK = "https://ktla.com/wp-content/uploads/sites/4/2023/08/image-1.png";
const SHARK_CLAIM = "Shark swimming on the highway in today's Chennai floods";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);

// Animated scroll, so the recording shows a smooth glide rather than a jump.
async function glide(target, ms = 1100) {
  await page.evaluate(
    ([target, ms]) =>
      new Promise((done) => {
        const el = typeof target === "string" ? document.getElementById(target) : null;
        const to = el ? el.getBoundingClientRect().top + scrollY - 112 : target;
        const from = scrollY;
        const t0 = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const step = (now) => {
          const t = Math.min(1, (now - t0) / ms);
          scrollTo(0, from + (to - from) * ease(t));
          t < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [target, ms],
  );
}

// --- Screencast: every painted frame, with Chrome's timestamp.
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  const file = path.join(FRAMES, `f${String(frames.length).padStart(5, "0")}.jpg`);
  writeFileSync(file, Buffer.from(data, "base64"));
  frames.push({ file, t: metadata.timestamp });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
const marks = {};
const mark = async (name) => {
  marks[name] = Date.now() / 1000;
  console.log("mark", name);
};

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await wait(800);
await page.screenshot({ path: path.join(OUT, "home.png") });

await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
await mark("start");
await wait(1200);

// Paste a link and the claim.
await page.getByRole("tab", { name: /Paste a link/ }).click();
await mark("link");
await wait(700);
await page.getByPlaceholder("https://… link to the image").fill(CHENNAI);
await wait(500);
await page.getByPlaceholder(/Ahmedabad airport flooded today/).click();
await page.keyboard.type(CLAIM, { delay: 28 });
await mark("filled");
await wait(900);
await page.screenshot({ path: path.join(OUT, "home-filled.png") });

// Run the check (live: its cache entries were removed beforehand).
await page.getByRole("button", { name: /Check this/ }).click();
await mark("submit");
await page.getByText(/Online since/).first().waitFor({ timeout: 90_000 });
await mark("result");
await wait(2600);
await page.screenshot({ path: path.join(OUT, "result-top.png") });

await glide("lives");
await mark("lives");
await wait(2200);
await glide("checks");
await mark("checks");
await wait(1400);
await page.evaluate(() => {
  const row = document.querySelector("#checks .snap-x, #checks [class*='snap-x']");
  row?.scrollBy({ left: 300, behavior: "smooth" });
});
await wait(1800);
await glide("news");
await mark("news");
await wait(2200);
await glide("timeline");
await mark("timeline");
await wait(1200);
await page.getByRole("button", { name: /^2020:/ }).click();
await wait(1500);
await page.getByRole("button", { name: /^2015:/ }).click();
await wait(1600);
await glide(await page.evaluate(() => document.body.scrollHeight), 1600);
await page.getByRole("button", { name: /How we checked/ }).click();
await mark("how");
await wait(900);
await glide(await page.evaluate(() => document.body.scrollHeight), 800);
await wait(2400);
await page.screenshot({ path: path.join(OUT, "how.png") });

await glide(0, 1400);
await wait(500);
await page.getByRole("button", { name: /Reply to the group/ }).click();
await mark("reply");
await wait(2200);
await page.screenshot({ path: path.join(OUT, "reply-en.png") });
await page.getByRole("tab", { name: "हिंदी" }).click();
await mark("hindi");
await wait(2600);
await page.screenshot({ path: path.join(OUT, "reply-hi.png") });
await mark("end");
await cdp.send("Page.stopScreencast");

// Full result page as one tall image.
await page.keyboard.press("Escape");
await wait(800);
await page.screenshot({ path: path.join(OUT, "result-full.png"), fullPage: true });

// The shark, opened the way the extension opens it.
const shark = await context.newPage();
await shark.goto(`http://localhost:3000/?image_url=${encodeURIComponent(SHARK)}&claim=${encodeURIComponent(SHARK_CLAIM)}`);
await shark.getByText(/Online since/).first().waitFor({ timeout: 90_000 });
await shark.waitForTimeout(3000);
await shark.screenshot({ path: path.join(OUT, "shark-result.png") });

// The test video, uploaded.
const vid = await context.newPage();
await vid.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await vid.locator("input[type=file]").setInputFiles(path.resolve("../demo-assets/slideshow-forward.mp4"));
await vid.waitForTimeout(600);
await vid.getByPlaceholder(/Ahmedabad airport flooded today/).fill("Sharks in the streets of Chennai today");
await vid.getByRole("button", { name: /Check this/ }).click();
await vid.getByText(/Online since|scene/i).first().waitFor({ timeout: 120_000 });
await vid.waitForTimeout(3500);
await vid.screenshot({ path: path.join(OUT, "video-result.png"), fullPage: true });

await browser.close();

// Frames to a constant-30fps mp4, with each frame held until the next one arrived.
const list = frames
  .map((f, i) => {
    const next = frames[i + 1]?.t ?? f.t + 0.5;
    return `file '${f.file.replaceAll("\\", "/")}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}`;
  })
  .join("\n");
writeFileSync(path.join(FRAMES, "list.txt"), `ffconcat version 1.0\n${list}\nfile '${frames.at(-1).file.replaceAll("\\", "/")}'\n`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(FRAMES, "list.txt"),
  "-vf", "fps=30,scale=780:1688:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "medium",
  path.join(OUT, "flow.mp4")]);
const t0 = frames[0].t;
const rel = Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - t0).toFixed(2)]));
writeFileSync(path.join(OUT, "marks.json"), JSON.stringify(rel, null, 2));
console.log("frames", frames.length, "marks", rel);
