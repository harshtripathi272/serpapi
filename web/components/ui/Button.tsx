"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

const VARIANTS = {
  primary: "bg-brand text-white shadow-[0_6px_16px_-6px_rgb(252_90_30/0.55)] hover:bg-brand-press disabled:bg-mute disabled:shadow-none",
  secondary: "bg-card text-ink ring-1 ring-line hover:bg-fill",
  dark: "bg-ink text-white hover:bg-black",
  ghost: "bg-transparent text-sub hover:bg-fill",
} as const;

const SIZES = {
  lg: "h-14 px-6 text-[15px] rounded-2xl",
  md: "h-11 px-4 text-sm rounded-xl",
  sm: "h-9 px-3 text-[13px] rounded-lg",
  icon: "h-11 w-11 rounded-xl",
  iconLg: "h-14 w-14 flex-none rounded-2xl",
} as const;

type Props = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  children: ReactNode;
};

// Every tappable thing gives the same physical response: a quick press-in and a springy release.
export function Button({ variant = "primary", size = "md", className = "", children, ...rest }: Props) {
  return (
    <motion.button
      whileTap={rest.disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={`inline-flex select-none items-center justify-center gap-2 font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
