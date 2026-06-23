// apps/game/src/app/subscribe/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Capture the onBound passed to the hook so we can simulate a successful bind.
let lastOnBound: (() => void) | undefined;
const bind = vi.fn(async () => { lastOnBound?.(); });
let hookState: { status: string; error: string | null } = { status: "idle", error: null };
vi.mock("@/hooks/useBindWallet", () => ({
  useBindWallet: (onBound?: () => void) => { lastOnBound = onBound; return { bind, status: hookState.status, error: hookState.error }; },
}));
// wallet-adapter must be mockable per repo convention (the hook would call it otherwise)
vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => ({ connected: false, publicKey: null, signMessage: undefined, connect: vi.fn() }) }));

import SubscribePage from "./page";

beforeEach(() => {
  push.mockReset(); bind.mockReset(); lastOnBound = undefined; hookState = { status: "idle", error: null };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
});

describe("SubscribePage — wallet step (C)", () => {
  it("shows the wallet panel after a tier is chosen (no nav yet)", async () => {
    render(<SubscribePage />);
    fireEvent.click(screen.getByRole("button", { name: /community/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /skip for now/i })).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /connect phantom/i })).toBeInTheDocument();
  });

  it("Skip for now → /game", async () => {
    render(<SubscribePage />);
    fireEvent.click(screen.getByRole("button", { name: /community/i }));
    await screen.findByRole("button", { name: /skip for now/i });
    fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
    expect(push).toHaveBeenCalledWith("/game");
  });

  it("Connect Phantom → bind → /game on success", async () => {
    render(<SubscribePage />);
    fireEvent.click(screen.getByRole("button", { name: /community/i }));
    await screen.findByRole("button", { name: /connect phantom/i });
    fireEvent.click(screen.getByRole("button", { name: /connect phantom/i }));
    await waitFor(() => { expect(bind).toHaveBeenCalled(); expect(push).toHaveBeenCalledWith("/game"); });
  });

  it("surfaces a bind error and keeps the panel", async () => {
    hookState = { status: "error", error: "binding failed" };
    render(<SubscribePage />);
    fireEvent.click(screen.getByRole("button", { name: /community/i }));
    await screen.findByText(/binding failed/i);
    expect(screen.getByRole("button", { name: /skip for now/i })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("contains no profit/earnings/airdrop language in the wallet panel", async () => {
    render(<SubscribePage />);
    fireEvent.click(screen.getByRole("button", { name: /community/i }));
    await screen.findByRole("button", { name: /connect phantom/i });
    const body = document.body.textContent?.toLowerCase() ?? "";
    for (const banned of ["airdrop", "earn", "profit", "reward", "return on"]) {
      expect(body).not.toContain(banned);
    }
  });
});
