/**
 * DePIN S3b cosmetic — the disk-disclosure strip reserves a right gutter so its
 * text clears the floating SCORES panel (ScoresWidget, absolute right-2 w-[160px])
 * at wide viewports. Regression guard for the class; the visual clearance is
 * confirmed manually (see plan Step 3).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ResourceBar from "@/components/ResourceBar";

vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => ({ publicKey: null }) }));

describe("ResourceBar — disclosure gutter", () => {
  it("reserves a right gutter so the disclosure clears the SCORES panel lane", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    render(<ResourceBar />);
    expect(screen.getByTestId("disk-disclosure").className).toContain("pr-[184px]");
  });
});
