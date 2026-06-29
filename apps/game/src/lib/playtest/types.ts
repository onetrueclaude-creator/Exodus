// W3 #60 — automated reasoning-playtest core types + injected boundaries.
// The core imports NEITHER Playwright NOR any model client; both arrive here as
// interfaces, so the whole loop is unit-tested against mocks.

export type Severity = "blocker" | "confusing" | "polish";

export interface UxTicket {
  screen: string;
  severity: Severity;
  issue: string;
  suggestion: string;
}

export interface UxAssessment {
  tickets: UxTicket[];
}

export interface ScreenCapture {
  screenshotBase64: string;
  domSummary: string; // visible text + key roles on the screen
}

export interface PlaytestStep {
  name: string;
  path?: string; // route to navigate to (optional — some steps only act)
  action?: "openQuests" | "openReferral" | "openTerminal" | "none";
}

export interface PlaytestRunResult {
  steps: number;
  tickets: UxTicket[];
  bySeverity: Record<Severity, number>;
}

/** Browser actions — Playwright in the live runner, a stub in tests. */
export interface Driver {
  goto(path: string): Promise<void>;
  act(step: PlaytestStep): Promise<void>;
  capture(): Promise<ScreenCapture>;
}

/** Vision-model assessment — fetch-based in the live runner, canned in tests. */
export interface ReasoningClient {
  assess(screen: string, cap: ScreenCapture, prompt: string): Promise<UxAssessment>;
}

/** Where tickets go — a file in the live runner, in-memory in tests. */
export interface TicketSink {
  write(runId: string, tickets: UxTicket[]): Promise<void>;
}
