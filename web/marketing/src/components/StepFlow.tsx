interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface StepFlowProps {
  steps: Step[];
}

export default function StepFlow({ steps }: StepFlowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
      {steps.map((step, i) => (
        <div key={step.title} className="relative flex flex-col items-center text-center px-6 py-8">
          {/* Connecting line (hidden on mobile, hidden after last item) */}
          {i < steps.length - 1 && (
            <div className="hidden lg:block absolute top-14 left-[calc(50%+28px)] right-0 h-px bg-gradient-to-r from-accent-cyan/40 to-accent-purple/20" />
          )}

          {/* Step number badge */}
          <div className="w-14 h-14 rounded-full border border-accent-cyan/30 flex items-center justify-center mb-4 relative">
            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center text-xs font-mono text-accent-cyan">
              {i + 1}
            </span>
            <span className="text-accent-cyan">{step.icon}</span>
          </div>

          <h3 className="text-base font-semibold text-text-primary mb-2">{step.title}</h3>
          <p className="text-sm text-text-secondary max-w-[220px]">{step.description}</p>
        </div>
      ))}
    </div>
  );
}
