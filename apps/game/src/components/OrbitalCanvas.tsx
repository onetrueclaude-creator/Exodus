"use client";
import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Sprite, type Texture } from "pixi.js";
import { useGameStore } from "@/store/gameStore";
import { buildScene } from "@/lib/orbitalScene";
import { step, DEFAULT_PHYSICS, type PhysicsBody } from "@/lib/orbitalPhysics";
import type { SeatInput, OrbitalFaction } from "@/types/orbital";

const RADIAL_SCALE = 26;

/** Map the store's current faction naming onto the v1.2 orbital factions. */
function factionOf(raw: string | null | undefined): OrbitalFaction {
  switch (raw) {
    case "professional":
    case "pro-max":
      return "professional";
    case "founders":
    case "founder":
      return "founders";
    case "community":
      return "community";
    default:
      return "community";
  }
}

/** Phase-1 adapter: current store agents → seats. Activity proxy = stakedCpu + securingCpu
 *  (Plan 2 swaps this for the chain's real activity/rank). */
function seatsFromStore(): SeatInput[] {
  const st = useGameStore.getState();
  const agents = Object.values(st.agents) as Array<{
    id: string;
    parentAgentId?: string;
    stakedCpu?: number;
    securingCpu?: number;
  }>;
  const fac = factionOf(st.currentUserFaction as unknown as string | null);
  const seats: SeatInput[] = agents.map((a) => ({
    id: a.id,
    faction: fac,
    parentId: a.parentAgentId,
    activity: (a.stakedCpu ?? 0) + (a.securingCpu ?? 0),
  }));
  seats.push({ id: "__singularity__", faction: "singularity", isSingularity: true, activity: 0 });
  return seats;
}

type BodyVM = PhysicsBody & { id: string; sprite: Sprite };

export default function OrbitalCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let app: Application | null = null;
    let disposed = false;
    let unsub: (() => void) | null = null;

    void (async () => {
      const a = new Application();
      await a.init({
        resizeTo: host,
        background: 0x05050a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (disposed) {
        a.destroy(true);
        return;
      }
      app = a;
      host.appendChild(a.canvas);

      const cx = () => a.screen.width / 2;
      const cy = () => a.screen.height / 2;
      const world = new Container();
      a.stage.addChild(world);
      const edgeG = new Graphics();
      world.addChild(edgeG);
      const nodeLayer = new Container();
      world.addChild(nodeLayer);

      // one shared white-circle texture → batched, tinted node sprites
      const circle = new Graphics().circle(0, 0, 32).fill(0xffffff);
      const tex: Texture = a.renderer.generateTexture({
        target: circle,
        resolution: Math.max(2, (window.devicePixelRatio || 1) * 2),
      });
      circle.destroy();

      let bodies: BodyVM[] = [];
      let byId = new Map<string, BodyVM>();
      let familyPairs: Array<[string, string]> = [];

      const rebuild = () => {
        const seats = seatsFromStore();
        const scene = buildScene(seats, { radialScale: RADIAL_SCALE });
        nodeLayer.removeChildren();
        bodies = scene.nodes.map((n) => {
          const dot = new Sprite(tex);
          dot.anchor.set(0.5);
          dot.tint = n.tint;
          dot.scale.set(n.radius / 32);
          nodeLayer.addChild(dot);
          return {
            id: n.id,
            x: n.x,
            y: n.y,
            vx: 0,
            vy: 0,
            mass: 1,
            pinned: n.kind === "singularity",
            anchor: { x: n.x, y: n.y },
            anchorStrength: 0.6,
            sprite: dot,
          } as BodyVM;
        });
        byId = new Map(bodies.map((b) => [b.id, b]));
        familyPairs = seats
          .filter((s) => s.parentId)
          .map((s) => [s.parentId as string, s.id] as [string, string]);
      };

      const tick = () => {
        step(bodies, [], a.ticker.deltaMS / 1000, { ...DEFAULT_PHYSICS, anchorK: 0.8 });
        for (const b of bodies) b.sprite.position.set(cx() + b.x, cy() + b.y);
        edgeG.clear();
        for (const [pid, kid] of familyPairs) {
          const p = byId.get(pid);
          const k = byId.get(kid);
          if (!p || !k) continue;
          edgeG
            .moveTo(cx() + p.x, cy() + p.y)
            .lineTo(cx() + k.x, cy() + k.y)
            .stroke({ width: 1.4, color: 0x5eead4, alpha: 0.85 });
        }
      };

      rebuild();
      unsub = useGameStore.subscribe(rebuild);
      a.ticker.add(tick);

      // cursor-anchored wheel zoom
      let zoom = 1;
      a.canvas.addEventListener(
        "wheel",
        (ev: WheelEvent) => {
          ev.preventDefault();
          const rect = a.canvas.getBoundingClientRect();
          const mx = ev.clientX - rect.left;
          const my = ev.clientY - rect.top;
          const next = Math.max(0.2, Math.min(4, zoom * (1 - ev.deltaY * 0.0015)));
          const wx = (mx - world.position.x) / zoom;
          const wy = (my - world.position.y) / zoom;
          world.position.set(mx - wx * next, my - wy * next);
          world.scale.set(next);
          zoom = next;
        },
        { passive: false },
      );
    })();

    return () => {
      disposed = true;
      if (unsub) unsub();
      if (app) app.destroy(true);
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
