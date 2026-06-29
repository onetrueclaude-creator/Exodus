import { buildAssessmentPrompt } from "@/lib/playtest/prompt";
import { PLAYTEST_CATALOG } from "@/lib/playtest/catalog";
import type {
  Driver, ReasoningClient, TicketSink, PlaytestStep, PlaytestRunResult, Severity, UxTicket,
} from "@/lib/playtest/types";

interface RunOpts {
  runId: string;
  driver: Driver;
  model: ReasoningClient;
  sink: TicketSink;
  catalog?: PlaytestStep[];
}

/**
 * Drive each catalog step, assess its screen with the model, collect + persist
 * tickets. A step that throws becomes a blocker ticket and the loop continues —
 * one broken screen never aborts the playtest.
 */
export async function runPlaytest(opts: RunOpts): Promise<PlaytestRunResult> {
  const { runId, driver, model, sink } = opts;
  const catalog = opts.catalog ?? PLAYTEST_CATALOG;
  const all: UxTicket[] = [];

  for (const step of catalog) {
    let stepTickets: UxTicket[];
    try {
      if (step.path) await driver.goto(step.path);
      await driver.act(step);
      const cap = await driver.capture();
      const assessment = await model.assess(step.name, cap, buildAssessmentPrompt(step.name));
      stepTickets = assessment.tickets;
    } catch (e) {
      stepTickets = [{
        screen: step.name,
        severity: "blocker",
        issue: `step "${step.name}" crashed: ${e instanceof Error ? e.message : String(e)}`,
        suggestion: "Investigate — the playtester could not reach/assess this screen.",
      }];
    }
    all.push(...stepTickets);
    await sink.write(runId, stepTickets);
  }

  const bySeverity: Record<Severity, number> = { blocker: 0, confusing: 0, polish: 0 };
  for (const t of all) bySeverity[t.severity]++;
  return { steps: catalog.length, tickets: all, bySeverity };
}
