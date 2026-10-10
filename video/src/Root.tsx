import { Composition } from "remotion";
import { FirstSeen } from "./FirstSeen";
import { FPS, TOTAL_FRAMES } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="FirstSeen" component={FirstSeen} width={1920} height={1080} fps={FPS} durationInFrames={TOTAL_FRAMES} />
);
