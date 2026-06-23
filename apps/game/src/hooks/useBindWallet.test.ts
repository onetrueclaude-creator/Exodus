// apps/game/src/hooks/useBindWallet.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const useWallet = vi.fn();
vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => useWallet() }));

import { useBindWallet } from "./useBindWallet";

beforeEach(() => {
  vi.restoreAllMocks();
  useWallet.mockReturnValue({
    connected: true,
    publicKey: { toBase58: () => "PUBKEY" },
    signMessage: vi.fn(async () => new Uint8Array(64)),
    connect: vi.fn(async () => {}),
  });
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "m", nonce: "n" }) }) // challenge
    .mockResolvedValueOnce({ ok: true, json: async () => ({ isOnChain: true }) }),          // bind
  );
});

describe("useBindWallet", () => {
  it("runs challenge → signMessage → bind and reports success", async () => {
    const { result } = renderHook(() => useBindWallet());
    await act(async () => { await result.current.bind(); });
    expect(result.current.status).toBe("bound");
    expect((globalThis.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      "/api/wallet/challenge", expect.objectContaining({ method: "POST" }),
    );
    expect((globalThis.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      "/api/wallet/bind", expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces an error when bind fails", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "m", nonce: "n" }) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: "bad" }) }),
    );
    const { result } = renderHook(() => useBindWallet());
    await act(async () => { await result.current.bind(); });
    expect(result.current.status).toBe("error");
  });
});
