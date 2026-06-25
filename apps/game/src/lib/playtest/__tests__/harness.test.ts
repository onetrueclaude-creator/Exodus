import { describe, it, expect, vi } from "vitest";
import { runPlaytest } from "@/lib/playtest/harness";
import { PLAYTEST_CATALOG } from "@/lib/playtest/catalog";
import type { Driver, ReasoningClient, TicketSink, UxAssessment } from "@/lib/playtest/types";

function mkDriver(): Driver {
  return {
    goto: vi.fn(async () => {}),
    act: vi.fn(async () => {}),
    capture: vi.fn(async () => ({ screenshotBase64: "img", domSummary: "dom" })),
  };
}

describe("runPlaytest", () => {
  it("visits every catalog step and assesses each screen once", async () => {
    const driver = mkDriver();
    const model: ReasoningClient = { assess: vi.fn(async () => ({ tickets: [] })) };
    const sink: TicketSink = { write: vi.fn(async () => {}) };
    const res = await runPlaytest({ runId: "r1", driver, model, sink });
    expect(res.steps).toBe(PLAYTEST_CATALOG.length);
    expect((model.assess as ReturnType<typeof vi.fn>).mock.calls.length).toBe(PLAYTEST_CATALOG.length);
    expect((driver.capture as ReturnType<typeof vi.fn>).mock.calls.length).toBe(PLAYTEST_CATALOG.length);
  });

  it("aggregates tickets and counts by severity", async () => {
    const driver = mkDriver();
    const assessment: UxAssessment = {
      tickets: [
        { screen: "s", severity: "blocker", issue: "i", suggestion: "x" },
        { screen: "s", severity: "polish", issue: "j", suggestion: "y" },
      ],
    };
    const model: ReasoningClient = { assess: vi.fn(async () => assessment) };
    const sink: TicketSink = { write: vi.fn(async () => {}) };
    const res = await runPlaytest({ runId: "r", driver, model, sink, catalog: [{ name: "s", path: "/" }] });
    expect(res.tickets).toHaveLength(2);
    expect(res.bySeverity.blocker).toBe(1);
    expect(res.bySeverity.polish).toBe(1);
    expect(res.bySeverity.confusing).toBe(0);
    expect((sink.write as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("a thrown step becomes a blocker ticket and the loop continues", async () => {
    const driver = mkDriver();
    (driver.capture as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));
    const model: ReasoningClient = { assess: vi.fn(async () => ({ tickets: [] })) };
    const sink: TicketSink = { write: vi.fn(async () => {}) };
    const res = await runPlaytest({
      driver, model, sink, runId: "r",
      catalog: [{ name: "bad", path: "/x" }, { name: "good", path: "/y" }],
    });
    expect(res.steps).toBe(2); // did not abort
    const blockers = res.tickets.filter((t) => t.severity === "blocker");
    expect(blockers.length).toBe(1);
    expect(blockers[0].screen).toBe("bad");
    expect(blockers[0].issue).toMatch(/boom|crash/i);
    // the good step still got assessed
    expect((model.assess as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});
