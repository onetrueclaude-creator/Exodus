import { defineConfig, devices } from "@playwright/test";

// Visual-regression project — isolated from the E2E config (no chain-resetting
// globalSetup, no pre-authed storageState). Deterministic canvas via software
// WebGL + fixed viewport/DPR. Baselines are committed PNGs; capture with
// `npm run test:visual:update` against a running app (operator step).
export default defineConfig({
  testDir: "./tests/visual",
  // serial + deterministic: one worker so screenshots never race or contend on ports
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixels: 120, animations: "disabled" },
  },
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "visual",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        launchOptions: { args: ["--use-gl=swiftshader", "--disable-gpu"] },
      },
    },
  ],
  webServer: {
    command: "cd apps/game && npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
