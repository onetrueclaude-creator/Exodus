// W3 #60 — operator-gated live runner. Wires the real boundaries to the tested
// core. Requires: the app running at BASE_URL (default http://localhost:3000) and
// ANTHROPIC_API_KEY in the env. NOT run in CI. Usage: `npm run playtest`.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
// @/* resolves via apps/game/tsconfig.json when tsx runs from apps/game/.
// All imports share the same CJS context (apps/game has no "type":"module"),
// so named exports work correctly without ESM/CJS interop issues.
import { runPlaytest } from "@/lib/playtest/harness";
import { parseAssessment } from "@/lib/playtest/parse";
import type { PlaytestStep, UxTicket } from "@/lib/playtest/types";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.PLAYTEST_MODEL ?? "claude-opus-4-8";
const runId = process.env.PLAYTEST_RUN_ID ?? "manual";

if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY is required for the live playtest run.");
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const driver = {
    async goto(path: string) { await page.goto(BASE_URL + path, { waitUntil: "networkidle" }); },
    async act(step: PlaytestStep) {
      if (step.action === "openQuests") await page.getByRole("button", { name: /Quests/i }).click().catch(() => {});
      else if (step.action === "openReferral") await page.getByRole("button", { name: /Invite/i }).click().catch(() => {});
      else if (step.action === "openTerminal") await page.getByRole("button", { name: /Agent Terminal/i }).click().catch(() => {});
      await page.waitForTimeout(400);
    },
    async capture() {
      const buf = await page.screenshot();
      const domSummary = await page.locator("body").innerText().catch(() => "");
      return { screenshotBase64: buf.toString("base64"), domSummary: domSummary.slice(0, 4000) };
    },
  };

  const model = {
    async assess(screen: string, cap: { screenshotBase64: string; domSummary: string }, prompt: string) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/png", data: cap.screenshotBase64 } },
              { type: "text", text: `${prompt}\n\nDOM summary:\n${cap.domSummary}` },
            ],
          }],
        }),
      });
      if (!res.ok) throw new Error("anthropic " + res.status + " " + await res.text());
      const data = await res.json();
      const text = (data as { content?: { text?: string }[] })?.content?.[0]?.text ?? "";
      return parseAssessment(text, screen);
    },
  };

  const sink = {
    async write(rid: string, tickets: UxTicket[]) {
      if (!tickets.length) return;
      const dir = join("playtest-tickets", rid);
      await mkdir(dir, { recursive: true });
      const screen = tickets[0].screen;
      const md = tickets.map((t) => `## [${t.severity}] ${t.screen}\n**Issue:** ${t.issue}\n**Suggestion:** ${t.suggestion}\n`).join("\n");
      await writeFile(join(dir, `${screen}.md`), md, "utf8");
    },
  };

  const result = await runPlaytest({ runId, driver, model, sink });
  console.log(`Playtest ${runId}: ${result.steps} screens, ${result.tickets.length} tickets`, result.bySeverity);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
