"use client";

export default function SkillsPanel() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="mb-4">
          <span className="text-3xl text-text-muted/20 block">{'\u2726'}</span>
        </div>
        <h2 className="text-xl font-heading font-bold text-text-primary mb-2 tracking-wide">Skills</h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Skill trees unlock through research and network trust achievements.
        </p>
        <div className="divider-gradient my-4 mx-auto max-w-[120px]" />
        <p className="text-xs text-text-muted/60 font-mono tracking-wider">COMING SOON IN V2</p>
      </div>
    </div>
  );
}
