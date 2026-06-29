"use client";
import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Sprite, Circle, type Texture } from "pixi.js";
import { useGameStore } from "@/store/gameStore";
import { buildScene, carryBodyState } from "@/lib/orbitalScene";
import { assignRanks } from "@/lib/rankMapping";
import { bandOf } from "@/lib/orbitalGeometry";
import { step, DEFAULT_PHYSICS, type PhysicsBody } from "@/lib/orbitalPhysics";
import { seatsFromAgents } from "@/lib/orbitalSeats";
import { edgeAlpha, EDGE_FADE_BLOCKS } from "@/lib/orbitalEdges";
import { VISUAL_SETTLE_STEPS, VISUAL_FRAME_MS } from "@/lib/visualTest";
import type { SeatInput } from "@/types/orbital";

const RADIAL_SCALE = 46; // px per √k — wider spacing so subnodes have room
const CORE_PADDING = 56; // free space between the Singularity and rank-1
const SING_CORE_TEX_R = 32; // black-hole texture core radius (sprite-scale unit)
const DIM_ALPHA = 0.6; // non-focused nodes recede gently (stay clearly visible) — focus is shown by a selection ring + edge glow, not a harsh dim
const ACTIVE_PULSE_WINDOW = 4; // blocks: a node pulses while its last securing/proof is this recent
const MAX_SUBAGENT_DRAG_R = RADIAL_SCALE * 3.5; // px: cap how far a sub-agent can be dragged from its parent
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
  kind: string; // "player" | "subagent" | "singularity" — gates drag (subagents only)
  sprite: Sprite;
  baseScale: number;
  coreR: number; // visual core radius (world px) for the focus ring — excludes the Singularity corona
  selfRing?: Graphics; // subtle ring drawn around the player's own node
  lastActiveBlock?: number; // latest securing/proof block — recent ⇒ activity pulse
};
type NodeMeta = { rank: number; band: number; tier: string; kind: string; isSelf?: boolean };
type PointerLike = { global: { x: number; y: number }; target?: unknown };

export default function OrbitalCanvas({ visualTest = false }: { visualTest?: boolean }) {
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
      let pulsePhase = 0; // ms accumulator driving the activity-pulse animation
      let byId = new Map<string, BodyVM>();
      let familyPairs: Array<[string, string]> = [];
      let metaById = new Map<string, NodeMeta>();
      let childrenByParent = new Map<string, string[]>();
      let parentByChild = new Map<string, string>();

      // focus (ego-network) state
      let focusedId: string | null = null;
      let focusSet: Set<string> | null = null;

      // ---- subagent drag state ----
      // Subagents are user-repositionable: a node-level drag (distinct from the
      // empty-space camera pan) moves the dragged subagent's body + anchor so the
      // physics tether holds it at its new spot. Screen→world deltas divide by zoom.
      let dragId: string | null = null; // the subagent currently being dragged
      let dragMoved = false; // crossed the click→drag threshold (suppresses the tap)
      let dragStartX = 0; // pointer screen pos at drag start
      let dragStartY = 0;
      let dragBodyX = 0; // body world pos at drag start
      let dragBodyY = 0;
      // Persisted drop positions for dragged subagents live in the store
      // (subagentDragPositions) so they survive rebuild() AND this canvas unmounting
      // on a tab switch — a moved subagent never snaps back to its seat.

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
        useGameStore.getState().setFocusedNode(null); // sync the inspector toast
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
            kind: s.isSingularity ? "singularity" : s.parentId ? "subagent" : s.tier === "unclaimed" ? "unclaimed" : "player",
            isSelf: s.isSelf,
          });
          if (s.parentId) {
            parentByChild.set(s.id, s.parentId);
            const arr = childrenByParent.get(s.parentId) ?? [];
            arr.push(s.id);
            childrenByParent.set(s.parentId, arr);
          }
        }

        // W6: destroy the outgoing node graphics — removeChildren() alone only
        // detaches them, leaking a Sprite (+ self-ring Graphics) every rebuild.
        // Safe: fresh sprites are created below; carryBodyState carries only
        // physics state, never the sprite object.
        nodeLayer.removeChildren().forEach((c) => c.destroy());
        // Snapshot the outgoing bodies so each surviving node can carry its live
        // physics state across this rebuild (see carryBodyState below).
        const prevBodyById = new Map(bodies.map((pb) => [pb.id, pb] as const));
        bodies = scene.nodes.map((n) => {
          const isSing = n.kind === "singularity";
          // Singularity = the black-hole texture (untinted, larger so the corona
          // reads as the focal core); players/subagents = the shared tinted circle.
          const baseScale = isSing ? (n.radius * 1.7) / SING_CORE_TEX_R : n.radius / 32;
          const dot = new Sprite(isSing ? singTex : tex);
          dot.anchor.set(0.5);
          dot.tint = isSing ? 0xffffff : n.tint;
          // Empty (unclaimed) seats read as dim — no player behind them yet.
          if (n.kind === "unclaimed") dot.alpha = 0.5;
          dot.scale.set(baseScale);
          // Hit areas (local/pre-scale coords; on-screen radius = r × baseScale):
          //  - Singularity → clip to its visible disc so its faint corona doesn't swallow
          //    neighbouring clicks.
          //  - everything else → a generous target (≥14px on screen) so small nodes,
          //    especially sub-agents, are easy to click and DRAG. A bare 4px dot is
          //    nearly ungrabbable.
          dot.hitArea = isSing
            ? new Circle(0, 0, SING_CORE_TEX_R * 1.34)
            : new Circle(0, 0, Math.max(32, 14 / baseScale));
          dot.eventMode = "static";
          dot.cursor = "pointer";
          nodeLayer.addChild(dot);
          // Visual core radius (world px) for the focus ring — excludes the corona.
          const coreR = isSing ? baseScale * SING_CORE_TEX_R * 1.34 : dot.height / 2;

          // "Your homenode" marker: a subtle ring so the player can find their own
          // node in the orbit (text badge removed per design). Synced every tick().
          let selfRing: Graphics | undefined;
          if (n.isSelf) {
            const r = n.radius;
            selfRing = new Graphics()
              .circle(0, 0, r + 5)
              .stroke({ width: 2.5, color: 0xffffff, alpha: 0.95 })
              .circle(0, 0, r + 9)
              .stroke({ width: 1, color: 0x5eead4, alpha: 0.6 });
            nodeLayer.addChild(selfRing);
          }
          const b: BodyVM = {
            id: n.id,
            kind: n.kind,
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
            coreR,
            selfRing,
            lastActiveBlock: n.lastActiveBlock,
          };
          // Carry this node's live position+velocity across the rebuild. The store
          // replaces `agents` on every chain sync, which re-fires rebuild(); without
          // this, a node that had drifted under the tether would snap back to its
          // exact seat and re-settle every sync/action — read as the view "zooming
          // in a bit" on every interaction. The anchor stays at the new seat, so a
          // genuine re-rank still eases over smoothly via the tether.
          const carried = carryBodyState(n.x, n.y, prevBodyById.get(n.id));
          b.x = carried.x;
          b.y = carried.y;
          b.vx = carried.vx;
          b.vy = carried.vy;
          // Restore a persisted drag position so a rebuild() (focus click, chain sync)
          // keeps a moved subagent where the user dropped it instead of re-seating it.
          const persisted = useGameStore.getState().subagentDragPositions[n.id];
          if (persisted) {
            b.x = persisted.x;
            b.y = persisted.y;
            b.anchor = { x: persisted.x, y: persisted.y };
          }
          dot.on("pointerover", (e: PointerLike) => {
            if (panning) return;
            if (!isSing) dot.scale.set(baseScale * 1.4); // no hover-embiggen on the Singularity
            const m = metaById.get(n.id);
            // "Your homenode" is identity enough for the player's own node — omit the
            // raw id (a dev-seed id like "cell-0-0" reads coordinate-like; coordinates
            // are retired, nodes are rank-seats). Other nodes show their short id.
            const label = m?.isSelf ? "Your homenode" : n.id.slice(0, 8);
            tip.textContent =
              m?.kind === "singularity"
                ? "Singularity · gateway + accumulator"
                : m?.kind === "unclaimed"
                  ? "Open seat · unclaimed"
                  : m?.kind === "subagent"
                    ? "Sub-node" // coordinate-free: ids are cell-keyed in mock mode
                    : `${label} · rank ${m?.rank} · band ${m?.band} · ${m?.tier}`;
            tip.style.left = `${e.global.x}px`;
            tip.style.top = `${e.global.y}px`;
            tip.style.display = "block";
          });
          dot.on("pointerout", () => {
            dot.scale.set(baseScale);
            tip.style.display = "none";
          });
          // Any node pointerdown starts a fresh gesture → clear a stale drag-suppress
          // flag so a tap on THIS node isn't eaten by a previous subagent drag.
          // Subagents additionally begin a node-level drag (players/Singularity don't
          // drag — they fall through to focus-on-tap only). stopPropagation keeps the
          // stage's empty-space pan handler from also firing.
          dot.on("pointerdown", (e: PointerLike) => {
            dragMoved = false;
            if (n.kind !== "subagent") return;
            dragId = n.id;
            dragStartX = e.global.x;
            dragStartY = e.global.y;
            dragBodyX = b.x;
            dragBodyY = b.y;
            b.pinned = true; // freeze physics on the dragged body for a solid drag
            a.canvas.style.cursor = "grabbing";
            const ev = e as unknown as { stopPropagation?: () => void };
            ev.stopPropagation?.();
          });
          dot.on("pointertap", () => {
            if (dragMoved) {
              dragMoved = false; // consume the just-ended drag; the next tap is live
              return; // a drag just ended — don't toggle focus
            }
            focusedId = focusedId === n.id ? null : n.id;
            computeFocusSet();
            applyFocus();
            // Drive the store-backed NodeInspector toast (incl. the Singularity core).
            useGameStore.getState().setFocusedNode(focusedId);
            // Tapping an OWNED node makes it the terminal's active agent.
            // switchAgent no-ops for non-owned nodes.
            if (focusedId) {
              useGameStore.getState().switchAgent(n.id);
              // Focusing/refocusing any claimed player node opens the terminal
              // (own -> command console; other player -> intel console). The
              // Singularity + unclaimed slots keep only their inspector toast.
              // Use setState (not the toggling setActiveDockPanel) so refocusing
              // while the terminal is open keeps it open and just re-targets it.
              const kind = metaById.get(n.id)?.kind;
              if (kind === "player" || kind === "subagent") {
                useGameStore.setState({ activeDockPanel: "terminal" });
              }
            }
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
        pulsePhase += a.ticker.deltaMS;
        step(bodies, [], a.ticker.deltaMS / 1000, { ...DEFAULT_PHYSICS, anchorK: 0.8 });
        for (const b of bodies) {
          b.sprite.position.set(cx() + b.x, cy() + b.y);
          // Keep the self-marker ring glued to the player's own node.
          if (b.selfRing) b.selfRing.position.set(cx() + b.x, cy() + b.y);
        }
        // Consume a focus request (e.g. the "Home Node" button) by recentering the
        // camera on the node. Previously only the unmounted legacy grid read this, so
        // the button was dead in the orbital view.
        const fr = useGameStore.getState().focusRequest;
        if (fr) {
          const target = byId.get(fr.nodeId);
          if (target) {
            camX = cx() - zoom * (cx() + target.x);
            camY = cy() - zoom * (cy() + target.y);
            applyCamera();
          }
          // W6: consume the request only once its target is in the scene (or it
          // ages out) — otherwise retain it for the next tick. A target absent
          // during the init/rebuild race was being silently dropped (dead Home
          // button / no recenter). Rule mirrored + tested in lib/focusRetain.ts.
          if (target || Date.now() - fr.ts > 5000) {
            useGameStore.getState().clearFocusRequest();
          }
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
        // Decaying interaction "link" edges (e.g. homenode → Singularity ops).
        // Age = turns since the action; alpha fades to 0 over EDGE_FADE_BLOCKS.
        const ix = useGameStore.getState().interactionEdges;
        if (ix.length) {
          const turn = useGameStore.getState().turn;
          for (const e of ix) {
            const from = byId.get(e.from);
            const to = byId.get(e.to);
            if (!from || !to) continue;
            const alpha = edgeAlpha(turn - e.bornAt, 0.9, EDGE_FADE_BLOCKS);
            if (alpha <= 0) continue;
            edgeG
              .moveTo(cx() + from.x, cy() + from.y)
              .lineTo(cx() + to.x, cy() + to.y)
              .stroke({ width: 1.6, color: 0xc084fc, alpha });
          }
        }
        // Player↔player AGNTC transaction edges (amber/gold). from/to are owner
        // pubkey hex — map them through the store agents (userId == owner hex) to
        // the on-screen bodies, then fade over a short block window.
        const txEdges = useGameStore.getState().transactionEdges;
        if (txEdges.length) {
          const txBlock = useGameStore.getState().testnetBlocks;
          const TX_EDGE_FADE_BLOCKS = 6;
          // owner pubkey hex → on-screen node id (from the current store agents)
          const hexToNodeId = new Map<string, string>();
          for (const a of Object.values(useGameStore.getState().agents)) {
            if (a.userId) hexToNodeId.set(a.userId, a.id);
          }
          for (const e of txEdges) {
            const fromId = hexToNodeId.get(e.from);
            const toId = hexToNodeId.get(e.to);
            if (!fromId || !toId) continue;
            const from = byId.get(fromId);
            const to = byId.get(toId);
            if (!from || !to) continue;
            const alpha = edgeAlpha(txBlock - e.block, 0.9, TX_EDGE_FADE_BLOCKS);
            if (alpha <= 0) continue;
            edgeG
              .moveTo(cx() + from.x, cy() + from.y)
              .lineTo(cx() + to.x, cy() + to.y)
              .stroke({ width: 1.8, color: 0xf59e0b, alpha });
          }
        }
        // Soft selection ring on the focused node — the primary focus signal
        // (replaces the old harsh dim-everything; non-focused nodes now only recede gently).
        if (focusedId) {
          const f = byId.get(focusedId);
          if (f) {
            edgeG
              .circle(cx() + f.x, cy() + f.y, f.coreR + 6)
              .stroke({ width: 2, color: 0x93c5fd, alpha: 0.9 });
          }
        }
        // Activity pulse: a node whose last securing/proof block is recent emits an
        // expanding teal ring, so a remote player's on-chain work is visible live.
        const curBlock = useGameStore.getState().testnetBlocks;
        for (const b of bodies) {
          const lab = b.lastActiveBlock ?? 0;
          if (lab <= 0 || curBlock - lab > ACTIVE_PULSE_WINDOW) continue;
          const t = (Math.sin(pulsePhase / 600 + b.x * 0.05) + 1) / 2; // 0..1 breathing
          edgeG
            .circle(cx() + b.x, cy() + b.y, b.coreR + 5 + t * 7)
            .stroke({ width: 2, color: 0x5eead4, alpha: 0.15 + (1 - t) * 0.4 });
        }
      };

      rebuild();
      // Rebuild only when the agent set actually changes (the store replaces `agents`
      // immutably). Other store updates — notably setFocusedNode on a click — must NOT
      // rebuild, or they'd reset dragged subagents to their phyllotaxis seats.
      let lastAgents = useGameStore.getState().agents;
      const unsub = useGameStore.subscribe(() => {
        const next = useGameStore.getState().agents;
        if (next === lastAgents) return;
        lastAgents = next;
        rebuild();
      });
      cleanup.push(unsub);
      a.ticker.add(tick);
      if (visualTest) {
        // Deterministic freeze: stop the real-time loop and advance the ticker a
        // fixed number of fixed-deltaMS frames so the settled scene is identical
        // every run, then render once and signal the screenshot test.
        a.stop();
        // Reset the ticker baseline: app.init() sets lastTime to a real timestamp,
        // so the FIRST update(t) would otherwise diff against wall-clock time and
        // make step 1 non-deterministic across runs. Pin it to 0 so every update
        // delta is exactly VISUAL_FRAME_MS from frame one.
        a.ticker.lastTime = 0;
        let t = 0;
        for (let i = 0; i < VISUAL_SETTLE_STEPS; i++) {
          t += VISUAL_FRAME_MS;
          a.ticker.update(t);
        }
        a.render();
        (window as unknown as { __visualReady?: boolean }).__visualReady = true;
      }

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
        // Subagent drag takes priority over panning (a drag started on a node).
        if (dragId) {
          const ddx = e.global.x - dragStartX;
          const ddy = e.global.y - dragStartY;
          if (ddx * ddx + ddy * ddy > 25) dragMoved = true;
          const body = byId.get(dragId);
          if (body) {
            // Screen delta → world delta (the world is scaled by zoom).
            let wx = dragBodyX + ddx / zoom;
            let wy = dragBodyY + ddy / zoom;
            // Clamp a sub-agent within MAX_SUBAGENT_DRAG_R of its parent so it can't
            // be dragged off into empty space.
            const pid = parentByChild.get(dragId);
            const parentBody = pid ? byId.get(pid) : undefined;
            if (parentBody) {
              const dx = wx - parentBody.x;
              const dy = wy - parentBody.y;
              const dist = Math.hypot(dx, dy);
              if (dist > MAX_SUBAGENT_DRAG_R) {
                wx = parentBody.x + (dx / dist) * MAX_SUBAGENT_DRAG_R;
                wy = parentBody.y + (dy / dist) * MAX_SUBAGENT_DRAG_R;
              }
            }
            body.x = wx;
            body.y = wy;
            body.vx = 0;
            body.vy = 0;
            // Re-anchor so the phyllotaxis tether holds the new position instead
            // of springing the subagent back to its spawn seat.
            body.anchor = { x: wx, y: wy };
          }
          return;
        }
        if (!panning) return;
        const ddx = e.global.x - panStartX;
        const ddy = e.global.y - panStartY;
        if (ddx * ddx + ddy * ddy > 25) panMoved = true;
        camX = camStartX + ddx;
        camY = camStartY + ddy;
        applyCamera();
      });
      const endDrag = () => {
        if (!dragId) return;
        const body = byId.get(dragId);
        if (body) {
          body.pinned = false; // hand the body back to the physics tether (anchored at the drop spot)
          useGameStore.getState().setSubagentDragPosition(dragId, { x: body.x, y: body.y }); // persist across rebuilds + tab switches
        }
        dragId = null;
        a.canvas.style.cursor = "";
        // Leave dragMoved set so the trailing pointertap is suppressed; the next
        // pointerdown resets it.
      };
      const endPan = (clicked: boolean) => {
        if (dragId) {
          endDrag();
          return;
        }
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
  }, [visualTest]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
