import { at, C } from "../theme";
import { Canvas, LogoMark, Rise, useEnter } from "../ui";

const ID = "03-intro";
export const LOGO_AT = 4; // the logo lands before the voice starts

export const Intro: React.FC = () => {
  const logo = useEnter(LOGO_AT, 13, 140);
  return (
    <Canvas>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34, paddingBottom: 80 }}>
        <div style={{ scale: String(0.6 + logo * 0.4), opacity: Math.min(1, logo * 2), rotate: `${(1 - logo) * -12}deg` }}>
          <LogoMark size={168} />
        </div>
        <Rise delay={at(ID, "First") + 2}>
          <div style={{ fontSize: 156, fontWeight: 800, letterSpacing: -6, lineHeight: 1 }}>First Seen</div>
        </Rise>
        <Rise delay={at(ID, "Before")}>
          <div style={{ fontSize: 54, fontWeight: 500, color: C.sub }}>Before you forward it, see where it&rsquo;s been.</div>
        </Rise>
      </div>
    </Canvas>
  );
};
