"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Application, Container, Graphics } from "pixi.js";
import { useGameStore } from "@/store";
import { createGridBackground, updateGridBackground } from "./grid/GridBackground";
import { createBlockNode } from "./grid/StarNode";
import BlockNodePanel from "./BlockNodePanel";
// GridNodePanel removed — all actions via terminal
import { CELL_SIZE, cellToPixel } from "@/lib/lattice";
import type { FactionId } from "@/types";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const MIN_INITIAL_ZOOM = 0.8; // minimum zoom level on first blocknode render

interface LatticeGridProps {
  onSelectAgent?: (agentId: string) => void;
  onDeselect?: () => void;
}

export default function LatticeGrid({ onDeselect }: LatticeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  /** Tracks whether initial blocknode auto-zoom has already fired */
  const hasBlocknodeZoomedRef = useRef(false);
  const bgRef = useRef<Graphics | null>(null);
  const blocknodesLayerRef = useRef<Container | null>(null);
  /** Tracks when a node was last tapped — avoids deselecting on node clicks */
  const lastNodeTapMsRef = useRef(0);
  /** Last pointer position in world (pixel) space — used for grid cell click detection */
  const lastPointerWorldRef = useRef({ x: 0, y: 0 });

  const setCamera = useGameStore((s) => s.setCamera);
  const blocknodes = useGameStore((s) => s.blocknodes);
  const visibleFactions = useGameStore((s) => s.visibleFactions);
  const totalBlocksMined = useGameStore((s) => s.totalBlocksMined);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const empireColor = useGameStore((s) => s.empireColor);
  const devRevealAll = useGameStore((s) => s.devRevealAll);
  const setDevRevealAll = useGameStore((s) => s.setDevRevealAll);

  const [zoom, setZoom] = useState(1);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [selectedBlocknodeId, setSelectedBlocknodeId] = useState<string | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<{ cx: number; cy: number } | null>(null);

  const initApp = useCallback(async () => {
    if (!containerRef.current || appRef.current) return;

    const app = new Application();
    await app.init({
      background: 0x0a0a0f,
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

    // Grid background (index 0)
    const bg = createGridBackground({}, []);
    bgRef.current = bg;
    world.addChild(bg);

    // Blocknode layer (index 1 — above background)
    const blocknodesLayer = new Container();
    world.addChild(blocknodesLayer);
    blocknodesLayerRef.current = blocknodesLayer;

    // Pan & zoom
    let dragging = false;
    let dragStart = { x: 0, y: 0 };

    const syncCamera = () => {
      setCamera({ x: world.position.x, y: world.position.y }, world.scale.x);
      setZoom(world.scale.x);
    };

    let hasMoved = false;

    app.canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      dragging = true;
      hasMoved = false;
      dragStart = { x: e.clientX - world.position.x, y: e.clientY - world.position.y };
      // Capture world position at click start so pointerup can compute cell even without move
      const rect = app.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      lastPointerWorldRef.current = {
        x: (sx - world.position.x) / world.scale.x,
        y: (sy - world.position.y) / world.scale.x,
      };
    });

    app.canvas.addEventListener("pointermove", (e: PointerEvent) => {
      // Update cursor world coordinates
      const rect = app.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const exactWorldX = (screenX - world.position.x) / world.scale.x;
      const exactWorldY = (screenY - world.position.y) / world.scale.x;
      lastPointerWorldRef.current = { x: exactWorldX, y: exactWorldY };
      setCursorCoords({ x: Math.round(exactWorldX), y: Math.round(exactWorldY) });

      if (!dragging) return;
      const dx = e.clientX - (dragStart.x + world.position.x);
      const dy = e.clientY - (dragStart.y + world.position.y);
      if (Math.sqrt(dx * dx + dy * dy) > 5) hasMoved = true;
      world.position.set(e.clientX - dragStart.x, e.clientY - dragStart.y);
    });

    app.canvas.addEventListener("pointerup", () => {
      if (dragging) syncCamera();
      if (!hasMoved && Date.now() - lastNodeTapMsRef.current > 100) {
        // Background click — select grid cell or deselect
        onDeselect?.();
        setSelectedBlocknodeId(null);
        const { x: worldX, y: worldY } = lastPointerWorldRef.current;
        const cx = Math.round(worldX / CELL_SIZE);
        const cy = Math.round(worldY / CELL_SIZE);
        // Check if the click landed on an arm cell; if not, open grid panel
        const store = useGameStore.getState();
        const isArmCell = Object.values(store.blocknodes).some((n) => n.cx === cx && n.cy === cy);
        if (!isArmCell) {
          setSelectedGridCell({ cx, cy });
        }
      }
      dragging = false;
      hasMoved = false;
    });
    app.canvas.addEventListener("pointerleave", () => {
      if (dragging) syncCamera();
      dragging = false;
      setCursorCoords(null);
    });

    app.canvas.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        e.preventDefault();
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const oldScale = world.scale.x;
        const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldScale * scaleFactor));

        const rect = app.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        world.position.x = mouseX - (mouseX - world.position.x) * (newScale / oldScale);
        world.position.y = mouseY - (mouseY - world.position.y) * (newScale / oldScale);
        world.scale.set(newScale, newScale);

        syncCamera();
      },
      { passive: false }
    );

    // iOS touch gestures: 2-finger pinch = zoom, 3-finger drag = pan
    let lastTouches: { x: number; y: number }[] = [];

    const toPoints = (e: TouchEvent) =>
      Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));

    app.canvas.addEventListener(
      "touchstart",
      (e: TouchEvent) => {
        e.preventDefault();
        lastTouches = toPoints(e);
      },
      { passive: false }
    );

    app.canvas.addEventListener(
      "touchmove",
      (e: TouchEvent) => {
        e.preventDefault();
        const touches = toPoints(e);

        if (touches.length === 2 && lastTouches.length === 2) {
          const prevDist = Math.hypot(
            lastTouches[0].x - lastTouches[1].x,
            lastTouches[0].y - lastTouches[1].y
          );
          const newDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
          if (prevDist > 0) {
            const factor = newDist / prevDist;
            const oldScale = world.scale.x;
            const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldScale * factor));
            const rect = app.canvas.getBoundingClientRect();
            const cx = (touches[0].x + touches[1].x) / 2 - rect.left;
            const cy = (touches[0].y + touches[1].y) / 2 - rect.top;
            world.position.x = cx - (cx - world.position.x) * (newScale / oldScale);
            world.position.y = cy - (cy - world.position.y) * (newScale / oldScale);
            world.scale.set(newScale, newScale);
            syncCamera();
          }
        } else if (touches.length === 3 && lastTouches.length === 3) {
          const prevCx = (lastTouches[0].x + lastTouches[1].x + lastTouches[2].x) / 3;
          const prevCy = (lastTouches[0].y + lastTouches[1].y + lastTouches[2].y) / 3;
          const newCx = (touches[0].x + touches[1].x + touches[2].x) / 3;
          const newCy = (touches[0].y + touches[1].y + touches[2].y) / 3;
          world.position.x += newCx - prevCx;
          world.position.y += newCy - prevCy;
          syncCamera();
        }

        lastTouches = touches;
      },
      { passive: false }
    );

    app.canvas.addEventListener(
      "touchend",
      (e: TouchEvent) => {
        lastTouches = toPoints(e);
      },
      { passive: false }
    );

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

  // Re-render blocknodes when galaxy state changes
  useEffect(() => {
    if (!appReady) return;

    const world = worldRef.current;
    const app = appRef.current;
    if (!world || !app) return;

    // In dev mode, D key reveals all 4 factions
    const effectiveVisible: FactionId[] = devRevealAll
      ? (["community", "treasury", "founder", "pro-max"] as FactionId[])
      : visibleFactions;

    // Update background tinting — grid expands one ring per block, capped at 30
    // (30 rings = 61×61 = 3721 cells; beyond this the draw cost grows quadratically)
    if (bgRef.current) {
      updateGridBackground(
        bgRef.current,
        blocknodes,
        effectiveVisible,
        Math.min(30, Math.max(1, totalBlocksMined + 1))
      );
    }

    // Update blocknode layer
    const layer = blocknodesLayerRef.current;
    if (!layer) return;

    layer.removeChildren();

    const nodes = Object.values(blocknodes);

    // Draw blocknode circles
    for (const node of nodes) {
      const isVisible = effectiveVisible.includes(node.faction);
      const nodeContainer = createBlockNode(
        node,
        isVisible,
        currentUserId ?? undefined,
        empireColor
      );
      nodeContainer.on("pointertap", () => {
        lastNodeTapMsRef.current = Date.now();
        setSelectedBlocknodeId(node.id);
        setSelectedGridCell(null); // close grid panel when an arm node is selected
      });
      layer.addChild(nodeContainer);
    }

    // Auto-zoom-to-fit on first blocknode render — centers on visible faction arms
    const visibleNodes = nodes.filter((n) => effectiveVisible.includes(n.faction));
    if (visibleNodes.length > 0 && !hasBlocknodeZoomedRef.current) {
      hasBlocknodeZoomedRef.current = true;
      // Only use inner rings (0–2) for the initial zoom calculation.
      // When the testnet has many blocks, far-out nodes shrink zoom to sub-pixel level.
      // Inner nodes always produce a legible initial view.
      const zoomNodes = visibleNodes.filter((n) => n.ringIndex <= 2);
      const nodesForZoom = zoomNodes.length > 0 ? zoomNodes : visibleNodes;
      let minPx = Infinity,
        maxPx = -Infinity;
      let minPy = Infinity,
        maxPy = -Infinity;
      for (const node of nodesForZoom) {
        const { px, py } = cellToPixel(node.cx, node.cy);
        minPx = Math.min(minPx, px);
        maxPx = Math.max(maxPx, px);
        minPy = Math.min(minPy, py);
        maxPy = Math.max(maxPy, py);
      }
      const padded = CELL_SIZE * 2;
      const gridW = maxPx - minPx + padded * 2;
      const gridH = maxPy - minPy + padded * 2;
      const fitZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.min(app.screen.width / gridW, app.screen.height / gridH))
      );
      const clampedZoom = Math.max(MIN_INITIAL_ZOOM, fitZoom);
      const centerPx = (minPx + maxPx) / 2;
      const centerPy = (minPy + maxPy) / 2;
      world.scale.set(clampedZoom, clampedZoom);
      world.position.set(
        app.screen.width / 2 - centerPx * clampedZoom,
        app.screen.height / 2 - centerPy * clampedZoom
      );
      setZoom(clampedZoom);
      setCamera({ x: world.position.x, y: world.position.y }, clampedZoom);
    }
  }, [
    appReady,
    blocknodes,
    visibleFactions,
    totalBlocksMined,
    devRevealAll,
    currentUserId,
    empireColor,
  ]);

  // Focus on a specific node when requested via store
  const focusRequest = useGameStore((s) => s.focusRequest);
  const clearFocusRequest = useGameStore((s) => s.clearFocusRequest);
  useEffect(() => {
    if (!focusRequest || !appReady) return;
    const world = worldRef.current;
    const app = appRef.current;
    // Check blocknodes first, fall back to legacy agent lookup
    const blocknode = useGameStore.getState().blocknodes[focusRequest.nodeId];
    if (blocknode) {
      if (!world || !app) return;
      const { px, py } = cellToPixel(blocknode.cx, blocknode.cy);
      world.position.set(
        app.screen.width / 2 - px * world.scale.x,
        app.screen.height / 2 - py * world.scale.x
      );
      setCamera({ x: world.position.x, y: world.position.y }, world.scale.x);
      clearFocusRequest();
      return;
    }
    // Legacy: agent-based focus
    const target = useGameStore.getState().agents[focusRequest.nodeId];
    if (!world || !app || !target) return;
    world.position.set(
      app.screen.width / 2 - target.position.x * world.scale.x,
      app.screen.height / 2 - target.position.y * world.scale.x
    );
    setCamera({ x: world.position.x, y: world.position.y }, world.scale.x);
    clearFocusRequest();
  }, [focusRequest, appReady, clearFocusRequest, setCamera]);

  // Center on user's first claimed blocknode
  const handleCenterHome = useCallback(() => {
    const world = worldRef.current;
    const app = appRef.current;
    if (!world || !app) return;
    const userId = useGameStore.getState().currentUserId;
    if (!userId) return;
    const owned = Object.values(useGameStore.getState().blocknodes).find(
      (n) => n.ownerId === userId
    );
    if (!owned) return;
    const { px, py } = cellToPixel(owned.cx, owned.cy);
    world.position.set(
      app.screen.width / 2 - px * world.scale.x,
      app.screen.height / 2 - py * world.scale.x
    );
    setCamera({ x: world.position.x, y: world.position.y }, world.scale.x);
  }, [setCamera]);

  // Dev-only: press D to toggle full galaxy reveal (shows all 4 faction arms)
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") setDevRevealAll(!devRevealAll);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [devRevealAll, setDevRevealAll]);

  // Zoom slider handler
  const handleZoomSlider = useCallback(
    (newZoom: number) => {
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
    },
    [setCamera]
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0"
      style={{ touchAction: "none" }}
    >
      {/* Block counter HUD — top left */}
      {(() => {
        const ownedCount = currentUserId
          ? Object.values(blocknodes).filter((n) => n.ownerId === currentUserId).length
          : 0;
        return (
          <div className="absolute top-2 left-14 z-10 text-[10px] font-mono text-text-muted glass-card px-2 py-1">
            <span className="text-accent-cyan">◈</span> {totalBlocksMined} blocks ·{" "}
            {Object.keys(blocknodes).length} nodes
            {ownedCount > 0 && <span className="text-green-400 ml-1">· {ownedCount} owned</span>}
          </div>
        );
      })()}

      {/* Zoom slider + home button — bottom center */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 glass-card px-3 py-1.5">
        <button
          onClick={handleCenterHome}
          className="text-[10px] text-text-muted hover:text-accent-cyan transition-colors px-1"
          title="Center on home node"
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

      {/* BlockNode info + action panel (arm nodes) */}
      {selectedBlocknodeId && blocknodes[selectedBlocknodeId] && (
        <BlockNodePanel
          node={blocknodes[selectedBlocknodeId]}
          onClose={() => setSelectedBlocknodeId(null)}
        />
      )}

      {/* Grid cell click — no action panel, info only via CellTooltip in game page */}

      {/* Cursor coordinates — bottom left */}
      {cursorCoords && (
        <div className="absolute bottom-4 left-4 z-10 text-[10px] font-mono text-text-muted">
          <span className="text-text-muted/50">px</span> ({cursorCoords.x}, {cursorCoords.y})
          <span className="ml-2 text-text-muted/50">cell</span> (
          {Math.round(cursorCoords.x / CELL_SIZE)}, {Math.round(cursorCoords.y / CELL_SIZE)})
        </div>
      )}
    </div>
  );
}
