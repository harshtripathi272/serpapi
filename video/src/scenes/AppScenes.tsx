import { Video } from "@remotion/media";
import { History, Images, KeyRound, Newspaper, Radio, RotateCcw, ScanSearch, ShieldCheck } from "lucide-react";
import React from "react";
import { Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { at, C } from "../theme";
import { FLOW } from "../timing";
import { Headline, Kicker, Phone, Rise, Split, Sub, useEnter } from "../ui";

const screen: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };

// A stretch of the screen recording (seconds of flow.mp4), optionally slowed, then held on a still.
const Flow: React.FC<{ from: number; rate?: number; frames: number; hold?: string; offset?: number }> = ({
  from,
  rate = 1,
  frames,
  hold,
  offset = 0,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {hold && <Img src={staticFile(hold)} style={{ ...screen, position: "absolute", inset: 0 }} />}
      <Sequence from={offset} durationInFrames={frames} premountFor={fps}>
        <div style={{ position: "absolute", inset: 0 }}>
          <Video src={staticFile("app/flow.mp4")} trimBefore={Math.round(from * fps)} playbackRate={rate} muted style={screen} />
        </div>
      </Sequence>
    </>
  );
};

const IconTile: React.FC<{ Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; tone?: string; bg?: string }> = ({
  Icon,
  tone = C.ink,
  bg = C.fill,
}) => (
  <div style={{ width: 84, height: 84, flex: "none", borderRadius: 24, background: bg, color: tone, display: "grid", placeItems: "center" }}>
    <Icon size={40} strokeWidth={2} />
  </div>
);

const Row: React.FC<{ Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; title: React.ReactNode; desc?: React.ReactNode; delay: number; active?: boolean; tone?: string; bg?: string }> = ({
  Icon,
  title,
  desc,
  delay,
  active,
  tone,
  bg,
}) => (
  <Rise delay={delay}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "26px 30px",
        borderRadius: 32,
        background: C.card,
        boxShadow: active ? `0 0 0 3px ${C.brand}, 0 24px 50px -24px rgba(252,90,30,0.45)` : "0 1px 2px rgba(16,17,20,0.04), 0 18px 40px -22px rgba(16,17,20,0.2)",
      }}
    >
      <IconTile Icon={Icon} tone={tone} bg={bg} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.8 }}>{title}</div>
        {desc && <div style={{ marginTop: 6, fontSize: 30, color: C.sub, lineHeight: 1.3 }}>{desc}</div>}
      </div>
    </div>
  </Rise>
);

export const Input: React.FC = () => {
  const ID = "04-input";
  const { durationInFrames } = useVideoConfig();
  return (
    <Split caption={ID} phone={<Phone><Flow {...FLOW.input} frames={durationInFrames} /></Phone>}>
      <Rise><Kicker tone="alert"><Radio size={26} strokeWidth={2.6} /> Live run</Kicker></Rise>
      <Headline delay={at(ID, "Paste")}>Paste the photo or its link.</Headline>
      <Sub delay={at(ID, "and")}>Add what the message claims. First Seen checks both.</Sub>
    </Split>
  );
};

export const Searches: React.FC = () => {
  const ID = "05-searches";
  const frame = useCurrentFrame();
  const lens = at(ID, "Google");
  const similar = at(ID, "Similar");
  const news = at(ID, "And");
  return (
    <Split caption={ID} phone={<Phone><Flow {...FLOW.searches} hold="app/tracking-done.png" /></Phone>}>
      <Headline size={76}>3 SerpApi searches, at once.</Headline>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 8 }}>
        <Row Icon={ScanSearch} title="Google Lens · exact matches" desc="Every copy of this image, with the date of each page" delay={lens - 8} active={frame >= lens && frame < similar} />
        <Row Icon={Images} title="Google Lens · similar images" desc="Cropped and watermarked copies: where fact-checks live" delay={similar - 8} active={frame >= similar && frame < news} />
        <Row Icon={Newspaper} title="Google News · past week" desc="Is the claimed event actually in the news?" delay={news - 8} active={frame >= news} />
      </div>
    </Split>
  );
};

const Stat: React.FC<{ n: number; label: string; delay: number }> = ({ n, label, delay }) => {
  const frame = useCurrentFrame();
  const v = Math.round(interpolate(frame, [delay, delay + 26], [0, n], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Rise delay={delay}>
      <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      <div style={{ fontSize: 32, color: C.sub, marginTop: 8 }}>{label}</div>
    </Rise>
  );
};

export const Verdict: React.FC = () => {
  const ID = "06-verdict";
  const stats = at(ID, "online");
  return (
    <Split caption={ID} phone={<Phone><Flow {...FLOW.verdict} hold="app/result-top.png" /></Phone>}>
      <Rise delay={6}><Kicker tone="alert"><ShieldCheck size={26} strokeWidth={2.6} /> Not new</Kicker></Rise>
      <Headline delay={10}>Online since at least Dec 2015.</Headline>
      <div style={{ display: "flex", gap: 90, marginTop: 6 }}>
        <Stat n={62} label="copies found" delay={stats} />
        <Stat n={39} label="websites" delay={stats + 6} />
      </div>
      <Rise delay={at(ID, "NDTV") - 4}>
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 6, padding: "24px 30px", borderRadius: 28, background: C.card, boxShadow: "0 18px 40px -22px rgba(16,17,20,0.2)" }}>
          <div style={{ fontSize: 28, color: C.sub }}>Earliest well-attested copy</div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>ndtv.com · 2 December 2015</div>
          <div style={{ fontSize: 28, color: C.sub }}>Chennai airport, the day it flooded</div>
        </div>
      </Rise>
    </Split>
  );
};

const Chip: React.FC<{ children: React.ReactNode; delay: number }> = ({ children, delay }) => {
  const p = useEnter(delay, 12, 180);
  return (
    <span style={{ display: "inline-block", padding: "16px 28px", borderRadius: 999, background: C.alertSoft, color: C.alert, fontSize: 38, fontWeight: 700, scale: String(0.7 + 0.3 * p), opacity: Math.min(1, p * 2) }}>
      {children}
    </span>
  );
};

export const Lives: React.FC = () => {
  const ID = "08-lives";
  return (
    <Split caption={ID} phone={<Phone><Flow {...FLOW.lives} /></Phone>}>
      <Rise><Kicker><History size={26} strokeWidth={2.6} /> Past lives</Kicker></Rise>
      <Headline delay={4}>It&rsquo;s been passed off before.</Headline>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Chip delay={at(ID, "Cyclone")}>Cyclone Michaung</Chip>
        <Chip delay={at(ID, "Ahmedabad")}>Ahmedabad airport</Chip>
      </div>
      <Rise delay={at(ID, "BOOM") - 4}>
        <div style={{ padding: "26px 30px", borderRadius: 28, background: C.card, boxShadow: "0 18px 40px -22px rgba(16,17,20,0.2)", maxWidth: 820 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 800 }}>
            <span style={{ color: C.alert }}>BOOM</span>
            <span style={{ fontSize: 24, fontWeight: 700, padding: "6px 14px", borderRadius: 999, background: C.warnSoft, color: C.warn }}>fact-check</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 36, fontWeight: 600, lineHeight: 1.3 }}>&ldquo;How fake Ahmedabad airport flood pics made it to national dailies&rdquo;</div>
        </div>
      </Rise>
    </Split>
  );
};

export const Reply: React.FC = () => {
  const ID = "09-reply";
  const then = at(ID, "Then");
  return (
    <Split
      caption={ID}
      phone={
        <Phone>
          <Img src={staticFile("app/reply-hi.png")} style={{ ...screen, position: "absolute", inset: 0 }} />
          <Flow {...FLOW.reply} />
          <Flow {...FLOW.news} />
        </Phone>
      }
    >
      <Rise>
        <Row Icon={Newspaper} title="Nothing in this week's news" desc="No article from the past 7 days matches the claim" delay={0} tone={C.ok} bg={C.okSoft} />
      </Rise>
      <Headline delay={then}>A calm reply for the group.</Headline>
      <Sub delay={then + 10}>In English or हिंदी, as a message or an image card.</Sub>
    </Split>
  );
};

export const Hood: React.FC = () => {
  const ID = "11-hood";
  return (
    <Split caption={ID} phone={<Phone><Img src={staticFile("app/how.png")} style={screen} /></Phone>}>
      <Headline delay={at(ID, "Every")}>Every search, on the record.</Headline>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Row Icon={Radio} title="Marked live or cached" desc="This run: 3 SerpApi searches, all live" delay={at(ID, "marked")} tone={C.alert} bg={C.alertSoft} />
        <Row Icon={RotateCcw} title="Repeat checks cost nothing" desc="Every response is cached by its search" delay={at(ID, "Repeat")} />
        <Row Icon={KeyRound} title="Replay mode, no API key" desc="Every example runs from saved responses" delay={at(ID, "replay")} />
      </div>
    </Split>
  );
};

