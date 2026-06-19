import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store";
import { edgeAlpha, EDGE_FADE_BLOCKS } from "@/lib/orbitalEdges";
import { SINGULARITY_ID } from "@/lib/orbitalSeats";

describe("gameStore — focusedNode slice", () => {
  beforeEach(() => {
    useGameStore.setState({ focusedNodeId: null });
  });

  it("sets and clears the focused node", () => {
    useGameStore.getState().setFocusedNode("node-a");
    expect(useGameStore.getState().focusedNodeId).toBe("node-a");
    useGameStore.getState().setFocusedNode(null);
    expect(useGameStore.getState().focusedNodeId).toBeNull();
  });

  it("accepts the synthetic Singularity id (decoupled from agents)", () => {
    useGameStore.getState().setFocusedNode(SINGULARITY_ID);
    expect(useGameStore.getState().focusedNodeId).toBe(SINGULARITY_ID);
    // The Singularity is intentionally NOT in the agents record.
    expect(useGameStore.getState().agents[SINGULARITY_ID]).toBeUndefined();
  });
});

describe("gameStore — interactionEdges slice", () => {
  beforeEach(() => {
    useGameStore.setState({ interactionEdges: [], turn: 0 });
  });

  it("appends an edge stamped with the current turn", () => {
    useGameStore.setState({ turn: 5 });
    useGameStore.getState().addInteractionEdge("home", SINGULARITY_ID);
    const edges = useGameStore.getState().interactionEdges;
    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual({ from: "home", to: SINGULARITY_ID, bornAt: 5 });
  });

  it("drops edges older than the fade window when a new edge is added", () => {
    // A stale edge born long ago, then advance the clock past the fade window.
    useGameStore.setState({
      interactionEdges: [{ from: "old", to: SINGULARITY_ID, bornAt: 0 }],
      turn: EDGE_FADE_BLOCKS + 1,
    });
    useGameStore.getState().addInteractionEdge("fresh", SINGULARITY_ID);
    const edges = useGameStore.getState().interactionEdges;
    expect(edges.map((e) => e.from)).toEqual(["fresh"]); // stale one pruned
  });

  it("keeps the list bounded to the last 50 edges", () => {
    for (let i = 0; i < 60; i++) {
      useGameStore.getState().addInteractionEdge(`n${i}`, SINGULARITY_ID);
    }
    expect(useGameStore.getState().interactionEdges).toHaveLength(50);
    // Oldest survivor is n10 (n0..n9 pushed out).
    expect(useGameStore.getState().interactionEdges[0].from).toBe("n10");
  });

  it("a stamped edge decays to 0 alpha across the fade window (store + edgeAlpha)", () => {
    useGameStore.setState({ turn: 0 });
    useGameStore.getState().addInteractionEdge("home", SINGULARITY_ID);
    const born = useGameStore.getState().interactionEdges[0].bornAt;
    const base = 0.9;
    expect(edgeAlpha(0 - born, base)).toBeCloseTo(0.9, 6); // fresh = full
    expect(edgeAlpha(EDGE_FADE_BLOCKS / 2 - born, base)).toBeCloseTo(0.45, 6); // half-faded
    expect(edgeAlpha(EDGE_FADE_BLOCKS - born, base)).toBe(0); // fully faded
  });
});
