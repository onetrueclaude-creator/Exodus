"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { useGameStore } from '@/store';
import { createGridBackground, createFactionBackground } from './grid/GridBackground';
import { createStarNode, setNodeDimmed } from './grid/StarNode';
import { createConnectionLine } from './grid/ConnectionLine';
import { createNebulaBg } from './grid/NebulaBg';
import { createEmpireBorders } from './grid/EmpireBorders';
import { getDistance, getConnectionStrength } from '@/lib/proximity';
import { lerp, easeOutCubic } from '@/lib/spawnAnimation';
import type { Agent, FogLevel } from '@/types';
import { classifyCell, FACTION_COLORS, type Faction } from '@/lib/spiral/SpiralClassifier';

const GRID_EXTENT = 10000;
const CELL_SIZE = 60;  // world-unit size of each macro grid cell (matches GridBackground default)
const CONNECTION_THRESHOLD = 400;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

interface GalaxyGridProps {
  onSelectAgent?: (agentId: string) => void;
  onDeselect?: () => void;
}

export default function GalaxyGrid({ onSelectAgent, onDeselect }: GalaxyGridProps) {
  const agents = useGameStore((s) => s.agents);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const turn = useGameStore((s) => s.turn);
  const setCamera = useGameStore((s) => s.setCamera);
  const empireColor = useGameStore((s) => s.empireColor);
  const userFaction = useGameStore((s) => s.userFaction);

  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const hasCentered = useRef(false);
  const bordersRef = useRef<Graphics | null>(null);
  const userFactionRef = useRef(userFaction);
  /** Tracks when a node was last tapped — canvas pointerup uses this to avoid deselecting on node clicks */
  const lastNodeTapMsRef = useRef(0);

  /** Classify an agent's grid cell: flips y to convert PixiJS y-down → SpiralClassifier math y-up */
  const classifyAgentCell = useCallback((agent: Agent) => {
    const gx = Math.round(agent.position.x / CELL_SIZE);
    const gyMath = -Math.round(agent.position.y / CELL_SIZE);
    return classifyCell(gx, gyMath, userFactionRef.current);
  }, []);

  const [zoom, setZoom] = useState(1);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const initApp = useCallback(async () => {
    if (!containerRef.current || appRef.current) return;

    const app = new Application();
    await app.init({
      background: 0x060610,
      resizeTo: containerRef.current,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    containerRef.current.appendChild(app.canvas);
    appRef.current = app;

    const world = new Container();
    app.stage.addChild(world);
    worldRef.current = world;

    // Layer 0: Nebula background (soft faction-colored zones + star dust)
    world.addChild(createNebulaBg());

    // Layer 1: Faction background (hidden until formally introduced)
    const factionBg = createFactionBackground(GRID_EXTENT, GRID_EXTENT, userFactionRef.current);
    factionBg.visible = false;
    world.addChild(factionBg);

    // Layer 2: Grid lines
    world.addChild(createGridBackground(GRID_EXTENT, GRID_EXTENT));

    // Pan & zoom
    let dragging = false;
    let dragStart = { x: 0, y: 0 };

    const syncCamera = () => {
      setCamera({ x: world.position.x, y: world.position.y }, world.scale.x);
      setZoom(world.scale.x);
    };

    let hasMoved = false;

    app.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      dragging = true;
      hasMoved = false;
      dragStart = { x: e.clientX - world.position.x, y: e.clientY - world.position.y };
    });

    app.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      // Update cursor world coordinates
      const rect = app.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldX = Math.round((screenX - world.position.x) / world.scale.x);
      const worldY = Math.round((screenY - world.position.y) / world.scale.x);
      setCursorCoords({ x: worldX, y: worldY });

      if (!dragging) return;
      const dx = e.clientX - (dragStart.x + world.position.x);
      const dy = e.clientY - (dragStart.y + world.position.y);
      if (Math.sqrt(dx * dx + dy * dy) > 5) hasMoved = true;
      world.position.set(e.clientX - dragStart.x, e.clientY - dragStart.y);
    });

    app.canvas.addEventListener('pointerup', () => {
      if (dragging) syncCamera();
      // If it was a click (not a drag) and no node was just tapped, deselect
      if (!hasMoved && Date.now() - lastNodeTapMsRef.current > 100) {
        onDeselect?.();
      }
      dragging = false;
      hasMoved = false;
    });
    app.canvas.addEventListener('pointerleave', () => {
      if (dragging) syncCamera();
      dragging = false;
      setCursorCoords(null);
    });

    app.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const oldScale = world.scale.x;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldScale * scaleFactor));

      // Zoom toward cursor position
      const rect = app.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      world.position.x = mouseX - (mouseX - world.position.x) * (newScale / oldScale);
      world.position.y = mouseY - (mouseY - world.position.y) * (newScale / oldScale);
      world.scale.set(newScale, newScale);

      syncCamera();
    }, { passive: false });

    // Signal that PixiJS is ready — triggers rendering effects
    setAppReady(true);

    return app;
  }, [setCamera]);

  // Initialize PixiJS
  useEffect(() => {
    initApp();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [initApp]);

  // Center on player agent (or origin if no player) — waits for app ready
  useEffect(() => {
    if (!appReady || hasCentered.current) return;

    const world = worldRef.current;
    const app = appRef.current;
    if (!world || !app) return;

    hasCentered.current = true;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    const viewer = currentAgentId ? agents[currentAgentId] : null;
    const targetX = viewer ? viewer.position.x : 0;
    const targetY = viewer ? viewer.position.y : 0;

    // Start zoomed in so genesis nodes are clearly visible
    const initialZoom = 4;
    world.scale.set(initialZoom, initialZoom);
    world.position.set(centerX - targetX * initialZoom, centerY - targetY * initialZoom);
    setCamera({ x: world.position.x, y: world.position.y }, initialZoom);
    setZoom(initialZoom);
  }, [appReady, agents, currentAgentId, setCamera]);

  // Re-render stars when agents change — also waits for app ready
  useEffect(() => {
    if (!appReady) return;

    const world = worldRef.current;
    if (!world) return;

    // Clear previous star nodes (keep nebula at 0, faction bg at 1, grid lines at 2)
    while (world.children.length > 3) {
      world.removeChildAt(3);
    }

    const agentList = Object.values(agents);
    const viewer = currentAgentId ? agents[currentAgentId] : null;

    const addClickableStarNode = (agent: Agent, fogLevel: FogLevel, faction?: Faction) => {
      const node = createStarNode(agent, fogLevel, faction ?? userFactionRef.current);
      node.on('pointertap', () => {
        lastNodeTapMsRef.current = Date.now();
        onSelectAgent?.(agent.id);
      });
      node.on('pointerover', () => {
        setHoveredNodeId(agent.id);
      });
      node.on('pointerout', () => {
        setHoveredNodeId(null);
      });
      world.addChild(node);
    };

    if (!viewer) {
      // Network overview: draw connections only between directly adjacent nodes
      // (distance ≤ CELL_SIZE + 1). For 9 genesis nodes this gives 12 clean
      // connections (4 radial spokes + 8 perimeter links) vs the dense 36-line mesh.
      for (let i = 0; i < agentList.length; i++) {
        for (let j = i + 1; j < agentList.length; j++) {
          const a = agentList[i];
          const b = agentList[j];
          // Skip connections to/from the origin singularity node at (0,0)
          if ((a.position.x === 0 && a.position.y === 0) ||
              (b.position.x === 0 && b.position.y === 0)) continue;
          if (getDistance(a.position, b.position) > CELL_SIZE + 1) continue;
          const clsA = classifyAgentCell(a);
          const clsB = classifyAgentCell(b);
          const sameFaction = !!(clsA.faction && clsA.faction === clsB.faction);
          const color = sameFaction
            ? FACTION_COLORS[clsA.faction!]
            : clsA.faction ? FACTION_COLORS[clsA.faction]
            : clsB.faction ? FACTION_COLORS[clsB.faction]
            : 0x667788;
          world.addChild(createConnectionLine(a.position, b.position, 0.5, color, sameFaction));
        }
      }

      // User network lines: connect each user's claimed nodes back to their homenode
      const userHomenodes = new Map<string, Agent>();
      const userClaimed = new Map<string, Agent[]>();
      agentList.forEach(agent => {
        if (!agent.userId) return;
        if (agent.isPrimary) userHomenodes.set(agent.userId, agent);
        else {
          const list = userClaimed.get(agent.userId) ?? [];
          list.push(agent);
          userClaimed.set(agent.userId, list);
        }
      });
      userHomenodes.forEach((homenode, userId) => {
        const claimed = userClaimed.get(userId);
        if (!claimed) return;
        const cls = classifyAgentCell(homenode);
        const lineColor = cls.faction ? FACTION_COLORS[cls.faction] : 0x667788;
        claimed.forEach(node => {
          world.addChild(createConnectionLine(homenode.position, node.position, 0.3, lineColor, false));
        });
      });

      agentList.forEach(agent => {
        const cls = classifyAgentCell(agent);
        // In network-overview mode all nodes are visible — void nodes show as hazy (never hidden)
        const fogLevel = cls.fogLevel === 'hidden' ? 'hazy' : cls.fogLevel;
        addClickableStarNode(agent, fogLevel, userFactionRef.current);
      });
      return;
    }

    const others = agentList.filter(a => a.id !== viewer.id);

    // Empire borders placeholder — actual borders drawn in separate turn-based effect
    const borders = createEmpireBorders(agentList, { viewerUserId: currentUserId, viewerEmpireColor: empireColor });
    world.addChildAt(borders, 3); // index 3 = right after nebula (0), faction bg (1), grid lines (2)
    bordersRef.current = borders;

    // Connection lines (behind stars) — faction-colored, bold for same-faction links
    others.forEach(agent => {
      const distance = getDistance(viewer.position, agent.position);
      const strength = getConnectionStrength(distance, CONNECTION_THRESHOLD);
      if (strength > 0) {
        const cls = classifyAgentCell(agent);
        const lineColor = cls.faction ? FACTION_COLORS[cls.faction] : 0x334466;
        const bold = cls.faction === userFactionRef.current;
        world.addChild(createConnectionLine(viewer.position, agent.position, strength, lineColor, bold));
      }
    });

    // User network lines: connect viewer's claimed nodes back to homenode
    if (currentUserId) {
      const viewerCls = classifyAgentCell(viewer);
      const userLineColor = viewerCls.faction ? FACTION_COLORS[viewerCls.faction] : 0x667788;
      others.forEach(agent => {
        if (agent.userId === currentUserId && !agent.isPrimary) {
          world.addChild(createConnectionLine(viewer.position, agent.position, 0.3, userLineColor, false));
        }
      });
    }

    // Viewer's own star
    addClickableStarNode(viewer, 'clear', userFactionRef.current);

    // All other stars — fog level from SpiralClassifier (faction-based, not distance)
    others.forEach(agent => {
      const cls = classifyAgentCell(agent);
      addClickableStarNode(agent, cls.fogLevel, userFactionRef.current);
    });

  }, [appReady, agents, currentAgentId, currentUserId]);

  // Recalculate empire borders every turn (border pressure, claims, etc.)
  useEffect(() => {
    if (!appReady) return;
    const world = worldRef.current;
    if (!world || !bordersRef.current) return;

    const agentList = Object.values(agents);
    if (agentList.length === 0) return;

    // Remove old borders and insert new ones at the same position
    const idx = world.children.indexOf(bordersRef.current);
    if (idx >= 0) {
      world.removeChildAt(idx);
      const newBorders = createEmpireBorders(agentList, { viewerUserId: currentUserId, viewerEmpireColor: empireColor });
      world.addChildAt(newBorders, idx);
      bordersRef.current = newBorders;
    }
  }, [appReady, turn, agents, currentUserId, empireColor]);

  // Keep userFactionRef current and re-draw faction background when faction changes
  useEffect(() => {
    userFactionRef.current = userFaction;
    if (!appReady) return;
    const world = worldRef.current;
    if (!world) return;
    if (world.children.length > 1) {
      world.removeChildAt(1);
      const newFactionBg = createFactionBackground(GRID_EXTENT, GRID_EXTENT, userFaction);
      newFactionBg.visible = false;
      world.addChildAt(newFactionBg, 1);
    }
  }, [appReady, userFaction]);

  // Hover-dim: fade non-hovered nodes when a node is hovered
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    world.children.forEach((child) => {
      if (child.label && typeof child.label === 'string') {
        if (hoveredNodeId !== null && child.label !== hoveredNodeId) {
          setNodeDimmed(child as Container, true);
        } else {
          setNodeDimmed(child as Container, false);
        }
      }
    });
  }, [hoveredNodeId]);

  // Focus on a specific node when requested via store
  const focusRequest = useGameStore((s) => s.focusRequest);
  const clearFocusRequest = useGameStore((s) => s.clearFocusRequest);
  useEffect(() => {
    if (!focusRequest) return;
    const world = worldRef.current;
    const app = appRef.current;
    const target = agents[focusRequest.nodeId];
    if (!world || !app || !target) return;

    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    world.position.set(
      centerX - target.position.x * world.scale.x,
      centerY - target.position.y * world.scale.x,
    );
    setCamera({ x: world.position.x, y: world.position.y }, world.scale.x);
    clearFocusRequest();
  }, [focusRequest, clearFocusRequest, setCamera]);

  // Spawn animation — 3-phase: zoom-in, materialize (alpha pulse), connect
  const spawnAnimation = useGameStore((s) => s.spawnAnimation);
  const clearSpawnAnimation = useGameStore((s) => s.clearSpawnAnimation);
  useEffect(() => {
    if (!spawnAnimation || !appReady) return;
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world) return;

    const { coord, startedAt } = spawnAnimation;
    const TOTAL_DURATION = 3500; // ms

    const tickerCb = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= TOTAL_DURATION) {
        // Animation complete — restore any dimmed node and clean up
        clearSpawnAnimation();
        app.ticker.remove(tickerCb);
        return;
      }

      // Find the spawn node container by matching its label (agent id) or position
      let targetNode: Container | null = null;
      for (const child of world.children) {
        if (!(child instanceof Container) || !child.label) continue;
        // Star nodes are positioned at the agent's world coords
        if (Math.abs(child.position.x - coord.x) < 1 && Math.abs(child.position.y - coord.y) < 1) {
          targetNode = child as Container;
          break;
        }
      }

      if (elapsed < 1000) {
        // Phase 1: Camera zoom-in (0-1s)
        const t = easeOutCubic(elapsed / 1000);
        const targetZoom = lerp(world.scale.x, 4, t * 0.1); // gentle zoom nudge
        const centerX = app.screen.width / 2;
        const centerY = app.screen.height / 2;
        world.position.x = centerX - coord.x * targetZoom;
        world.position.y = centerY - coord.y * targetZoom;
        world.scale.set(targetZoom, targetZoom);
      } else if (elapsed < 2500) {
        // Phase 2: Materialize — alpha pulse (1-2.5s)
        if (targetNode) {
          const phaseT = (elapsed - 1000) / 1500;
          // Pulse: ramp up with ease-out
          targetNode.alpha = easeOutCubic(phaseT);
        }
      } else {
        // Phase 3: Connect (2.5-3.5s) — just ensure node is fully visible
        if (targetNode) {
          targetNode.alpha = 1;
        }
      }
    };

    // If we have a target node, start it invisible for the materialize phase
    for (const child of world.children) {
      if (!(child instanceof Container) || !child.label) continue;
      if (Math.abs(child.position.x - coord.x) < 1 && Math.abs(child.position.y - coord.y) < 1) {
        (child as Container).alpha = 0;
        break;
      }
    }

    app.ticker.add(tickerCb);
    return () => {
      app.ticker.remove(tickerCb);
    };
  }, [spawnAnimation, appReady, clearSpawnAnimation]);

  // Center on home neural node
  const handleCenterHome = useCallback(() => {
    const world = worldRef.current;
    const app = appRef.current;
    const viewer = currentAgentId ? agents[currentAgentId] : null;
    if (!world || !app || !viewer) return;

    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    world.position.set(
      centerX - viewer.position.x * world.scale.x,
      centerY - viewer.position.y * world.scale.x,
    );
    setCamera({ x: world.position.x, y: world.position.y }, world.scale.x);
  }, [agents, currentAgentId, setCamera]);

  // Zoom slider handler
  const handleZoomSlider = useCallback((newZoom: number) => {
    const world = worldRef.current;
    const app = appRef.current;
    if (!world || !app) return;

    const oldScale = world.scale.x;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    world.position.x = centerX - (centerX - world.position.x) * (newZoom / oldScale);
    world.position.y = centerY - (centerY - world.position.y) * (newZoom / oldScale);
    world.scale.set(newZoom, newZoom);

    setCamera({ x: world.position.x, y: world.position.y }, newZoom);
    setZoom(newZoom);
  }, [setCamera]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0"
      style={{ touchAction: 'none' }}
    >
      {/* Zoom slider + home button — bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 glass-card px-3 py-1.5">
        <button
          onClick={handleCenterHome}
          className="text-[10px] text-text-muted hover:text-accent-cyan transition-colors px-1"
          title="Center on home neural node"
        >
          ⌂
        </button>
        <div className="h-3 w-px bg-card-border" />
        <span className="text-[10px] text-text-muted">−</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomSlider(parseFloat(e.target.value))}
          className="w-32 h-1 accent-accent-cyan cursor-pointer"
        />
        <span className="text-[10px] text-text-muted">+</span>
        <span className="text-[10px] text-text-muted ml-1 w-10 text-right font-mono">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Cursor coordinates — bottom left */}
      {cursorCoords && (
        <div className="absolute bottom-4 left-4 z-10 text-[10px] font-mono text-text-muted">
          ({cursorCoords.x}, {cursorCoords.y})
        </div>
      )}
    </div>
  );
}
