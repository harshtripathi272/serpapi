import { at, C } from "../theme";
import { Canvas, LogoMark, Rise, useEnter } from "../ui";

const ID = "12-outro";

export const Outro: React.FC = () => {
  const logo = useEnter(0, 14, 130);
  return (
    <Canvas>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, paddingBottom: 40 }}>
        <div style={{ scale: String(0.7 + logo * 0.3), opacity: Math.min(1, logo * 2) }}>
          <LogoMark size={140} />
        </div>
        <Rise delay={4}>
          <div style={{ fontSize: 140, fontWeight: 800, letterSpacing: -5, lineHeight: 1 }}>First Seen</div>
        </Rise>
        <Rise delay={at(ID, "Before")}>
          <div style={{ fontSize: 54, fontWeight: 500, color: C.sub }}>Before you forward it, see where it&rsquo;s been.</div>
        </Rise>
        <Rise delay={at(ID, "Before") + 24}>
          <div style={{ marginTop: 40, display: "flex", gap: 20, alignItems: "center" }}>
            <span style={{ padding: "16px 30px", borderRadius: 999, background: C.ink, color: "#fff", fontSize: 34, fontWeight: 700 }}>github.com/harshtripathi272/serpapi</span>
            <span style={{ padding: "16px 30px", borderRadius: 999, background: C.card, color: C.sub, fontSize: 32, fontWeight: 600, boxShadow: "0 10px 30px -16px rgba(16,17,20,0.25)" }}>
              Built on SerpApi · Google Lens · Google News
            </span>
          </div>
        </Rise>
      </div>
    </Canvas>
  );
};
