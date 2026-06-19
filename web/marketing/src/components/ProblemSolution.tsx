interface Point {
  title: string;
  description: string;
}

interface ProblemSolutionProps {
  problems: Point[];
  solutions: Point[];
}

export default function ProblemSolution({ problems, solutions }: ProblemSolutionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="glass-card p-8 border-l-2 border-l-red-500/40">
        <h3 className="text-xl font-bold text-text-primary mb-6">The Problem</h3>
        <ul className="space-y-5">
          {problems.map((p) => (
            <li key={p.title}>
              <p className="text-sm font-semibold text-text-primary">{p.title}</p>
              <p className="text-sm text-text-secondary mt-1">{p.description}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-card p-8 border-l-2 border-l-accent-cyan/60">
        <h3 className="text-xl font-bold text-text-primary mb-6">Our Solution</h3>
        <ul className="space-y-5">
          {solutions.map((s) => (
            <li key={s.title}>
              <p className="text-sm font-semibold text-accent-cyan">{s.title}</p>
              <p className="text-sm text-text-secondary mt-1">{s.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
