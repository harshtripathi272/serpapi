import { at, C } from "../theme";
import { Canvas, Rise } from "../ui";

const ID = "02-problem";

export const Problem: React.FC = () => (
  <Canvas>
    <div style={{ position: "absolute", left: 160, right: 120, top: 260, display: "flex", flexDirection: "column", gap: 30 }}>
      <Rise delay={at(ID, "Most")}>
        <div style={{ fontSize: 104, fontWeight: 800, letterSpacing: -3.5, lineHeight: 1.04 }}>Most viral photos aren&rsquo;t fake.</div>
      </Rise>
      <Rise delay={at(ID, "They're")}>
        <div style={{ fontSize: 104, fontWeight: 800, letterSpacing: -3.5, lineHeight: 1.04 }}>
          They&rsquo;re <span style={{ color: C.brand }}>old</span>, with a new caption.
        </div>
      </Rise>
      <Rise delay={at(ID, "And")}>
        <div style={{ marginTop: 26, fontSize: 52, fontWeight: 500, color: C.sub }}>Checking takes effort, so nobody does.</div>
      </Rise>
    </div>
  </Canvas>
);
