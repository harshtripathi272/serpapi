// Extra stills: the Chennai photo itself, and the video result scrolled to its scenes.
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/app");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const img = await context.newPage();
const res = await img.goto("https://i.ndtvimg.com/video/images/vod/medium/2015-12/big_393136_1449034155.jpg");
console.log("photo", res?.status());
if (res?.ok()) writeFileSync(path.resolve("public/photo.jpg"), await res.body());

const vid = await context.newPage();
await vid.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await vid.locator("input[type=file]").setInputFiles(path.resolve("../demo-assets/slideshow-forward.mp4"));
await vid.waitForTimeout(600);
await vid.getByPlaceholder(/Ahmedabad airport flooded today/).fill("Sharks in the streets of Chennai today");
await vid.getByRole("button", { name: /Check this/ }).click();
await vid.getByText(/Online since/).first().waitFor({ timeout: 120_000 });
await vid.waitForTimeout(2500);
await vid.screenshot({ path: path.join(OUT, "video-top.png") });
const scenes = vid.getByText(/Checked \d scenes/);
await scenes.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 130));
await vid.waitForTimeout(2000);
await vid.screenshot({ path: path.join(OUT, "video-scenes.png") });
await browser.close();
