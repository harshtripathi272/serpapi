import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, CLIPS, FONT, lead, type SceneId } from "./theme";

// A spring from 0 to 1 starting at `delay` frames. Entrances settle in about half a second.
export const useEnter = (delay = 0, damping = 18, stiffness = 120) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness, mass: 0.9 } });
};

// Fade and lift in on a spring.
export const Rise: React.FC<{ delay?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0,
  y = 28,
  children,
  style,
}) => {
  const p = useEnter(delay);
  return (
    <div style={{ opacity: Math.min(1, p * 1.4), translate: `0px ${(1 - p) * y}px`, ...style }}>{children}</div>
  );
};

export const Canvas: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <AbsoluteFill style={{ background: dark ? "#101114" : C.canvas, fontFamily: FONT, color: dark ? "#fff" : C.ink }}>
    {children}
  </AbsoluteFill>
);

export const LogoMark: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill={C.ink} />
    <circle cx="14" cy="14" r="7" fill="none" stroke="#fff" strokeWidth="2.6" />
    <path d="M19.2 19.2 25 25" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="14" cy="14" r="2.7" fill={C.brand} />
  </svg>
);

// The app inside a phone. Screen is 390×844 CSS px, shown at `width`.
export const Phone: React.FC<{ children: React.ReactNode; width?: number; style?: React.CSSProperties }> = ({
  children,
  width = 440,
  style,
}) => {
  const frame = useCurrentFrame();
  const height = (width * 844) / 390;
  const bezel = 13;
  return (
    <div
      style={{
        width: width + bezel * 2,
        height: height + bezel * 2,
        borderRadius: 64,
        background: "#0d0e11",
        padding: bezel,
        boxShadow: "0 50px 100px -30px rgba(16,17,20,0.45), 0 18px 40px -20px rgba(16,17,20,0.35), inset 0 0 0 2px #2a2c31",
        translate: `0px ${Math.sin(frame / 38) * 4}px`,
        ...style,
      }}
    >
      <div style={{ width, height, borderRadius: 51, overflow: "hidden", position: "relative", background: C.canvas }}>
        {children}
      </div>
    </div>
  );
};

export const Kicker: React.FC<{ children: React.ReactNode; tone?: "brand" | "ok" | "alert" | "dark" }> = ({
  children,
  tone = "brand",
}) => {
  const tones = {
    brand: [C.brandSoft, C.brand],
    ok: [C.okSoft, C.ok],
    alert: [C.alertSoft, C.alert],
    dark: [C.ink, "#fff"],
  } as const;
  const [bg, fg] = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        background: bg,
        color: fg,
        borderRadius: 999,
        padding: "12px 24px",
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: 2.4,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
};

// Phone on the left, the point of the scene on the right.
export const Split: React.FC<{ phone: React.ReactNode; children: React.ReactNode; caption?: SceneId }> = ({ phone, children, caption }) => {
  const p = useEnter(0, 22, 90);
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 220, top: 38, translate: `${(1 - p) * -60}px 0px`, opacity: p }}>{phone}</div>
      <div style={{ position: "absolute", left: 860, right: 130, top: 0, bottom: 150, display: "flex", flexDirection: "column", justifyContent: "center", gap: 34 }}>
        {children}
      </div>
      {caption && <Captions id={caption} left={860} right={130} />}
    </Canvas>
  );
};

export const Headline: React.FC<{ children: React.ReactNode; size?: number; delay?: number }> = ({ children, size = 84, delay = 0 }) => (
  <Rise delay={delay}>
    <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.4 }}>{children}</div>
  </Rise>
);

export const Sub: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <Rise delay={delay}>
    <div style={{ fontSize: 40, lineHeight: 1.35, color: C.sub, fontWeight: 500 }}>{children}</div>
  </Rise>
);

// Voiceover captions, a few words at a time, with the spoken word in ink and the rest muted.
export const Captions: React.FC<{ id: SceneId; dark?: boolean; left?: number; right?: number }> = ({ id, dark, left = 0, right = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - lead(id);
  const words = CLIPS[id].words;
  const chunks: (typeof words)[] = [];
  let cur: typeof words = [];
  for (const w of words) {
    cur.push(w);
    const long = cur.map((x) => x.text).join(" ").length;
    if (/[.,?!:]$/.test(w.text) && long > 18 || long > 44) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);
  // Punctuation isn't in the word timings, so put it back from the script text.
  const chunk = chunks.find((c, i) => t < (chunks[i + 1]?.[0].start ?? c[c.length - 1].end + 0.6) && t >= c[0].start - 0.15);
  if (!chunk) return null;
  const start = chunk[0].start;
  const fadeIn = interpolate(t, [start - 0.15, start + 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left, right, bottom: 58, display: "flex", justifyContent: left ? "flex-start" : "center", pointerEvents: "none" }}>
      <div
        style={{
          opacity: fadeIn,
          fontFamily: FONT,
          fontSize: 38,
          fontWeight: 600,
          letterSpacing: -0.3,
          padding: "14px 30px",
          borderRadius: 20,
          background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.94)",
          boxShadow: dark ? "none" : "0 10px 30px -14px rgba(16,17,20,0.25)",
          color: dark ? "rgba(255,255,255,0.45)" : C.mute,
          maxWidth: 1400,
          textAlign: "center",
        }}
      >
        {chunk.map((w, i) => (
          <span key={i} style={{ color: t >= w.start - 0.02 ? (dark ? "#fff" : C.ink) : undefined }}>
            {w.text}
            {i < chunk.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
