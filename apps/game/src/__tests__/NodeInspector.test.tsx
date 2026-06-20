import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NodeInspector from "@/components/NodeInspector";
import { useGameStore } from "@/store";
import { SINGULARITY_ID } from "@/lib/orbitalSeats";
import type { ChainService } from "@/services/chainService";

/** A minimal fake chain service whose vault calls resolve to a passing flow. */
function fakeChain(overrides: Partial<ChainService> = {}): ChainService {
  return {
    getVaultRoot: vi.fn().mockResolvedValue({
      root_cid: "abcdef0123456789",
      atom_count: 64,
      shard_count: 16,
      replication_factor: 3,
    }),
    getVaultAssignment: vi.fn().mockResolvedValue({
      wallet_index: 0,
      owner: "owner",
      shards: [4],
    }),
    // A single 1-leaf shard → indices [0] → trivially provable client-side.
    getVaultShard: vi.fn().mockResolvedValue({ shard_id: 4, sub_units: ["d4"], count: 1 }),
    getVaultChallenge: vi.fn().mockResolvedValue({
      shard_id: 4,
      indices: [0],
      issued_block: 7,
      expires_block: 8,
      block_seed_hex: "00",
    }),
    submitVaultProof: vi.fn().mockResolvedValue({ accepted: true, cpu_credit: 50 }),
    getVaultStatus: vi.fn().mockResolvedValue({
      wallet_index: 0,
      shards: [4],
      last_pass_block: 12,
      secured_passes: 3,
    }),
    ...overrides,
  } as unknown as ChainService;
}

describe("NodeInspector — Singularity PoAW gate", () => {
  beforeEach(() => {
    useGameStore.setState({
      focusedNodeId: SINGULARITY_ID,
      agents: {
        self: { id: "self", isSelf: true, isPrimary: true } as never,
      },
      interactionEdges: [],
      turn: 0,
    });
  });

  it("renders the honest obedience-proof gate label, not a ZK badge", () => {
    render(<NodeInspector chainService={fakeChain()} />);
    expect(screen.getByText(/SINGULARITY/)).toBeInTheDocument();
    expect(screen.getByText(/obedience-proof gate/i)).toBeInTheDocument();
    expect(screen.getByText(/possession proof/i)).toBeInTheDocument();
    // Honesty guardrail: the gate must NOT claim to be a ZK proof.
    expect(screen.queryByText(/\bzk\b/i)).toBeNull();
    expect(screen.queryByText(/zero.?knowledge/i)).toBeNull();
    expect(screen.queryByText(/snark/i)).toBeNull();
  });

  it("shows the three ops", () => {
    render(<NodeInspector chainService={fakeChain()} />);
    expect(screen.getByRole("button", { name: "Secure" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stats" })).toBeInTheDocument();
  });

  it("Read shows root CID + assigned shards", async () => {
    const chain = fakeChain();
    render(<NodeInspector chainService={chain} />);
    fireEvent.click(screen.getByRole("button", { name: "Read" }));

    expect(chain.getVaultRoot).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/Vault read/)).toBeInTheDocument());
    expect(screen.getByText(/64 atoms/)).toBeInTheDocument();
    expect(screen.getByText(/your shards: 4/)).toBeInTheDocument();
  });

  it("Stats shows securing history", async () => {
    render(<NodeInspector chainService={fakeChain()} />);
    fireEvent.click(screen.getByRole("button", { name: "Stats" }));

    await waitFor(() => expect(screen.getByText(/Securing stats/)).toBeInTheDocument());
    expect(screen.getByText(/last pass: 12/)).toBeInTheDocument();
    expect(screen.getByText(/secured passes: 3/)).toBeInTheDocument();
  });

  it("Secure: an accepted proof shows the credit and draws the success edge", async () => {
    const chain = fakeChain();
    render(<NodeInspector chainService={chain} />);
    fireEvent.click(screen.getByRole("button", { name: "Secure" }));

    await waitFor(() => expect(screen.getByText(/Proof accepted/)).toBeInTheDocument());
    expect(chain.submitVaultProof).toHaveBeenCalled();
    expect(screen.getByText(/\+50 CPU credit/)).toBeInTheDocument();

    // Success signal: a decaying edge from the homenode to the Singularity.
    const edges = useGameStore.getState().interactionEdges;
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ from: "self", to: SINGULARITY_ID });
  });

  it("Secure: a rejected proof shows the reason and draws NO edge", async () => {
    const chain = fakeChain({
      submitVaultProof: vi.fn().mockResolvedValue({ accepted: false, cpu_credit: 0 }),
    });
    render(<NodeInspector chainService={chain} />);
    fireEvent.click(screen.getByRole("button", { name: "Secure" }));

    await waitFor(() => expect(screen.getByText(/rejected/i)).toBeInTheDocument());
    expect(useGameStore.getState().interactionEdges).toHaveLength(0);
  });

  it("ops are inert when the chain is offline", () => {
    render(<NodeInspector chainService={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    expect(screen.getByText(/chain offline/i)).toBeInTheDocument();
  });
});
