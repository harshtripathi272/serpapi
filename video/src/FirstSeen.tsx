import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import React from "react";
import { interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { Decides } from "./scenes/Decides";
import { Everywhere } from "./scenes/Everywhere";
import { Hook } from "./scenes/Hook";
import { Intro } from "./scenes/Intro";
import { Hood, Input, Lives, Reply, Searches, Verdict } from "./scenes/AppScenes";
import { Outro } from "./scenes/Outro";
import { Problem } from "./scenes/Problem";
import { FADE, lead, sceneFrames, TOTAL_FRAMES, type SceneId } from "./theme";

// Each scene carries its own line of voiceover, starting lead(id) seconds in.
const Scene: React.FC<{ id: SceneId; children: React.ReactNode }> = ({ id, children }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {children}
      <Sequence from={Math.round(lead(id) * fps)} premountFor={fps}>
        <Audio src={staticFile(`vo/${id}.mp3`)} />
      </Sequence>
    </>
  );
};

const cut = <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />;

export const FirstSeen: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={sceneFrames("01-hook")} premountFor={fps}>
          <Scene id="01-hook"><Hook /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Problem" durationInFrames={sceneFrames("02-problem")} premountFor={fps}>
          <Scene id="02-problem"><Problem /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Intro" durationInFrames={sceneFrames("03-intro")} premountFor={fps}>
          <Scene id="03-intro"><Intro /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Input" durationInFrames={sceneFrames("04-input")} premountFor={fps}>
          <Scene id="04-input"><Input /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Searches" durationInFrames={sceneFrames("05-searches")} premountFor={fps}>
          <Scene id="05-searches"><Searches /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Verdict" durationInFrames={sceneFrames("06-verdict")} premountFor={fps}>
          <Scene id="06-verdict"><Verdict /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Decides" durationInFrames={sceneFrames("07-decides")} premountFor={fps}>
          <Scene id="07-decides"><Decides /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Lives" durationInFrames={sceneFrames("08-lives")} premountFor={fps}>
          <Scene id="08-lives"><Lives /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Reply" durationInFrames={sceneFrames("09-reply")} premountFor={fps}>
          <Scene id="09-reply"><Reply /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Everywhere" durationInFrames={sceneFrames("10-everywhere")} premountFor={fps}>
          <Scene id="10-everywhere"><Everywhere /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Under the hood" durationInFrames={sceneFrames("11-hood")} premountFor={fps}>
          <Scene id="11-hood"><Hood /></Scene>
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence name="Outro" durationInFrames={sceneFrames("12-outro")} premountFor={fps}>
          <Scene id="12-outro"><Outro /></Scene>
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Audio
        src={staticFile("pad.mp3")}
        volume={(f) => interpolate(f, [0, 2 * fps, TOTAL_FRAMES - 3 * fps, TOTAL_FRAMES], [0, 0.5, 0.5, 0], { extrapolateRight: "clamp" })}
      />
    </>
  );
};
