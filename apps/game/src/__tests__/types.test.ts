import { describe, it, expect } from "vitest";
import type {
  Agent,
  Planet,
  HaikuMessage,
  DiplomaticState,
  BlockNode,
  FactionId,
  CellCoord,
  LatticeState,
} from "@/types";

describe("Type definitions", () => {
  it("should allow creating a valid Agent", () => {
    const agent: Agent = {
      id: "agent-001",
      userId: "user-001",
      position: { x: 100, y: 200 },
      tier: "opus",
      isPrimary: true,
      planets: [],
      createdAt: Date.now(),
      borderRadius: 130,
      borderPressure: 0,
      cpuPerTurn: 8,
      miningRate: 12,
      energyLimit: 40,
      stakedCpu: 0,
    };
    expect(agent.tier).toBe("opus");
    expect(agent.isPrimary).toBe(true);
  });

  it("should allow creating a valid Planet", () => {
    const planet: Planet = {
      id: "planet-001",
      agentId: "agent-001",
      content: "Hello world post",
      contentType: "post",
      isZeroKnowledge: false,
      createdAt: Date.now(),
    };
    expect(planet.isZeroKnowledge).toBe(false);
  });

  it("should allow creating a valid HaikuMessage", () => {
    const haiku: HaikuMessage = {
      id: "haiku-001",
      senderAgentId: "agent-001",
      text: "Morning dew glistens\nSilent whispers fill the air\nPeace in every leaf",
      syllables: [5, 7, 5],
      position: { x: 100, y: 200 },
      timestamp: Date.now(),
    };
    expect(haiku.syllables).toEqual([5, 7, 5]);
  });

  it("should allow creating a valid DiplomaticState", () => {
    const state: DiplomaticState = {
      agentA: "agent-001",
      agentB: "agent-002",
      exchangeCount: 7,
      opinion: 35,
      clarityLevel: 2,
      lastExchange: Date.now(),
    };
    expect(state.clarityLevel).toBe(2);
  });

  it("should allow creating a valid BlockNode", () => {
    const node: BlockNode = {
      id: "block-0-community",
      blockIndex: 0,
      ringIndex: 0,
      cx: -1,
      cy: -1,
      faction: "community",
      secureStrength: 100,
      ownerId: null,
      stakedCpu: 0,
      cumulativeSecures: 0,
    };
    expect(node.faction).toBe("community");
    expect(node.ringIndex).toBe(0);
    expect(node.ownerId).toBeNull();
  });

  it("should allow all FactionId values", () => {
    const factions: FactionId[] = ["community", "treasury", "founder", "pro-max"];
    expect(factions).toHaveLength(4);
  });

  it("should allow creating a valid CellCoord", () => {
    const coord: CellCoord = { cx: 3, cy: -2 };
    expect(coord.cx).toBe(3);
    expect(coord.cy).toBe(-2);
  });

  it("should allow creating a valid LatticeState", () => {
    const node: BlockNode = {
      id: "block-0-community",
      blockIndex: 0,
      ringIndex: 0,
      cx: -1,
      cy: -1,
      faction: "community",
      secureStrength: 100,
      ownerId: null,
      stakedCpu: 0,
      cumulativeSecures: 0,
    };
    const state: LatticeState = {
      blocknodes: { "block-0-community": node },
      gridNodes: {},
      totalBlocksMined: 1,
      visibleFactions: ["community"],
    };
    expect(state.totalBlocksMined).toBe(1);
    expect(state.visibleFactions).toContain("community");
  });
});
