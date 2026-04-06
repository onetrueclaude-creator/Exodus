#!/usr/bin/env python3
"""Agentic Chain — Genesis Dashboard (Tokenomics v2)."""
from __future__ import annotations

import requests
import streamlit as st
import plotly.graph_objects as go

from agentic.params import (
    GENESIS_ORIGIN, GENESIS_FACTION_MASTERS, GENESIS_HOMENODES,
    HARDNESS_MULTIPLIER, BASE_MINING_RATE_PER_BLOCK,
    FEE_BURN_RATE, BLOCK_TIME_MS,
)
from agentic.testnet.genesis import create_genesis
from agentic.lattice.coordinate import resource_density

# ── Constants ──────────────────────────────────────────────────────────────────
API = "http://localhost:8080"

BG       = "#0A0A0F"
BG_CARD  = "#12121A"
CYAN     = "#00D4FF"
PURPLE   = "#8B5CF6"
GREEN    = "#10B981"
RED      = "#EF4444"
YELLOW   = "#F59E0B"
GOLD     = "#D97706"
TEXT     = "#E2E8F0"
TEXT_DIM = "#94A3B8"

FACTION_MAP = {
    GENESIS_ORIGIN: "System",
    GENESIS_FACTION_MASTERS[0]: "Community",
    GENESIS_FACTION_MASTERS[1]: "Machines",
    GENESIS_FACTION_MASTERS[2]: "Founders",
    GENESIS_FACTION_MASTERS[3]: "Professional",
}
for coord in GENESIS_HOMENODES:
    FACTION_MAP[coord] = "Unclaimed"

FACTION_COLOR = {
    "System":       TEXT_DIM,
    "Community":    YELLOW,
    "Machines":     GOLD,
    "Founders":     RED,
    "Professional": CYAN,
    "Unclaimed":    "#475569",
}


# ── API helpers ────────────────────────────────────────────────────────────────

def api_get(path: str) -> dict | None:
    try:
        r = requests.get(f"{API}{path}", timeout=3)
        return r.json() if r.ok else None
    except Exception:
        return None


def api_post(path: str) -> dict | None:
    try:
        r = requests.post(f"{API}{path}", timeout=10)
        return r.json() if r.ok else None
    except Exception:
        return None


# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Agentic Chain — Genesis", layout="wide", page_icon="⛓"
)
st.markdown(f"""
<style>
    .stApp {{ background-color: {BG}; }}
    .stMetric label {{ color: {TEXT_DIM} !important; }}
    .stMetric [data-testid="stMetricValue"] {{
        color: {CYAN} !important; font-family: monospace;
    }}
    h1, h2, h3 {{ color: {TEXT} !important; }}
    .stButton > button {{
        background: {BG_CARD}; color: {CYAN}; border: 1px solid {CYAN};
        border-radius: 6px; font-family: monospace;
    }}
    .stButton > button:hover {{ background: {CYAN}22; }}
</style>
""", unsafe_allow_html=True)

st.title("⛓ Agentic Chain — Genesis Dashboard")

# ── Live chain status ──────────────────────────────────────────────────────────
st.header("Live Chain")

status = api_get("/api/status")
epoch  = api_get("/api/epoch")
online = status is not None

if online:
    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric("Blocks Mined",    status.get("blocks_processed", 0))
    c2.metric("Total Mined",     f"{status.get('total_mined', 0):.4f} AGNTC")
    c3.metric("Active Claims",   status.get("total_claims", 0))
    c4.metric("Epoch Ring",      status.get("epoch_ring", 1))
    hardness = HARDNESS_MULTIPLIER * status.get("epoch_ring", 1)
    c5.metric("Hardness",        hardness)
    c6.metric("Next Ring At",    f"{status.get('epoch_next_threshold', 24):.2f} AGNTC")
else:
    st.warning("API offline — start with `python3 -m uvicorn agentic.testnet.api:app --port 8080`")

# ── Action buttons ─────────────────────────────────────────────────────────────
col_mine, col_reset, col_refresh, _ = st.columns([1, 1, 1, 5])

with col_mine:
    if st.button("⛏ Mine Block", disabled=not online):
        result = api_post("/api/mine")
        if result:
            if "error" in result:
                st.error(result["error"])
            else:
                st.success(
                    f"Block {result.get('block_number')} mined! "
                    f"+{result.get('total_yield', 0):.5f} AGNTC"
                )
                st.rerun()
        else:
            st.error("Mine failed — check API")

with col_reset:
    if st.button("↺ Reset Chain", disabled=not online):
        result = api_post("/api/reset")
        if result:
            st.success("Chain reset to genesis")
            st.rerun()

with col_refresh:
    if st.button("⟳ Refresh", disabled=not online):
        st.rerun()

# ── 2D Grid ────────────────────────────────────────────────────────────────────
st.header("Galaxy Grid")

grid_data = api_get("/api/grid/region?x_min=-25&x_max=25&y_min=-25&y_max=25") if online else None
claims_data = api_get("/api/claims") if online else []

# Build owner → faction lookup from claims
owner_faction: dict[str, str] = {}
if claims_data:
    for claim in claims_data:
        coord = (claim["x"], claim["y"])
        faction = FACTION_MAP.get(coord, "Unclaimed")
        owner_faction[claim["owner"]] = faction

fig = go.Figure()

if grid_data:
    cells = grid_data.get("cells", [])
    # Background density heatmap (unclaimed cells only)
    ux = [c["x"] for c in cells if not c["claimed"]]
    uy = [c["y"] for c in cells if not c["claimed"]]
    ud = [c["density"] for c in cells if not c["claimed"]]
    if ux:
        fig.add_trace(go.Scatter(
            x=ux, y=uy,
            mode="markers",
            marker=dict(
                size=6,
                color=ud,
                colorscale=[[0, "#0D1117"], [1, "#1E3A2F"]],
                cmin=0, cmax=1,
                showscale=False,
            ),
            name="Grid",
            hovertemplate="(%{x}, %{y})<br>density: %{marker.color:.3f}<extra></extra>",
        ))

# Claimed nodes
if claims_data:
    for claim in claims_data:
        coord = (claim["x"], claim["y"])
        faction = FACTION_MAP.get(coord, "Unclaimed")
        color = FACTION_COLOR[faction]
        stake = claim["stake"]
        size = 22 if stake == 500 else (16 if stake == 400 else 11)
        label = faction if stake >= 400 else ""
        fig.add_trace(go.Scatter(
            x=[claim["x"]], y=[claim["y"]],
            mode="markers+text",
            marker=dict(
                size=size,
                color=color,
                line=dict(color=BG, width=2),
                symbol="circle",
            ),
            text=[label],
            textposition="top center",
            textfont=dict(size=9, color=color),
            name=faction,
            showlegend=False,
            hovertemplate=(
                f"<b>{faction}</b><br>"
                f"({claim['x']:+d}, {claim['y']:+d})<br>"
                f"stake: {stake}<br>"
                f"density: {claim['density']:.3f}"
                "<extra></extra>"
            ),
        ))

# Legend traces (one per faction)
for faction, color in FACTION_COLOR.items():
    fig.add_trace(go.Scatter(
        x=[None], y=[None],
        mode="markers",
        marker=dict(size=10, color=color),
        name=faction,
        showlegend=True,
    ))

# Grid boundary
g_min = grid_data["x_min"] if grid_data else -20
g_max = grid_data["x_max"] if grid_data else 20
fig.add_shape(
    type="rect",
    x0=g_min, y0=g_min, x1=g_max, y1=g_max,
    line=dict(color="#334155", width=1, dash="dot"),
)

fig.update_layout(
    paper_bgcolor=BG_CARD, plot_bgcolor=BG,
    font=dict(color=TEXT_DIM),
    height=520,
    margin=dict(l=40, r=40, t=20, b=40),
    legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT_DIM)),
    xaxis=dict(title="x", gridcolor="#1E293B", zerolinecolor="#334155",
               range=[g_min - 3, g_max + 3]),
    yaxis=dict(title="y", gridcolor="#1E293B", zerolinecolor="#334155",
               range=[g_min - 3, g_max + 3], scaleanchor="x", scaleratio=1),
)
st.plotly_chart(fig, use_container_width=True)

# ── Supply projection ──────────────────────────────────────────────────────────
st.header("Supply Projection")

@st.cache_data
def get_projection(n_blocks: int = 500):
    gs = create_genesis(seed=42)
    claims = gs.claim_registry.all_active_claims()
    engine = gs.mining_engine
    tracker = gs.epoch_tracker
    sorted_claims = sorted(claims, key=lambda c: -c.stake_amount)
    claim_dicts = [
        {"owner": gs.wallets[i].public_key, "coordinate": c.coordinate, "stake": c.stake_amount}
        for i, c in enumerate(sorted_claims)
    ]
    blocks, supply = [], []
    total = 0.0
    for blk in range(1, n_blocks + 1):
        y = sum(engine.compute_block_yields(claim_dicts, epoch_tracker=tracker).values())
        total += y
        blocks.append(blk)
        supply.append(total)
    return blocks, supply, tracker.next_epoch_threshold()

blocks_x, supply_y, next_ring = get_projection(500)

# Overlay real mined amount if API is live
real_mined = status.get("total_mined", 0) if online else 0
real_blocks = status.get("blocks_processed", 0) if online else 0

proj_fig = go.Figure()
proj_fig.add_trace(go.Scatter(
    x=blocks_x, y=supply_y,
    name="Projected supply",
    line=dict(color=PURPLE, width=2, dash="dot"),
    fill="tozeroy", fillcolor="rgba(139,92,246,0.06)",
))
proj_fig.add_hline(y=next_ring, line_dash="dash", line_color=YELLOW,
                   annotation_text="Ring 2 threshold", annotation_font_color=YELLOW)

if real_blocks > 0:
    proj_fig.add_trace(go.Scatter(
        x=[real_blocks], y=[real_mined],
        name="Actual mined",
        mode="markers",
        marker=dict(size=14, color=GREEN, symbol="star"),
    ))

proj_fig.update_layout(
    paper_bgcolor=BG_CARD, plot_bgcolor=BG_CARD,
    font=dict(color=TEXT_DIM),
    height=320,
    margin=dict(l=45, r=30, t=20, b=40),
    legend=dict(bgcolor="rgba(0,0,0,0)"),
    xaxis=dict(title="Block", gridcolor="#1E293B"),
    yaxis=dict(title="AGNTC", gridcolor="#1E293B"),
)
st.plotly_chart(proj_fig, use_container_width=True)

bph = 3600_000 // BLOCK_TIME_MS
avg = supply_y[-1] / len(supply_y)
c1, c2, c3, c4 = st.columns(4)
c1.metric("Avg yield/block",  f"{avg:.6f}")
c2.metric("Blocks/hour",      bph)
c3.metric("Supply/day",       f"~{avg * bph * 24:.2f} AGNTC")
c4.metric("Ring 2 threshold", f"{next_ring:.2f} AGNTC")

st.caption(
    "Agentic Chain v2 — Organic Growth | PoAIV | "
    f"Hardness = {HARDNESS_MULTIPLIER} × ring | 25/25/25/25 factions | "
    f"{FEE_BURN_RATE:.0%} fee burn"
)
