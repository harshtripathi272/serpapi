"use client";

import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#16171b" />
      <circle cx="14" cy="14" r="7" fill="none" stroke="#fff" strokeWidth="2.6" />
      <path d="M19.2 19.2 25 25" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.7" fill="#fc5a1e" />
    </svg>
  );
}

// Sticky top bar. Gains a hairline and stronger blur once the page scrolls under it.
export function TopBar({ back = false, right, narrow = false }: { back?: boolean; right?: ReactNode; narrow?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled ? "bg-canvas/80 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl" : "bg-canvas"
      }`}
    >
      <div className={`mx-auto flex h-14 items-center gap-2 px-4 ${narrow ? "max-w-xl" : "max-w-2xl"}`}>
        {back && (
          <Link
            href="/"
            aria-label="Back"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-fill active:scale-95"
          >
            <ChevronLeft size={22} />
          </Link>
        )}
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="text-[15px] font-extrabold tracking-tight">First Seen</span>
        </Link>
        <div className="ml-auto">{right}</div>
      </div>
    </header>
  );
}

// Fixed action bar at the bottom of the screen, like a cart bar. Slides up when it appears.
export function BottomBar({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <motion.div
      initial={{ y: 96 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 34, delay: 0.1 }}
      className="fixed inset-x-0 bottom-0 z-30 bg-card/90 shadow-float backdrop-blur-xl"
    >
      <div className={`mx-auto flex gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 ${narrow ? "max-w-xl" : "max-w-2xl"}`}>
        {children}
      </div>
    </motion.div>
  );
}
