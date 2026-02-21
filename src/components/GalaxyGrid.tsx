"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { useGameStore } from '@/store';
import { createGridBackground } from './grid/GridBackground';
import { createStarNode } from './grid/StarNode';
import { createConnectionLine } from './grid/ConnectionLine';
import { createEmpireBorders } from './grid/EmpireBorders';
import { getDistance, getConnectionStrength } from '@/lib/proximity';
import { getFogLevel } from '@/lib/fog';
import type { Agent, FogLevel } from '@/types';

const GRID_EXTENT = 10000;
const CONNECTION_THRESHOLD = 400;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

interface GalaxyGridProps {
  onSelectAgent?: (agentId: string) => void;
  onDeselect?: () => void;
}

export default function GalaxyGrid({ onSelectAgent, onDeselect }: GalaxyGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const hasCentered = useRef(false);
  const bordersRef = useRef<Graphics | null>(null);
  /** Tracks when a node was last tapped — canvas pointerup uses this to avoid deselecting on node clicks */
  const lastNodeTapMsRef = useRef(0);

  const agents = useGameStore((s) => s.agents);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const turn = useGameStore((s) => s.turn);
  const setCamera = useGameStore((s) => s.setCamera);
  const empireColor = useGameStore((s) => s.empireColor);

  const [zoom, setZoom] = useState(1);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);
  const [appReady, setAppReady] = useState(false);

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

    // Grid background
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

  // Center on player agent — waits for both app ready AND agents loaded
  useEffect(() => {
    if (!appReady || hasCentered.current) return;

    const world = worldRef.current;
    const app = appRef.current;
    const viewer = currentAgentId ? agents[currentAgentId] : null;

    if (!world || !app || !viewer) return;

    hasCentered.current = true;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    world.position.set(centerX - viewer.position.x, centerY - viewer.position.y);
    setCamera({ x: world.position.x, y: world.position.y }, world.scale.x);
  }, [appReady, agents, currentAgentId, setCamera]);

  // Re-render stars when agents change — also waits for app ready
  useEffect(() => {
    if (!appReady) return;

    const world = worldRef.current;
    if (!world) return;

    // Clear previous star nodes (keep grid background at index 0)
    while (world.children.length > 1) {
      world.removeChildAt(1);
    }

    const agentList = Object.values(agents);
    const viewer = currentAgentId ? agents[currentAgentId] : null;

    const addClickableStarNode = (agent: Agent, fogLevel: FogLevel) => {
      const node = createStarNode(agent, fogLevel);
      node.on('pointertap', () => {
        lastNodeTapMsRef.current = Date.now();
        onSelectAgent?.(agent.id);
      });
      world.addChild(node);
    };

    if (!viewer) {
      agentList.forEach(agent => {
        addClickableStarNode(agent, 'clear');
      });
      return;
    }

    const others = agentList.filter(a => a.id !== viewer.id);

    // Empire borders placeholder — actual borders drawn in separate turn-based effect
    const borders = createEmpireBorders(agentList, { viewerUserId: currentUserId, viewerEmpireColor: empireColor });
    world.addChildAt(borders, 1); // index 1 = right after grid background
    bordersRef.current = borders;

    // Connection lines (behind stars) — only for nearby agents
    others.forEach(agent => {
      const distance = getDistance(viewer.position, agent.position);
      const strength = getConnectionStrength(distance, CONNECTION_THRESHOLD);
      if (strength > 0) {
        world.addChild(createConnectionLine(viewer.position, agent.position, strength));
      }
    });

    // Viewer's own star
    addClickableStarNode(viewer, 'clear');

    // All other stars with their fog level
    others.forEach(agent => {
      const distance = getDistance(viewer.position, agent.position);
      const fogLevel = getFogLevel(distance, viewer.tier);
      addClickableStarNode(agent, fogLevel);
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
