import { CheckCircleIcon } from "@/components/Icons";

interface TimelinePhaseProps {
  quarter: string;
  title: string;
  items: string[];
  status: "completed" | "current" | "upcoming";
}

export default function TimelinePhase({ quarter, title, items, status }: TimelinePhaseProps) {
  const statusStyles = {
    completed: "border-accent-cyan/30 opacity-70",
    current: "border-accent-cyan shadow-glow",
    upcoming: "border-card-border opacity-50",
  };

  const dotStyles = {
    completed: "bg-accent-cyan/60",
    current: "bg-accent-cyan shadow-glow",
    upcoming: "bg-card-border",
  };

  return (
    <div className="flex gap-6">
      <div className="flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${dotStyles[status]}`} />
        <div className="w-px flex-1 bg-card-border" />
      </div>

      <div className={`glass-card p-6 mb-6 flex-1 border ${statusStyles[status]}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-mono text-accent-cyan/70">{quarter}</span>
          {status === "current" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan">
              You Are Here
            </span>
          )}
          {status === "completed" && (
            <CheckCircleIcon size={14} className="text-accent-cyan/60" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">{title}</h3>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="text-sm text-text-secondary flex items-start gap-2">
              <span className="text-text-muted mt-0.5">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
