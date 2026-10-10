import { Forward } from "lucide-react";
import { Img, staticFile } from "remotion";
import { at } from "../theme";
import { Canvas, Captions, Rise, useEnter } from "../ui";

const ID = "01-hook";

// A forward arrives in a family group.
export const Hook: React.FC = () => {
  const bubble = useEnter(10, 16, 110);
  const real = at(ID, "Is");
  return (
    <Canvas dark>
      <div style={{ position: "absolute", left: 300, top: 70, width: 700, display: "flex", alignItems: "center", gap: 22 }}>
        <Rise>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 78, height: 78, borderRadius: 999, background: "#2c2f36", display: "grid", placeItems: "center", fontSize: 40 }}>👪</div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>Family</div>
              <div style={{ fontSize: 26, color: "rgba(255,255,255,0.5)" }}>Mummy, Papa, Riya, Chachu +8</div>
            </div>
          </div>
        </Rise>
      </div>

      <div
        style={{
          position: "absolute",
          left: 300,
          top: 210,
          width: 640,
          padding: 14,
          borderRadius: 30,
          borderTopLeftRadius: 8,
          background: "#24272d",
          opacity: Math.min(1, bubble * 1.5),
          translate: `0px ${(1 - bubble) * 80}px`,
          scale: String(0.94 + bubble * 0.06),
          transformOrigin: "left top",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 12px 12px", fontSize: 26, fontStyle: "italic", color: "rgba(255,255,255,0.5)" }}><Forward size={26} /> Forwarded many times</div>
        <Img src={staticFile("photo.jpg")} style={{ width: 612, height: 440, objectFit: "cover", borderRadius: 20, display: "block" }} />
        <div style={{ padding: "18px 12px 6px", fontSize: 40, lineHeight: 1.3, fontWeight: 500 }}>
          Ahmedabad airport flooded today 😱 Forward to all 🙏
        </div>
        <div style={{ textAlign: "right", padding: "0 12px", fontSize: 24, color: "rgba(255,255,255,0.45)" }}>9:41 am</div>
      </div>

      <div style={{ position: "absolute", left: 1120, top: 330 }}>
        <Rise delay={real} y={40}>
          <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -5, lineHeight: 1 }}>
            Is it real<span style={{ color: "#fc5a1e" }}>?</span>
          </div>
        </Rise>
      </div>
      <Captions id={ID} dark />
    </Canvas>
  );
};
