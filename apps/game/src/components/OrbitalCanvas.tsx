"use client";
import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { useGameStore } from "@/store/gameStore";
import { buildScene } from "@/lib/orbitalScene";
import { assignRanks } from "@/lib/rankMapping";
import { bandOf } from "@/lib/orbitalGeometry";
import { step, DEFAULT_PHYSICS, type PhysicsBody } from "@/lib/orbitalPhysics";
import { seatsFromAgents, SINGULARITY_ID } from "@/lib/orbitalSeats";
import { TIER_LABELS, TIER_CROWN } from "@/types/grid";
import type { SeatInput } from "@/types/orbital";

const RADIAL_SCALE = 46; // px per √k — wider spacing so subnodes have room
const CORE_PADDING = 56; // free space between the Singularity and rank-1
const SING_CORE_TEX_R = 32; // black-hole texture core radius (sprite-scale unit)
const DIM_ALPHA = 0.6; // non-focused nodes recede gently (stay clearly visible) — focus is shown by a selection ring + edge glow, not a harsh dim
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.0015;
/** Store agents → orbital seats (claimed players + subagents + Singularity core),
 *  consuming the chain's real activity. Seat construction lives in lib/orbitalSeats. */
function seatsFromStore(): SeatInput[] {
  return seatsFromAgents(Object.values(useGameStore.getState().agents));
}

type BodyVM = PhysicsBody & {
  id: string;
  sprite: Sprite;
  baseScale: number;
  selfRing?: Graphics; // bright outline drawn around the player's own node
  selfLabel?: Text; // "YOU / Your Homenode" badge above the player's own node
};
type NodeMeta = { rank: number; band: number; tier: string; kind: string; isSelf?: boolean };
type PointerLike = { global: { x: number; y: number }; target?: unknown };

export default function OrbitalCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let app: Application | null = null;
    let disposed = false;
    const cleanup: Array<() => void> = [];

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

      // tooltip overlay (DOM, not PixiJS) — avoids React state in this imperative view
      const tip = document.createElement("div");
      Object.assign(tip.style, {
        position: "absolute",
        pointerEvents: "none",
        padding: "4px 8px",
        font: "11px ui-monospace, monospace",
        color: "#cbd5e1",
        background: "rgba(10,14,26,0.92)",
        border: "1px solid rgba(150,180,230,0.25)",
        borderRadius: "4px",
        transform: "translate(10px, 10px)",
        display: "none",
        zIndex: "5",
      } as CSSStyleDeclaration);
      host.appendChild(tip);

      const cx = () => a.screen.width / 2;
      const cy = () => a.screen.height / 2;
      const world = new Container();
      a.stage.addChild(world);
      const edgeG = new Graphics();
      world.addChild(edgeG);
      const nodeLayer = new Container();
      world.addChild(nodeLayer);

      // unified camera
      let camX = 0;
      let camY = 0;
      let zoom = 1;
      const applyCamera = () => {
        world.position.set(camX, camY);
        world.scale.set(zoom);
      };

      // shared white-circle texture → batched, tinted node sprites
      const circle = new Graphics().circle(0, 0, 32).fill(0xffffff);
      const tex: Texture = a.renderer.generateTexture({
        target: circle,
        resolution: Math.max(2, (window.devicePixelRatio || 1) * 2),
      });
      circle.destroy();

      // Singularity black-hole texture: a faint violet corona, a bright purple
      // accretion ring, and a near-black eclipsed core. Core radius == SING_CORE_TEX_R
      // so it shares the sprite-scale convention. Rendered untinted.
      const bh = new Graphics();
      for (let i = 7; i >= 1; i--) {
        // corona — concentric translucent rings fading outward to ~3.5× the core
        bh.circle(0, 0, SING_CORE_TEX_R * (1 + i * 0.36)).fill({ color: 0x2a0a55, alpha: 0.05 });
      }
      bh.circle(0, 0, SING_CORE_TEX_R * 1.34).fill({ color: 0x7c3aed, alpha: 0.55 }); // outer accretion
      bh.circle(0, 0, SING_CORE_TEX_R * 1.2).fill({ color: 0xc084fc, alpha: 0.95 }); // inner accretion (bright)
      bh.circle(0, 0, SING_CORE_TEX_R).fill({ color: 0x050009, alpha: 1 }); // eclipsed core (near-black)
      bh.circle(0, 0, SING_CORE_TEX_R * 1.06).stroke({ width: SING_CORE_TEX_R * 0.09, color: 0xe9d5ff, alpha: 0.85 }); // hot rim
      bh.circle(0, 0, SING_CORE_TEX_R).stroke({ width: SING_CORE_TEX_R * 0.06, color: 0x6d28d9, alpha: 0.45 }); // violet inner edge
      const singTex: Texture = a.renderer.generateTexture({
        target: bh,
        resolution: Math.max(2, (window.devicePixelRatio || 1) * 2),
      });
      bh.destroy();

      let bodies: BodyVM[] = [];
      let byId = new Map<string, BodyVM>();
      let familyPairs: Array<[string, string]> = [];
      let metaById = new Map<string, NodeMeta>();
      let childrenByParent = new Map<string, string[]>();
      let parentByChild = new Map<string, string>();

      // focus (ego-network) state
      let focusedId: string | null = null;
      let focusSet: Set<string> | null = null;

      const computeFocusSet = (): void => {
        if (!focusedId) {
          focusSet = null;
          return;
        }
        const s = new Set<string>([focusedId]);
        const kids = childrenByParent.get(focusedId);
        if (kids) for (const k of kids) s.add(k); // player → its subagents
        const parent = parentByChild.get(focusedId);
        if (parent) {
          s.add(parent); // subagent → parent + siblings
          for (const k of childrenByParent.get(parent) ?? []) s.add(k);
        }
        focusSet = s;
      };
      const applyFocus = (): void => {
        for (const b of bodies) {
          b.sprite.alpha = !focusSet || focusSet.has(b.id) ? 1 : DIM_ALPHA;
        }
      };
      const clearFocus = (): void => {
        if (!focusedId) return;
        focusedId = null;
        computeFocusSet();
        applyFocus();
      };

      const rebuild = () => {
        const seats = seatsFromStore();
        const scene = buildScene(seats, { radialScale: RADIAL_SCALE, corePadding: CORE_PADDING });

        // meta (rank/band/tier) for tooltips + relationships for focus
        const ranks = assignRanks(
          seats.filter((s) => !s.parentId).map((s) => ({ id: s.id, activity: s.activity, isSingularity: s.isSingularity })),
        );
        metaById = new Map();
        childrenByParent = new Map();
        parentByChild = new Map();
        for (const s of seats) {
          const r = ranks.get(s.id) ?? 0;
          metaById.set(s.id, {
            rank: r,
            band: bandOf(r),
            tier: s.tier,
            kind: s.isSingularity ? "singularity" : s.parentId ? "subagent" : "player",
            isSelf: s.isSelf,
          });
          if (s.parentId) {
            parentByChild.set(s.id, s.parentId);
            const arr = childrenByParent.get(s.parentId) ?? [];
            arr.push(s.id);
            childrenByParent.set(s.parentId, arr);
          }
        }

        nodeLayer.removeChildren();
        bodies = scene.nodes.map((n) => {
          const isSing = n.kind === "singularity";
          // Singularity = the black-hole texture (untinted, larger so the corona
          // reads as the focal core); players/subagents = the shared tinted circle.
          const baseScale = isSing ? (n.radius * 1.7) / SING_CORE_TEX_R : n.radius / 32;
          const dot = new Sprite(isSing ? singTex : tex);
          dot.anchor.set(0.5);
          dot.tint = isSing ? 0xffffff : n.tint;
          dot.scale.set(baseScale);
          dot.eventMode = "static";
          dot.cursor = "pointer";
          nodeLayer.addChild(dot);

          // "Your homenode" marker: a bright ring + a floating "YOU" badge so the
          // player can always find their own node in the orbit. Founder tier also
          // gets a 👑 crown. Drawn radius == sprite radius (n.radius) since dots are
          // scaled from the 32px texture. Position is synced every tick().
          let selfRing: Graphics | undefined;
          let selfLabel: Text | undefined;
          if (n.isSelf) {
            const r = n.radius;
            selfRing = new Graphics()
              .circle(0, 0, r + 5)
              .stroke({ width: 2.5, color: 0xffffff, alpha: 0.95 })
              .circle(0, 0, r + 9)
              .stroke({ width: 1, color: 0x5eead4, alpha: 0.6 });
            nodeLayer.addChild(selfRing);
            // Self nodes always carry a player Tier (never "singularity"); guard anyway.
            const playerTier = n.tier && n.tier !== "singularity" ? n.tier : null;
            const crown = playerTier ? TIER_CROWN[playerTier] : "";
            const tierName = playerTier ? TIER_LABELS[playerTier] : "";
            selfLabel = new Text({
              text: `${crown ? crown + " " : ""}YOU · Your Homenode${tierName ? ` (${tierName})` : ""}`,
              style: {
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                fontWeight: "700",
                fill: 0xffffff,
                stroke: { color: 0x05050a, width: 3 },
              },
            });
            selfLabel.anchor.set(0.5, 1);
            nodeLayer.addChild(selfLabel);
          }
          const b: BodyVM = {
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
            baseScale,
            selfRing,
            selfLabel,
          };
          dot.on("pointerover", (e: PointerLike) => {
            if (panning) return;
            dot.scale.set(baseScale * 1.4);
            const m = metaById.get(n.id);
            const short = n.id === SINGULARITY_ID ? "Singularity" : n.id.slice(0, 8);
            const selfPrefix = m?.isSelf ? "Your homenode · " : "";
            tip.textContent =
              m?.kind === "singularity"
                ? "Singularity · gateway + accumulator"
                : m?.kind === "subagent"
                  ? `${selfPrefix}${short} · subagent`
                  : `${selfPrefix}${short} · rank ${m?.rank} · band ${m?.band} · ${m?.tier}`;
            tip.style.left = `${e.global.x}px`;
            tip.style.top = `${e.global.y}px`;
            tip.style.display = "block";
          });
          dot.on("pointerout", () => {
            dot.scale.set(baseScale);
            tip.style.display = "none";
          });
          dot.on("pointertap", () => {
            focusedId = focusedId === n.id ? null : n.id;
            computeFocusSet();
            applyFocus();
          });
          return b;
        });
        byId = new Map(bodies.map((b) => [b.id, b]));
        familyPairs = seats
          .filter((s) => s.parentId)
          .map((s) => [s.parentId as string, s.id] as [string, string]);
        applyFocus(); // preserve dimming across rebuilds
      };

      const tick = () => {
        step(bodies, [], a.ticker.deltaMS / 1000, { ...DEFAULT_PHYSICS, anchorK: 0.8 });
        for (const b of bodies) {
          b.sprite.position.set(cx() + b.x, cy() + b.y);
          // Keep the self-marker ring + badge glued to the player's own node.
          if (b.selfRing) b.selfRing.position.set(cx() + b.x, cy() + b.y);
          if (b.selfLabel) b.selfLabel.position.set(cx() + b.x, cy() + b.y - (b.sprite.height / 2 + 8));
        }
        edgeG.clear();
        for (const [pid, kid] of familyPairs) {
          const p = byId.get(pid);
          const k = byId.get(kid);
          if (!p || !k) continue;
          const lit = !focusSet || (focusSet.has(pid) && focusSet.has(kid));
          edgeG
            .moveTo(cx() + p.x, cy() + p.y)
            .lineTo(cx() + k.x, cy() + k.y)
            .stroke({ width: 1.4, color: 0x5eead4, alpha: lit ? 0.9 : 0.4 });
        }
        // Soft selection ring on the focused node — the primary focus signal
        // (replaces the old harsh dim-everything; non-focused nodes now only recede gently).
        if (focusedId) {
          const f = byId.get(focusedId);
          if (f) {
            edgeG
              .circle(cx() + f.x, cy() + f.y, f.sprite.height / 2 + 6)
              .stroke({ width: 2, color: 0x93c5fd, alpha: 0.9 });
          }
        }
      };

      rebuild();
      const unsub = useGameStore.subscribe(rebuild);
      cleanup.push(unsub);
      a.ticker.add(tick);

      // ---- pan (drag empty space) ----
      a.stage.eventMode = "static";
      a.stage.hitArea = { contains: () => true };
      let panning = false;
      let panMoved = false;
      let panStartX = 0;
      let panStartY = 0;
      let camStartX = 0;
      let camStartY = 0;
      a.stage.on("pointerdown", (e: PointerLike) => {
        if (e.target !== a.stage) return; // a node was hit, not empty space
        panning = true;
        panMoved = false;
        panStartX = e.global.x;
        panStartY = e.global.y;
        camStartX = camX;
        camStartY = camY;
        a.canvas.style.cursor = "grabbing";
      });
      a.stage.on("pointermove", (e: PointerLike) => {
        if (!panning) return;
        const ddx = e.global.x - panStartX;
        const ddy = e.global.y - panStartY;
        if (ddx * ddx + ddy * ddy > 25) panMoved = true;
        camX = camStartX + ddx;
        camY = camStartY + ddy;
        applyCamera();
      });
      const endPan = (clicked: boolean) => {
        if (!panning) return;
        panning = false;
        a.canvas.style.cursor = "";
        if (clicked && !panMoved) clearFocus(); // empty-space click clears focus
      };
      a.stage.on("pointerup", () => endPan(true));
      a.stage.on("pointerupoutside", () => endPan(false));

      // ESC clears focus
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") clearFocus();
      };
      document.addEventListener("keydown", onKey);
      cleanup.push(() => document.removeEventListener("keydown", onKey));

      // ---- cursor-anchored wheel zoom ----
      const onWheel = (ev: WheelEvent) => {
        ev.preventDefault();
        const rect = a.canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const my = ev.clientY - rect.top;
        const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * (1 - ev.deltaY * ZOOM_STEP)));
        if (next === zoom) return;
        camX = mx - ((mx - camX) / zoom) * next;
        camY = my - ((my - camY) / zoom) * next;
        zoom = next;
        applyCamera();
      };
      a.canvas.addEventListener("wheel", onWheel, { passive: false });
      cleanup.push(() => a.canvas.removeEventListener("wheel", onWheel));

      // ---- pinch-to-zoom (touch) ----
      let pinching = false;
      let lastPinch = 0;
      const tdist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length < 2) return;
        e.preventDefault();
        pinching = true;
        panning = false;
        lastPinch = tdist(e.touches);
      };
      const onTouchMove = (e: TouchEvent) => {
        if (!pinching || e.touches.length < 2) return;
        e.preventDefault();
        const nd = tdist(e.touches);
        if (lastPinch <= 0) {
          lastPinch = nd;
          return;
        }
        const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * (nd / lastPinch)));
        lastPinch = nd;
        const rect = a.canvas.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        camX = mx - ((mx - camX) / zoom) * next;
        camY = my - ((my - camY) / zoom) * next;
        zoom = next;
        applyCamera();
      };
      const onTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          pinching = false;
          lastPinch = 0;
        }
      };
      a.canvas.addEventListener("touchstart", onTouchStart, { passive: false });
      a.canvas.addEventListener("touchmove", onTouchMove, { passive: false });
      a.canvas.addEventListener("touchend", onTouchEnd);
      a.canvas.addEventListener("touchcancel", onTouchEnd);
      cleanup.push(() => {
        a.canvas.removeEventListener("touchstart", onTouchStart);
        a.canvas.removeEventListener("touchmove", onTouchMove);
        a.canvas.removeEventListener("touchend", onTouchEnd);
        a.canvas.removeEventListener("touchcancel", onTouchEnd);
      });
    })();

    return () => {
      disposed = true;
      for (const fn of cleanup) fn();
      if (app) app.destroy(true);
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
