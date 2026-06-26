import type { PlaytestStep } from "@/lib/playtest/types";

// The known journeys the playtester drives + assesses. Static + reviewable
// (YAGNI — the core flows, not every route). Dock-panel steps stay on /game.
export const PLAYTEST_CATALOG: PlaytestStep[] = [
  { name: "landing", path: "/", action: "none" },
  { name: "onboard", path: "/onboard", action: "none" },
  { name: "subscribe", path: "/subscribe", action: "none" },
  { name: "game", path: "/game", action: "none" },
  { name: "quests", action: "openQuests" },
  { name: "referral", action: "openReferral" },
  { name: "terminal", action: "openTerminal" },
];
