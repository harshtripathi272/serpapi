import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

export function Section({
  id,
  icon: Icon,
  title,
  aside,
  bare = false,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  aside?: ReactNode;
  bare?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id}>
      <Reveal>
        <div className="mb-2.5 flex items-center gap-2 px-1">
          <Icon size={17} className="text-sub" />
          <h2 className="text-[16px] font-bold tracking-tight">{title}</h2>
          {aside && <span className="ml-auto text-[13px] font-medium text-mute">{aside}</span>}
        </div>
        {bare ? children : <div className="rounded-3xl bg-card p-4 shadow-card">{children}</div>}
      </Reveal>
    </section>
  );
}
