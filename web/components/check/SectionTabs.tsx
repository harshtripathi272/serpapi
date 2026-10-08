"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// Sticky section tabs, like a restaurant menu: the pill follows your scroll, and a tap jumps there.
export function SectionTabs({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  const bar = useRef<HTMLDivElement>(null);
  const jumping = useRef(false);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        if (jumping.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-128px 0px -55% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const pill = bar.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (pill && bar.current) {
      bar.current.scrollTo({ left: pill.offsetLeft - bar.current.clientWidth / 2 + pill.clientWidth / 2, behavior: "smooth" });
    }
  }, [active]);

  function jump(id: string) {
    setActive(id);
    jumping.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => (jumping.current = false), 700);
  }

  return (
    <div className="sticky top-14 z-20 -mx-4 bg-canvas/85 px-4 py-2.5 backdrop-blur-xl">
      <div ref={bar} className="no-scrollbar flex gap-1.5 overflow-x-auto pr-6 [mask-image:linear-gradient(to_right,black_88%,transparent)]">
        {sections.map((s) => (
          <button
            key={s.id}
            data-id={s.id}
            onClick={() => jump(s.id)}
            className="relative h-9 flex-none rounded-full px-4 text-[13px] font-semibold transition-colors active:scale-95"
          >
            {active === s.id ? (
              <motion.span
                layoutId="section-pill"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : (
              <span className="absolute inset-0 rounded-full bg-card ring-1 ring-line" />
            )}
            <span className={`relative ${active === s.id ? "text-white" : "text-sub"}`}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
