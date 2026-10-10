# Demo video

The First Seen demo, built in [Remotion](https://www.remotion.dev): 1920×1080, 30 fps, 2:30.
The finished file is `../docs/media/first-seen-demo.mp4`, and the script is
[../docs/video-script.md](../docs/video-script.md).

## How it's made

1. `scripts/capture.mjs` drives the real app at phone size (390×844, 2× scale) in Chrome, and
   records it with Chrome's screencast into `public/app/flow.mp4`. It also saves stills, and
   the times of each tap in `public/app/marks.json`. The Chennai check in it runs live.
2. `scripts/voiceover.py` generates one voiceover clip per scene with edge-tts, plus word
   timings for the captions (`public/vo/clips.json`).
3. `src/timing.ts` sizes every scene to its line of voiceover. Scenes in `src/scenes/` time
   their animations to words in the line.
4. `scripts/cues.ts` exports the sound cues from that same timing to `audio/cues.json`.
   [opus-sound-layer](https://github.com/Bodila51/opus-sound-layer) mixes the voice, the pad
   (`public/pad.mp3`) and the CC0 effects, then checks the result. The effects chosen for each
   role are in `scripts/sounds.json`. [LISTEN.md](LISTEN.md) lists what to check by ear.

## Rebuild it

With the API on :8000 and the web app on :3000 (see the main README):

```
npm install
node scripts/capture.mjs                 # optional: re-record the app
python scripts/voiceover.py              # optional: regenerate the voice
npx remotion studio --port 3100          # preview
npx remotion render FirstSeen out/picture.mp4 --muted --port=3200
git clone https://github.com/Bodila51/opus-sound-layer sound-layer
python sound-layer/scripts/sfx.py kit    # downloads the CC0 library (about 10 minutes)
node scripts/cues.ts
python sound-layer/scripts/mix.py audio/cues.json
ffmpeg -i out/picture.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest out/final.mp4
python sound-layer/scripts/qa.py out/final.mp4
```

Remotion renders on port 3000 by default, which the web app uses, hence `--port=3200`. On
Windows, if Python reports `CERTIFICATE_VERIFY_FAILED` while downloading the sound library, set
`SSL_CERT_FILE` to certifi's bundle (`python -c "import certifi; print(certifi.where())"`).

## Sound check results

`qa.py` on the final mix:
- **Passed:**
  - Loudness, −16.0 LUFS integrated.
  - True peak, −2.7 dBTP.
  - The voice sits 13.8 LU above the music.
  - No dips or silence.
  - Every cue is in sync.
- **Failed (11 checks):**
  - Eight small UI clicks are partly masked because they play while the narrator talks.
  - The intro and outro logo hits lift 2.1 and 2.2 dB in the 250–500 Hz band, where the check wants 3 dB.
  - The verdict reveal happens inside the phone, so it's too small on screen for the motion check.
