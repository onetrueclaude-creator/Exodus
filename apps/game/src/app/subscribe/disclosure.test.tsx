import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/useBindWallet", () => ({
  useBindWallet: () => ({ bind: vi.fn(), status: "idle", error: null }),
}));

import SubscribePage from "./page";

describe("subscribe page disclosure", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("renders the verbatim testnet valueless disclaimer", () => {
    render(<SubscribePage />);
    expect(screen.getByText(/valueless token/i)).toBeInTheDocument();
    expect(screen.getByText(/is not an investment/i)).toBeInTheDocument();
  });
});
