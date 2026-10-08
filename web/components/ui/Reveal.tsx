"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { STATIC } from "./staticMode";

// Fades and lifts content in as it scrolls into view, once.
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (STATIC) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
