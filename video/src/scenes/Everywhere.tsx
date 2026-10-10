import { Film, Forward, MousePointer2, Puzzle } from "lucide-react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { at, C } from "../theme";
import { Canvas, Captions, Kicker, LogoMark, Phone, Rise, useEnter } from "../ui";

const ID = "10-everywhere";

const MenuItem: React.FC<{ children: React.ReactNode; active?: boolean }> = ({ children, active }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "14px 22px",
      borderRadius: 12,
      fontSize: 28,
      fontWeight: active ? 700 : 500,
      background: active ? C.brandSoft : "transparent",
      color: active ? C.ink : C.sub,
    }}
  >
    {children}
  </div>
);

export const Everywhere: React.FC = () => {
  const frame = useCurrentFrame();
  const right = at(ID, "Right-click");
  const video = at(ID, "Or");
  const menu = useEnter(right + 4, 16, 220);
  const phone = useEnter(video - 4, 20, 110);
  const pick = frame >= right + 26;
  const cursor = interpolate(frame, [right - 10, right + 2, right + 18, right + 26], [0, 0, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Canvas>
      {/* Browser extension. */}
      <div style={{ position: "absolute", left: 150, top: 110, width: 760 }}>
        <Rise><Kicker><Puzzle size={26} strokeWidth={2.6} /> Browser extension</Kicker></Rise>
        <Rise delay={6}>
          <div style={{ marginTop: 26, fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>Right-click any photo.</div>
          <div style={{ marginTop: 12, fontSize: 34, color: C.sub }}>Even on WhatsApp Web.</div>
        </Rise>
        <div style={{ position: "relative", marginTop: 44 }}>
          <Rise delay={10}>
            <div style={{ width: 470, padding: 12, borderRadius: 26, background: C.chat, boxShadow: "0 18px 40px -22px rgba(16,17,20,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 8px 10px", fontSize: 22, fontStyle: "italic", color: "#5a7a4a" }}><Forward size={22} /> Forwarded</div>
              <Img src={staticFile("shark.png")} style={{ width: 446, height: 300, objectFit: "cover", borderRadius: 16, display: "block" }} />
              <div style={{ padding: "12px 8px 4px", fontSize: 28, fontWeight: 500 }}>Shark on the highway in today&rsquo;s floods 🦈</div>
            </div>
          </Rise>
          <div
            style={{
              position: "absolute",
              left: 300,
              top: 150,
              width: 420,
              padding: 10,
              borderRadius: 18,
              background: C.card,
              boxShadow: "0 30px 60px -20px rgba(16,17,20,0.35), 0 0 0 1px rgba(16,17,20,0.06)",
              opacity: Math.min(1, menu * 2),
              scale: String(0.9 + 0.1 * menu),
              transformOrigin: "top left",
            }}
          >
            <MenuItem>Open image in new tab</MenuItem>
            <MenuItem>Save image as…</MenuItem>
            <MenuItem>Copy image</MenuItem>
            <div style={{ height: 1, background: C.line, margin: "6px 10px" }} />
            <MenuItem active={pick}><LogoMark size={34} /> Check with First Seen</MenuItem>
          </div>
          <div style={{ position: "absolute", left: 250 + cursor * 90, top: 120 + cursor * (pick ? 250 : 40), color: C.ink, opacity: frame >= right - 10 ? 1 : 0 }}>
            <MousePointer2 size={46} fill="#fff" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Videos, on the web and on Telegram. */}
      <div style={{ position: "absolute", left: 1060, top: 110, width: 720 }}>
        <Rise delay={video}><Kicker tone="dark"><Film size={26} strokeWidth={2.6} /> Video forwards</Kicker></Rise>
        <Rise delay={video + 4}>
          <div style={{ marginTop: 26, fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>Every scene, dated.</div>
          <div style={{ marginTop: 12, fontSize: 34, color: C.sub }}>On the web, or forward it to @Firstyseen_bot on Telegram.</div>
        </Rise>
        <div style={{ marginTop: 34, height: 560, overflow: "hidden", borderRadius: 40, opacity: phone, translate: `0px ${(1 - phone) * 80}px` }}>
          <Phone width={320}>
            <Img src={staticFile("app/video-scenes.png")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </Phone>
        </div>
      </div>
      <Captions id={ID} />
    </Canvas>
  );
};
