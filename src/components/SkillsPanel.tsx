"use client";

export default function SkillsPanel() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-text-primary mb-2">Skills</h2>
        <p className="text-sm text-text-muted">
          Skill trees unlock through research and diplomatic achievements.
        </p>
        <p className="text-xs text-text-muted mt-2">Coming soon in v2</p>
      </div>
    </div>
  );
}
