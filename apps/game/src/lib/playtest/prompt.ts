// Pure prompt builder for the reasoning playtester. Deterministic given a screen
// name. Instructs the model to assess ONE screenshot and return STRICT JSON so
// parseAssessment can consume it reliably.

export function buildAssessmentPrompt(screen: string): string {
  return [
    `You are an expert product UX reviewer playtesting the screen "${screen}" of a `,
    `gamified blockchain app. Look ONLY at the provided screenshot and DOM summary.`,
    ``,
    `Assess it against these heuristics:`,
    `- Clarity: is the screen's purpose and the user's next action obvious?`,
    `- Dead-end: can the user proceed from here, or are they stuck with no clear next step?`,
    `- Confusing affordances: any mislabeled, ambiguous, or misleading controls?`,
    `- Broken / empty state: blank canvas, missing data, placeholder, or error text?`,
    `- Copy: anything unclear or off-tone (value-neutral — do not assess token price).`,
    ``,
    `Return STRICT JSON ONLY, no prose, in exactly this shape:`,
    `{"tickets":[{"severity":"blocker|confusing|polish","issue":"...","suggestion":"..."}]}`,
    `severity MUST be one of: blocker, confusing, polish. If the screen is fine, return {"tickets":[]}.`,
  ].join("\n");
}
