"use client";

import { MotionGlobalConfig } from "motion/react";

// ?static=1 turns animations off for the rest of the session (?static=0 turns them back on).
// For screenshots, screen recorders that drop frames, and test browsers that don't paint.
function readStatic(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const param = new URLSearchParams(window.location.search).get("static");
    if (param !== null) sessionStorage.setItem("first-seen-static", param === "0" ? "" : "1");
    return Boolean(sessionStorage.getItem("first-seen-static"));
  } catch {
    return false;
  }
}

export const STATIC = readStatic();
if (STATIC) MotionGlobalConfig.skipAnimations = true;
