import { interpolate, useCurrentFrame } from "remotion";
import { at, C } from "../theme";
import { Canvas, Captions, Rise, useEnter } from "../ui";

const ID = "07-decides";

// Dated copies of the Chennai photo from the live Lens search, by day.
const COLUMNS = [
  { label: "12 Mar", n: 2, x: 330, early: true },
  { label: "2 Dec", n: 22, x: 1000 },
  { label: "3 Dec", n: 15, x: 1130 },
  { label: "4 Dec", n: 4, x: 1260 },
  { label: "6 Dec", n: 2, x: 1390 },
  { label: "7 Dec", n: 1, x: 1520 },
];
const DOT = 30;
const GAP = 8;
const BASE = 770; // y of the axis

const Dot: React.FC<{ x: number; y: number; delay: number; color: string; ring?: boolean }> = ({ x, y, delay, color, ring }) => {
  const p = useEnter(delay, 14, 170);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - (1 - p) * 60,
        width: DOT,
        height: DOT,
        borderRadius: 999,
        background: color,
        opacity: Math.min(1, p * 2),
        boxShadow: ring ? `0 0 0 5px ${C.canvas}, 0 0 0 9px ${C.brand}` : undefined,
      }}
    />
  );
};

export const Decides: React.FC = () => {
  const frame = useCurrentFrame();
  const drop = at(ID, "Dates") + 6;
  const march = at(ID, "Two");
  const reject = at(ID, "So");
  const agree = at(ID, "three");
  const never = at(ID, "It");
  const ringed = frame >= agree;
  const greyed = frame >= reject;
  const axis = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });

  let order = 0;
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 160, top: 90 }}>
        <Rise>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2.4, color: C.brand, textTransform: "uppercase" }}>How First Seen picks the date</div>
          <div style={{ marginTop: 14, fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>50 dated copies of this photo</div>
        </Rise>
      </div>

      {/* Axis, broken between March and December. */}
      <div style={{ position: "absolute", left: 160, top: BASE + DOT + 14, width: 380 * axis, height: 4, borderRadius: 2, background: C.line }} />
      <div style={{ position: "absolute", left: 900, top: BASE + DOT + 14, width: 780 * axis, height: 4, borderRadius: 2, background: C.line }} />
      <div style={{ position: "absolute", left: 590, top: BASE + DOT - 6, width: 260, textAlign: "center", fontSize: 28, color: C.mute, opacity: axis }}>· · · 9 months · · ·</div>

      {COLUMNS.map((col) => {
        const dots = [];
        for (let i = 0; i < col.n; i++) {
          const row = Math.floor(i / 2);
          const x = col.x + (i % 2) * (DOT + GAP);
          const y = BASE - row * (DOT + GAP);
          const isRing = !col.early && col.label === "2 Dec" && i < 3 && ringed;
          const color = col.early ? (greyed ? "#c9cbd1" : frame >= march ? C.warn : C.ink) : isRing ? C.brand : ringed ? "#3a3c43" : C.ink;
          dots.push(<Dot key={i} x={x} y={y} delay={drop + order++ * 0.6} color={color} ring={isRing} />);
        }
        return (
          <div key={col.label}>
            {dots}
            <div style={{ position: "absolute", left: col.x - 40, width: DOT * 2 + GAP + 80, top: BASE + DOT + 34, textAlign: "center", fontSize: 30, fontWeight: 600, color: C.sub }}>
              {col.label}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 160, top: BASE + DOT + 84, fontSize: 30, fontWeight: 700, color: C.mute }}>2015</div>
      <div style={{ position: "absolute", right: 150, top: BASE + DOT + 84, fontSize: 28, color: C.mute }}>+4 later copies, 2017–2021</div>

      {/* March: two pages, not enough agreement. */}
      <div style={{ position: "absolute", left: 230, top: BASE - 190, width: 280, textAlign: "center" }}>
        <Rise delay={march}>
          <div style={{ fontSize: 30, fontWeight: 700, color: greyed ? C.mute : C.warn }}>2 pages</div>
          <div style={{ fontSize: 28, color: greyed ? C.mute : C.warn, marginTop: 4, opacity: greyed ? 1 : 0 }}>too few sites agree</div>
        </Rise>
      </div>

      {/* December: three sites agree within 30 days. */}
      <div style={{ position: "absolute", left: 1270, top: 400, width: 600 }}>
        <Rise delay={agree}>
          <div style={{ display: "inline-flex", padding: "14px 26px", borderRadius: 999, background: C.brand, color: "#fff", fontSize: 34, fontWeight: 800 }}>First seen · 2 Dec 2015</div>
          <div style={{ marginTop: 16, fontSize: 30, color: C.sub, lineHeight: 1.4 }}>ndtv.com · indiatoday.in · governancenow.com<br />3 sites agree within 30 days</div>
        </Rise>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 250, display: "flex", justifyContent: "flex-start", paddingLeft: 160 }}>
        <Rise delay={never}>
          <div style={{ fontSize: 40, fontWeight: 700 }}>
            Can understate a photo&rsquo;s age. <span style={{ color: C.brand }}>Never overstates it.</span>
          </div>
        </Rise>
      </div>
      <Captions id={ID} />
    </Canvas>
  );
};
