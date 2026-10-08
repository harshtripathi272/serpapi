"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// Two or three options with a pill that slides to the chosen one.
export function Segmented<T extends string>({
  id,
  value,
  options,
  onChange,
  className = "",
}: {
  id: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex rounded-xl bg-fill p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-colors duration-200 ${
              active ? "text-ink" : "text-sub hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-card shadow-[0_1px_3px_rgb(16_17_20/0.12)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
