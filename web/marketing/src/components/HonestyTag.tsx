// src/components/HonestyTag.tsx
//
// Small colored pill for the research article's honesty-ladder tags (SHIPS /
// SPECIFIED / DATED / FORBIDDEN — see /research, "Reading contract" + the §8
// Honesty Ledger). Used at structural anchor points only (section-heading
// suffixes, the ledger table, the reading contract) — running prose keeps the
// source's own <strong> emphasis instead of a pill per occurrence.
//
// Colors reuse existing theme tokens only (accent-cyan, accent-purple,
// text-muted, red-400) — no new palette values introduced.

interface HonestyTagProps {
  tag: "SHIPS" | "SPECIFIED" | "DATED" | "FORBIDDEN";
  className?: string;
}

const STYLES: Record<HonestyTagProps["tag"], string> = {
  SHIPS: "text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10",
  SPECIFIED: "text-accent-purple border-accent-purple/30 bg-accent-purple/10",
  DATED: "text-text-muted border-text-muted/30 bg-text-muted/10",
  FORBIDDEN: "text-red-400 border-red-400/30 bg-red-400/10",
};

export default function HonestyTag({ tag, className = "" }: HonestyTagProps) {
  return (
    <span
      className={`inline-block text-[10px] leading-none font-mono font-semibold uppercase tracking-wide px-1.5 py-1 rounded border align-middle ${STYLES[tag]} ${className}`}
    >
      {tag}
    </span>
  );
}
