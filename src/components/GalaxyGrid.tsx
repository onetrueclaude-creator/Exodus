"use client";

import { useEffect, useRef, useCallback } from 'react';
import { Application, Container } from 'pixi.js';
import { useGameStore } from '@/store';
import { createGridBackground } from './grid/GridBackground';
import { createStarNode } from './grid/StarNode';
import { createConnectionLine } from './grid/ConnectionLine';
import { getVisibleAgents } from '@/lib/proximity';
import type { Agent } from '@/types';

const GRID_EXTENT = 3000;

export default function GalaxyGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);

  const agents = useGameStore((s) => s.agents);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const setCamera = useGameStore((s) => s.setCamera);

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

    app.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      dragging = true;
      dragStart = { x: e.clientX - world.position.x, y: e.clientY - world.position.y };
    });

    app.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!dragging) return;
      world.position.set(e.clientX - dragStart.x, e.clientY - dragStart.y);
    });

    app.canvas.addEventListener('pointerup', () => { dragging = false; });
    app.canvas.addEventListener('pointerleave', () => { dragging = false; });

    app.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(3, Math.max(0.2, world.scale.x * scaleFactor));
      world.scale.set(newScale, newScale);
      setCamera({ x: world.position.x, y: world.position.y }, newScale);
    }, { passive: false });

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

  // Re-render stars when agents change
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    // Clear previous star nodes (keep grid background at index 0)
    while (world.children.length > 1) {
      world.removeChildAt(1);
    }

    const agentList = Object.values(agents);
    const viewer = currentAgentId ? agents[currentAgentId] : null;

    if (!viewer) {
      // No viewer — render all agents as clear
      agentList.forEach(agent => {
        world.addChild(createStarNode(agent, 'clear'));
      });
      return;
    }

    // Render visible agents with fog
    const visible = getVisibleAgents(viewer, agentList);

    // Connection lines first (behind stars)
    visible.forEach(({ agent, connectionStrength }) => {
      if (connectionStrength > 0) {
        world.addChild(createConnectionLine(viewer.position, agent.position, connectionStrength));
      }
    });

    // Viewer's own star
    world.addChild(createStarNode(viewer, 'clear'));

    // Other visible stars
    visible.forEach(({ agent, fogLevel }) => {
      world.addChild(createStarNode(agent, fogLevel));
    });

  }, [agents, currentAgentId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0"
      style={{ touchAction: 'none' }}
    />
  );
}
