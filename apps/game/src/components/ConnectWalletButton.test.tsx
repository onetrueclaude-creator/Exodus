// apps/game/src/components/ConnectWalletButton.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const bind = vi.fn();
let status = "idle";
vi.mock("@/hooks/useBindWallet", () => ({ useBindWallet: () => ({ bind, status, error: null }) }));

import ConnectWalletButton from "./ConnectWalletButton";

beforeEach(() => { bind.mockReset(); status = "idle"; });

describe("ConnectWalletButton", () => {
  it("shows a connect affordance when Hollow-DB", () => {
    render(<ConnectWalletButton isOnChain={false} />);
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("shows On-chain state (no connect button) when already bound", () => {
    render(<ConnectWalletButton isOnChain={true} />);
    expect(screen.queryByRole("button", { name: /connect wallet/i })).not.toBeInTheDocument();
    expect(screen.getByText(/on-chain/i)).toBeInTheDocument();
  });
});
