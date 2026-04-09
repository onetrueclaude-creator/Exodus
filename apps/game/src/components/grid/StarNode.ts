import { Graphics, Text, Container } from "pixi.js";
import type { Agent, FogLevel, BlockNode } from "@/types";
import { CELL_SIZE, cellToPixel } from "@/lib/lattice";

const TIER_RADIUS = { opus: 10, sonnet: 7, haiku: 4 };
const TIER_COLOR = { opus: 0xf97316, sonnet: 0x9333ea, haiku: 0xffffff };

const FOG_ALPHA: Record<FogLevel, number> = {
  clear: 1.0,
  hazy: 0.6,
  fogged: 0.25,
  hidden: 0.06,
};

function drawDiffractionSpikes(gfx: Graphics, length: number, color: number, alpha: number) {
  // 4-pointed cross rays — Neural Lattice signature aesthetic
  const thickness = Math.max(0.5, length * 0.04);

  // Horizontal spike
  gfx.setStrokeStyle({ width: thickness, color, alpha: alpha * 0.6 });
  gfx.moveTo(-length, 0);
  gfx.lineTo(length, 0);
  gfx.stroke();

  // Vertical spike
  gfx.setStrokeStyle({ width: thickness, color, alpha: alpha * 0.6 });
  gfx.moveTo(0, -length);
  gfx.lineTo(0, length);
  gfx.stroke();

  // Thinner diagonal rays (45°) — subtle secondary spikes
  const diagLen = length * 0.5;
  gfx.setStrokeStyle({ width: thickness * 0.5, color, alpha: alpha * 0.25 });
  gfx.moveTo(-diagLen, -diagLen);
  gfx.lineTo(diagLen, diagLen);
  gfx.stroke();

  gfx.setStrokeStyle({ width: thickness * 0.5, color, alpha: alpha * 0.25 });
  gfx.moveTo(diagLen, -diagLen);
  gfx.lineTo(-diagLen, diagLen);
  gfx.stroke();
}

export function createStarNode(agent: Agent, fogLevel: FogLevel): Container {
  const container = new Container();
  container.position.set(agent.position.x, agent.position.y);

  const alpha = FOG_ALPHA[fogLevel];
  const radius = TIER_RADIUS[agent.tier];
  const isUnclaimed = !agent.userId;
  const showColor = !isUnclaimed && (fogLevel === "clear" || fogLevel === "hazy");
  const color = isUnclaimed ? 0x3a4556 : showColor ? TIER_COLOR[agent.tier] : 0x3a4556;

  // Hit area (invisible, larger than visual for easier clicking)
  const hitArea = new Graphics();
  hitArea.circle(0, 0, radius * 3);
  hitArea.fill({ color: 0x000000, alpha: 0.001 });
  container.addChild(hitArea);

  // Soft outer glow — large diffuse halo
  const halo = new Graphics();
  halo.circle(0, 0, radius * 2.5);
  halo.fill({ color, alpha: alpha * 0.05 });
  container.addChild(halo);

  // Inner glow
  const glow = new Graphics();
  glow.circle(0, 0, radius * 1.2);
  glow.fill({ color, alpha: alpha * 0.12 });
  container.addChild(glow);

  // Diffraction spikes — the Neural Lattice aesthetic
  const spikes = new Graphics();
  drawDiffractionSpikes(spikes, radius * 2.2, color, alpha);
  container.addChild(spikes);

  // Core — small bright disc
  const core = new Graphics();
  core.circle(0, 0, radius * 0.35);
  core.fill({ color, alpha: alpha * 0.8 });
  container.addChild(core);

  // Hot white center point
  const hotCenter = new Graphics();
  hotCenter.circle(0, 0, radius * 0.15);
  hotCenter.fill({ color: 0xffffff, alpha });
  container.addChild(hotCenter);

  // Agent control indicator — small digital helmet icon above the star
  if (showColor && agent.userId) {
    const iconSize = radius * 0.5;
    const icon = new Graphics();
    // Visor shape — rounded rectangle for digital helmet look
    icon.roundRect(-iconSize, -iconSize * 0.6, iconSize * 2, iconSize * 1.2, iconSize * 0.3);
    icon.fill({ color, alpha: alpha * 0.5 });
    icon.stroke({ width: 0.8, color: 0xffffff, alpha: alpha * 0.3 });
    // Visor slit
    icon.setStrokeStyle({ width: 0.6, color: 0xffffff, alpha: alpha * 0.6 });
    icon.moveTo(-iconSize * 0.6, 0);
    icon.lineTo(iconSize * 0.6, 0);
    icon.stroke();
    icon.position.set(0, -(radius * 0.8 + iconSize));
    container.addChild(icon);
  }

  // Hover ring (hidden by default)
  const hoverRing = new Graphics();
  hoverRing.circle(0, 0, radius * 1.4);
  hoverRing.stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
  hoverRing.alpha = 0;
  container.addChild(hoverRing);

  // Username label (only if clear or hazy)
  if (agent.username && (fogLevel === "clear" || fogLevel === "hazy")) {
    const displayName = agent.isPrimary ? `★ ${agent.username}` : agent.username;
    const label = new Text({
      text: displayName,
      style: {
        fontFamily: "Inter, sans-serif",
        fontSize: agent.isPrimary ? 11 : 10,
        fill: agent.isPrimary ? 0xffd700 : 0x64748b,
        align: "center",
      },
    });
    label.anchor.set(0.5, 0);
    label.position.set(0, radius * 0.6 + 6);
    label.alpha = alpha * (agent.isPrimary ? 0.9 : 0.6);
    container.addChild(label);
  }

  container.eventMode = "static";
  container.cursor = "pointer";

  // Hover effects
  container.on("pointerover", () => {
    hoverRing.alpha = 1;
    spikes.alpha = 1.3;
    container.scale.set(1.1);
  });

  container.on("pointerout", () => {
    hoverRing.alpha = 0;
    spikes.alpha = 1;
    container.scale.set(1);
  });

  // Store agent ID for click handling
  container.label = agent.id;

  return container;
}

/** Modulate container alpha for hover-dim effect.
 *  Pure function — no React, no store. */
export function setNodeDimmed(container: Container, dimmed: boolean): void {
  container.alpha = dimmed ? 0.4 : 1.0;
}

/** Blocknode colors by faction */
const BLOCKNODE_COLORS: Record<string, number> = {
  community: 0x0d9488, // teal
  treasury: 0xdc2680,  // pink (Machines)
  founder: 0xf59e0b,   // amber
  "pro-max": 0x3b82f6, // blue (Professional)
};

/**
 * Creates a PixiJS Container representing a blocknode.
 * Position is set to the pixel center of the node's cell.
 * Size and glow scale with secureStrength (100=max, 1=min).
 * Unclaimed nodes are dimmer; claimed nodes have a claim ring.
 *
 * @param node The blocknode to render
 * @param isVisible Whether this node's faction is visible (affects fog)
 */
export function createBlockNode(
  node: BlockNode,
  isVisible: boolean,
  currentUserId?: string,
  empireColor?: number
): Container {
  const container = new Container();

  const { px, py } = cellToPixel(node.cx, node.cy);
  container.position.set(px, py);

  const color = BLOCKNODE_COLORS[node.faction] ?? 0xffffff;
  const strengthFraction = Math.min(1, node.secureStrength / 100);

  // Scale radius 3px (min strength) to 8px (max strength)
  const baseRadius = 3 + strengthFraction * 5;
  const alpha = isVisible ? (node.ownerId ? 0.9 : 0.45) : 0.12;

  // Explicit hit area — added first so it sits beneath visual layers but still catches events
  const hitArea = new Graphics();
  hitArea.circle(0, 0, baseRadius * 3);
  hitArea.fill({ color: 0x000000, alpha: 0.001 });
  container.addChild(hitArea);

  // Outer glow halo — scales with strength
  const halo = new Graphics();
  halo.circle(0, 0, baseRadius * 3);
  halo.fill({ color, alpha: alpha * 0.06 });
  container.addChild(halo);

  // Mid glow
  const midGlow = new Graphics();
  midGlow.circle(0, 0, baseRadius * 1.6);
  midGlow.fill({ color, alpha: alpha * 0.15 });
  container.addChild(midGlow);

  // Diffraction spikes (same style as star nodes but smaller)
  const spikeLen = baseRadius * 1.8;
  const spikes = new Graphics();
  const thickness = Math.max(0.5, spikeLen * 0.06);
  spikes.setStrokeStyle({ width: thickness, color, alpha: alpha * 0.5 });
  spikes.moveTo(-spikeLen, 0);
  spikes.lineTo(spikeLen, 0);
  spikes.stroke();
  spikes.setStrokeStyle({ width: thickness, color, alpha: alpha * 0.5 });
  spikes.moveTo(0, -spikeLen);
  spikes.lineTo(0, spikeLen);
  spikes.stroke();
  container.addChild(spikes);

  // Core circle
  const core = new Graphics();
  core.circle(0, 0, baseRadius * 0.5);
  core.fill({ color, alpha: alpha * 0.85 });
  container.addChild(core);

  // Hot white center
  const hotCenter = new Graphics();
  hotCenter.circle(0, 0, baseRadius * 0.2);
  hotCenter.fill({ color: 0xffffff, alpha: alpha });
  container.addChild(hotCenter);

  // Claim ring — shown when node is owned
  if (node.ownerId) {
    const claimRing = new Graphics();
    claimRing.circle(0, 0, baseRadius * 1.2);
    claimRing.stroke({ width: 1, color, alpha: alpha * 0.7 });
    container.addChild(claimRing);
  }

  // Homenode ring — subscription-tier-colored border for the current player's own node
  if (
    node.ownerId &&
    currentUserId &&
    node.ownerId === currentUserId &&
    empireColor !== undefined
  ) {
    const homeRing = new Graphics();
    homeRing.circle(0, 0, baseRadius * 1.8);
    homeRing.stroke({ width: 2, color: empireColor, alpha: 0.85 });
    container.addChild(homeRing);
  }

  // Cell coordinate label — always shown above the node for navigation
  const coordLabel = new Text({
    text: `(${node.cx},${node.cy})`,
    style: {
      fontFamily: "Inter, monospace",
      fontSize: 7,
      fill: color,
      align: "center",
    },
  });
  coordLabel.anchor.set(0.5, 1);
  coordLabel.position.set(0, -(baseRadius + 4));
  coordLabel.alpha = isVisible ? alpha * 0.65 : 0.05;
  container.addChild(coordLabel);

  // SecureStrength label — only for claimed nodes near full strength
  if (node.ownerId && node.secureStrength > 50) {
    const label = new Text({
      text: `${Math.round(node.secureStrength)}×`,
      style: {
        fontFamily: "Inter, monospace",
        fontSize: 8,
        fill: color,
        align: "center",
      },
    });
    label.anchor.set(0.5, 0);
    label.position.set(0, baseRadius + 3);
    label.alpha = alpha * 0.7;
    container.addChild(label);
  }

  // Make interactive
  container.eventMode = "static";
  container.cursor = "pointer";

  // Hover ring (hidden by default)
  const hoverRing = new Graphics();
  hoverRing.circle(0, 0, baseRadius * 1.8);
  hoverRing.stroke({ width: 1, color: 0xffffff, alpha: 0.4 });
  hoverRing.alpha = 0;
  container.addChild(hoverRing);

  container.on("pointerover", () => {
    hoverRing.alpha = 1;
    container.scale.set(1.1);
  });

  container.on("pointerout", () => {
    hoverRing.alpha = 0;
    container.scale.set(1);
  });

  // Store node ID for click handling
  container.label = node.id;

  return container;
}
