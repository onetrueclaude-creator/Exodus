import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useGameStore } from "@/store";
import ReferralPanel from "./ReferralPanel";

beforeEach(() => {
  useGameStore.getState().reset();
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
      code: "abc123",
      kycVerified: false,
      referralsMade: 0,
      qualifiedReferrals: 0,
    }),
  })));
});

describe("ReferralPanel", () => {
  it("renders nothing when the referral dock panel is not active", () => {
    useGameStore.setState({ activeDockPanel: null });
    const { container } = render(<ReferralPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the referral code and Howey-critical disclosures when active", async () => {
    useGameStore.setState({ activeDockPanel: "referral" });
    render(<ReferralPanel />);
    await waitFor(() => expect(screen.getByText("abc123")).toBeInTheDocument());
    // Howey-critical copy — rewards are never cash
    expect(screen.getByText(/never cash/i)).toBeInTheDocument();
    // DISCLOSURES.testnetToken — AGNTC is a valueless token
    expect(screen.getByText(/valueless token/i)).toBeInTheDocument();
  });

  it("shows KYC warning when kycVerified is false", async () => {
    useGameStore.setState({ activeDockPanel: "referral" });
    render(<ReferralPanel />);
    await waitFor(() => expect(screen.getByText("abc123")).toBeInTheDocument());
    expect(screen.getByText(/identity verification|KYC/i)).toBeInTheDocument();
  });
});
