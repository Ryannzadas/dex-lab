import { TYPE_INFO, type TypeName } from "@/lib/types";

export function TypeBadge({ type, size = "md" }: { type: TypeName; size?: "sm" | "md" }) {
  const info = TYPE_INFO[type];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium text-white shadow-[inset_0_-1px_0_rgb(0_0_0/0.15)] ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
      style={{ background: info.color, textShadow: "0 1px 1px rgb(0 0 0 / 0.35)" }}
    >
      {info.pt}
    </span>
  );
}

export function ArrowIcon({ direction = "right" }: { direction?: "right" | "down" | "up-right" }) {
  const d = {
    right: "M5 12h14M13 6l6 6-6 6",
    down: "M12 5v14M6 13l6 6 6-6",
    "up-right": "M7 17 17 7M9 7h8v8",
  }[direction];
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-3xl border border-line bg-surface p-5 backdrop-blur-xl sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {children && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{children}</p>}
    </div>
  );
}
