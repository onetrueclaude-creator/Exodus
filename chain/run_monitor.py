#!/usr/bin/env python3
"""Agentic Chain — Live Chain Dashboard.

Timechain Calendar-inspired real-time blockchain visualization.
Connects to testnet API (:8080) for live data.

Run with:
    streamlit run run_monitor.py --server.port 8502 --server.headless true
"""
from __future__ import annotations

import math
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
import plotly.graph_objects as go
import requests
import streamlit as st

from agentic.params import (
    TOTAL_SUPPLY, ALPHA, BETA, SLOTS_PER_EPOCH,
    FEE_BURN_RATE, REWARD_SPLIT_VERIFIER,
    REWARD_SPLIT_STAKER, DIST_COMMUNITY, DIST_TREASURY, DIST_TEAM,
    DIST_AGENTS, INITIAL_INFLATION_RATE, DISINFLATION_RATE, INFLATION_FLOOR,
    VERIFIERS_PER_BLOCK, VERIFICATION_THRESHOLD, BLOCK_TIME_MS,
    BASE_BIRTH_COST, BASE_MINING_RATE_PER_BLOCK, GRID_MIN, GRID_MAX,
    SAFE_MODE_THRESHOLD, SAFE_MODE_RECOVERY,
)

# ═══════════════════════════════════════════════════════════════
#  Design Tokens
# ═══════════════════════════════════════════════════════════════

BG = "#0A0A0F"
BG_CARD = "#12121A"
BG_SURFACE = "#1A1A2E"
CYAN = "#00D4FF"
PURPLE = "#8B5CF6"
GREEN = "#10B981"
RED = "#EF4444"
YELLOW = "#F59E0B"
ORANGE = "#F97316"
AMBER = "#F59E0B"
TEXT = "#E2E8F0"
TEXT_DIM = "#94A3B8"
TEXT_MUTED = "#64748B"

API_BASE = "http://localhost:8080"
TESTS_DIR = str(Path(__file__).resolve().parent / "tests")

# ═══════════════════════════════════════════════════════════════
#  Utilities
# ═══════════════════════════════════════════════════════════════


def api_get(path: str, timeout: float = 3.0):
    try:
        r = requests.get(f"{API_BASE}{path}", timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def api_post(path: str, data: dict | None = None, timeout: float = 5.0):
    try:
        r = requests.post(f"{API_BASE}{path}", json=data or {}, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def dark_layout(fig, title="", height=400):
    fig.update_layout(
        title=dict(text=title, font=dict(color=TEXT, size=16)),
        paper_bgcolor=BG_CARD, plot_bgcolor=BG_CARD,
        font=dict(color=TEXT_DIM, family="JetBrains Mono, monospace"),
        height=height, margin=dict(l=40, r=40, t=50, b=40),
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT_DIM)),
        xaxis=dict(gridcolor="#1E293B", zerolinecolor="#1E293B"),
        yaxis=dict(gridcolor="#1E293B", zerolinecolor="#1E293B"),
    )
    return fig


def metric_card(label, value, sub="", color=CYAN):
    return (
        f'<div style="background:{BG_CARD}; border:1px solid rgba(255,255,255,0.04);'
        f' border-radius:8px; padding:14px 16px; margin-bottom:8px;">'
        f'<div style="color:{TEXT_MUTED}; font-size:9px; text-transform:uppercase;'
        f' letter-spacing:1.5px; font-family:JetBrains Mono,monospace;">{label}</div>'
        f'<div style="color:{color}; font-size:22px; font-weight:700;'
        f' font-family:JetBrains Mono,monospace; margin:4px 0;">{value}</div>'
        f'<div style="color:{TEXT_DIM}; font-size:11px;'
        f' font-family:JetBrains Mono,monospace;">{sub}</div></div>'
    )


# ═══════════════════════════════════════════════════════════════
#  SVG Ring Visualization
# ═══════════════════════════════════════════════════════════════


def render_chain_rings(data: dict, agents_count: int = 0) -> str:
    cx, cy = 250, 250
    blocks = data.get("blocks_processed", 0)
    pool_remaining = data.get("community_pool_remaining", 0)
    pool_initial = TOTAL_SUPPLY * DIST_COMMUNITY
    total_mined = data.get("total_mined", 0)

    pool_pct = pool_remaining / pool_initial if pool_initial > 0 else 0
    epoch_pct = (blocks % SLOTS_PER_EPOCH) / SLOTS_PER_EPOCH if SLOTS_PER_EPOCH > 0 else 0
    agent_pct = min(agents_count / 50, 1.0) if agents_count > 0 else 0
    mine_pct = min(total_mined / max(pool_initial * 0.01, 1), 1.0)

    rings = [
        (200, pool_pct, CYAN, "POOL"),
        (165, epoch_pct, PURPLE, "EPOCH"),
        (130, agent_pct, GREEN, "AGENTS"),
        (95, mine_pct, AMBER, "MINED"),
    ]

    svg = ['<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" '
           'style="max-width:100%; height:auto;">']

    # Defs: glow filter + gradient
    svg.append("""<defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#1a1a2e; stop-opacity:0.2"/>
            <stop offset="100%" style="stop-color:#0A0A0F; stop-opacity:0"/>
        </radialGradient>
    </defs>
    <circle cx="250" cy="250" r="230" fill="url(#bgGrad)"/>""")

    # Tick marks (24)
    for i in range(24):
        a = math.radians(i * 15 - 90)
        ro = 222
        ri = 218 if i % 6 == 0 else 220
        x1, y1 = cx + ro * math.cos(a), cy + ro * math.sin(a)
        x2, y2 = cx + ri * math.cos(a), cy + ri * math.sin(a)
        w = "1.5" if i % 6 == 0 else "0.5"
        op = "0.4" if i % 6 == 0 else "0.15"
        svg.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                   f'stroke="{TEXT_MUTED}" stroke-width="{w}" opacity="{op}"/>')

    # Rings
    for r, pct, color, _label in rings:
        circ = 2 * math.pi * r
        filled = circ * min(max(pct, 0), 0.9999)
        svg.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" '
                   f'stroke="{BG_SURFACE}" stroke-width="18" fill="none" opacity="0.4"/>')
        if filled > 1:
            svg.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" '
                       f'stroke="{color}" stroke-width="18" fill="none" '
                       f'stroke-dasharray="{filled:.2f} {circ:.2f}" '
                       f'stroke-linecap="round" transform="rotate(-90, {cx}, {cy})" '
                       f'filter="url(#glow)" opacity="0.85"/>')

    # Pulsing center
    svg.append(f"""<circle cx="{cx}" cy="{cy}" r="65" fill="none" stroke="{CYAN}"
        stroke-width="0.5" opacity="0.2">
        <animate attributeName="r" values="60;70;60" dur="4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="4s" repeatCount="indefinite"/>
    </circle>""")

    # Center text
    svg.append(f'<text x="{cx}" y="{cy - 18}" text-anchor="middle" fill="{TEXT}" '
               f'font-family="JetBrains Mono, monospace" font-size="42" font-weight="700">#{blocks}</text>')
    svg.append(f'<text x="{cx}" y="{cy + 5}" text-anchor="middle" fill="{TEXT_DIM}" '
               f'font-family="JetBrains Mono, monospace" font-size="11">blocks processed</text>')

    root = data.get("state_root", "offline")
    root_short = f"{root[:8]}···{root[-6:]}" if len(root) > 16 else root
    svg.append(f'<text x="{cx}" y="{cy + 28}" text-anchor="middle" fill="{TEXT_MUTED}" '
               f'font-family="JetBrains Mono, monospace" font-size="9">{root_short}</text>')

    # Legend
    items = [(CYAN, "POOL", f"{pool_pct:.0%}"), (PURPLE, "EPOCH", f"{epoch_pct:.0%}"),
             (GREEN, "AGENTS", str(agents_count)), (AMBER, "MINED", f"{total_mined:.2f}")]
    for i, (color, label, val) in enumerate(items):
        lx = 70 + i * 110
        svg.append(f'<circle cx="{lx}" cy="470" r="4" fill="{color}" opacity="0.8"/>')
        svg.append(f'<text x="{lx + 10}" y="471" fill="{TEXT_MUTED}" '
                   f'font-family="JetBrains Mono, monospace" font-size="9">{label}</text>')
        svg.append(f'<text x="{lx + 10}" y="484" fill="{color}" '
                   f'font-family="JetBrains Mono, monospace" font-size="10" font-weight="600">{val}</text>')

    svg.append('</svg>')
    return '\n'.join(svg)


# ═══════════════════════════════════════════════════════════════
#  Audit Data
# ═══════════════════════════════════════════════════════════════

AUDIT_FINDINGS = {
    "Consensus":    {"Critical": 0, "High": 4, "Medium": 2, "Low": 4},
    "Verification": {"Critical": 0, "High": 5, "Medium": 3, "Low": 6},
    "Actions":      {"Critical": 0, "High": 0, "Medium": 1, "Low": 3},
    "Economics":    {"Critical": 0, "High": 1, "Medium": 2, "Low": 2},
    "Galaxy":       {"Critical": 0, "High": 0, "Medium": 2, "Low": 5},
    "Ledger":       {"Critical": 3, "High": 2, "Medium": 2, "Low": 8},
}

AUDIT_KEY_FIXES = [
    ("H1", "VRF seed expanded 32→128-bit entropy", "Consensus", "High"),
    ("H3", "Block leader excluded from verifier selection", "Consensus", "High"),
    ("H4", "Disputed blocks cap 3 rounds → TIMED_OUT", "Consensus", "High"),
    ("H7", "Non-reveal detection in commit-reveal", "Verification", "High"),
    ("H8", "Safe mode min threshold raised to 3", "Verification", "High"),
    ("H9", "Offline validators excluded from selection", "Verification", "High"),
    ("H10", "TX_VALIDITY + STATE_TRANSITION per block", "Verification", "High"),
    ("PL3", "Misbehaving agents → PROBATION", "Verification", "High"),
    ("M9", "Rejection: unanimous → supermajority", "Consensus", "Medium"),
    ("M11", "Slash floor ≥ 1 token", "Economics", "Medium"),
    ("C1", "Length-prefixed domain-separated hashing", "Ledger", "Critical"),
    ("C2", "Nullifier tree depth aligned to 26", "Ledger", "Critical"),
    ("C3", "State root hardened against overflow", "Ledger", "Critical"),
    ("G2", "storage_slots fencepost fix", "Galaxy", "Medium"),
    ("G5", "Mint dust truncation fix", "Galaxy", "Medium"),
    ("E1", "StakeEntry.status: strings → enum", "Economics", "High"),
]


# ═══════════════════════════════════════════════════════════════
#  Page Config & Styles
# ═══════════════════════════════════════════════════════════════

st.set_page_config(page_title="Agentic Chain", layout="wide", page_icon="⛓",
                   initial_sidebar_state="collapsed")

try:
    from streamlit_autorefresh import st_autorefresh
    st_autorefresh(interval=10000, limit=None, key="auto_refresh")
except ImportError:
    pass

st.markdown(f"""<style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
    .stApp {{ background-color: {BG}; }}
    .stTabs [data-baseweb="tab-list"] {{ gap: 4px; }}
    .stTabs [data-baseweb="tab"] {{
        background-color: {BG_CARD}; border: 1px solid rgba(255,255,255,0.04);
        border-radius: 6px 6px 0 0; color: {TEXT_MUTED}; padding: 6px 16px;
        font-family: 'JetBrains Mono', monospace; font-size: 12px;
    }}
    .stTabs [aria-selected="true"] {{
        background-color: {BG_SURFACE}; border-bottom: 2px solid {CYAN}; color: {CYAN};
    }}
    .stMetric label {{ color: {TEXT_MUTED} !important; font-size: 11px !important; }}
    .stMetric [data-testid="stMetricValue"] {{
        color: {CYAN} !important; font-family: 'JetBrains Mono', monospace; font-size: 20px !important;
    }}
    h1, h2, h3 {{ color: {TEXT} !important; font-family: 'JetBrains Mono', monospace !important; }}
    .event-log {{
        background: {BG_CARD}; border: 1px solid rgba(0,212,255,0.08);
        border-radius: 6px; padding: 12px 16px;
        font-family: 'JetBrains Mono', monospace; font-size: 12px;
        color: {TEXT_DIM}; max-height: 260px; overflow-y: auto;
    }}
    .ev {{ margin: 1px 0; line-height: 1.7; }}
    .ev-time {{ color: {TEXT_MUTED}; }}
    .ev-block {{ color: {CYAN}; font-weight: 600; }}
    .ev-create {{ color: {PURPLE}; font-weight: 600; }}
    .ev-ok {{ color: {GREEN}; }}
    .ev-err {{ color: {RED}; }}
    .audit-cell {{
        display: inline-block; width: 42px; height: 42px; line-height: 42px;
        text-align: center; border-radius: 5px;
        font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; margin: 2px;
    }}
    .sev-critical {{ background: rgba(239,68,68,0.25); color: {RED}; border: 1px solid {RED}; }}
    .sev-high {{ background: rgba(249,115,22,0.2); color: {ORANGE}; border: 1px solid {ORANGE}; }}
    .sev-medium {{ background: rgba(245,158,11,0.15); color: {YELLOW}; border: 1px solid {YELLOW}; }}
    .sev-low {{ background: rgba(16,185,129,0.1); color: {GREEN}; border: 1px solid rgba(16,185,129,0.3); }}
    .sev-zero {{ background: rgba(255,255,255,0.02); color: {TEXT_MUTED}; border: 1px solid rgba(255,255,255,0.04); }}
    .live-dot {{
        display: inline-block; width: 8px; height: 8px; background: {GREEN};
        border-radius: 50%; margin-right: 6px;
        animation: pulse 2s ease-in-out infinite;
    }}
    .offline-dot {{
        display: inline-block; width: 8px; height: 8px; background: {RED};
        border-radius: 50%; margin-right: 6px;
    }}
    @keyframes pulse {{
        0%, 100% {{ opacity: 1; box-shadow: 0 0 4px {GREEN}; }}
        50% {{ opacity: 0.4; box-shadow: 0 0 8px {GREEN}; }}
    }}
</style>""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════
#  Fetch Live Data
# ═══════════════════════════════════════════════════════════════

status = api_get("/api/status")
api_online = status is not None
if status is None:
    status = {"state_root": "offline", "record_count": 0, "total_claims": 0,
              "community_pool_remaining": 0, "blocks_processed": 0,
              "total_mined": 0, "next_block_in": 0}

claims_data = api_get("/api/claims") if api_online else None
agents_data = api_get("/api/agents") if api_online else None
agents_count = len(agents_data) if agents_data else 0


# ═══════════════════════════════════════════════════════════════
#  Event Detection
# ═══════════════════════════════════════════════════════════════

if "event_log" not in st.session_state:
    st.session_state.event_log = []
    st.session_state.prev_status = {}
    ts = datetime.now().strftime("%H:%M:%S")
    st.session_state.event_log.append(
        f'<span class="ev-time">[{ts}]</span> '
        f'<span class="ev-block">MONITOR STARTED</span> — Agentic Chain Dashboard')

prev = st.session_state.prev_status
ts = datetime.now().strftime("%H:%M:%S")

if api_online and not prev.get("_online"):
    st.session_state.event_log.append(
        f'<span class="ev-time">[{ts}]</span> '
        f'<span class="ev-ok">API ONLINE</span> — connected to testnet')
elif not api_online and prev.get("_online", True):
    st.session_state.event_log.append(
        f'<span class="ev-time">[{ts}]</span> '
        f'<span class="ev-err">API OFFLINE</span> — cannot reach testnet')

if prev and prev.get("blocks_processed", 0) != status.get("blocks_processed", 0):
    delta = status["blocks_processed"] - prev.get("blocks_processed", 0)
    if delta > 0:
        st.session_state.event_log.append(
            f'<span class="ev-time">[{ts}]</span> '
            f'<span class="ev-block">+{delta} BLOCK{"S" if delta > 1 else ""}</span> '
            f'total={status["blocks_processed"]} mined={status.get("total_mined", 0):.4f}')

if prev and prev.get("total_claims", 0) != status.get("total_claims", 0):
    delta = status["total_claims"] - prev.get("total_claims", 0)
    if delta > 0:
        st.session_state.event_log.append(
            f'<span class="ev-time">[{ts}]</span> '
            f'<span class="ev-create">+{delta} AGENT{"S" if delta > 1 else ""} CREATED</span> '
            f'total={status["total_claims"]}')

st.session_state.prev_status = {**status, "_online": api_online}
st.session_state.event_log = st.session_state.event_log[-200:]


# ═══════════════════════════════════════════════════════════════
#  Header
# ═══════════════════════════════════════════════════════════════

# Determine chain status: RECORDING (blocks growing), LIVE (API up), or OFFLINE
blocks_growing = (prev.get("blocks_processed", 0) != status.get("blocks_processed", 0)
                  and prev.get("blocks_processed", 0) > 0)
if not api_online:
    dot_cls, dot_lbl, dot_clr = "offline-dot", "OFFLINE", RED
elif blocks_growing:
    dot_cls, dot_lbl, dot_clr = "live-dot", "RECORDING", GREEN
else:
    dot_cls, dot_lbl, dot_clr = "live-dot", "LIVE", CYAN

st.markdown(f'''<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
    <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:24px; color:{TEXT}; font-family:'JetBrains Mono',monospace; font-weight:700;">
            ⛓ AGENTIC CHAIN</span>
        <span style="background:{BG_SURFACE}; border:1px solid rgba(0,212,255,0.15); border-radius:16px;
                     padding:3px 12px; font-size:11px; color:{CYAN}; font-family:'JetBrains Mono',monospace;">
            TESTNET v0.3</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
        <div style="display:flex; align-items:center; gap:6px; background:{BG_CARD};
                    border:1px solid rgba(255,255,255,0.06); border-radius:20px; padding:4px 14px;">
            <span class="{dot_cls}"></span>
            <span style="color:{dot_clr}; font-size:11px; font-family:'JetBrains Mono',monospace;
                         letter-spacing:1px; font-weight:600;">{dot_lbl}</span>
        </div>
        <span style="color:{TEXT_MUTED}; font-size:10px; font-family:'JetBrains Mono',monospace;">
            {datetime.now().strftime("%H:%M:%S")}</span>
    </div>
</div>''', unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════
#  Hero: Rings + Metrics
# ═══════════════════════════════════════════════════════════════

col_left, col_center, col_right = st.columns([1, 2, 1])

with col_left:
    pool = status.get("community_pool_remaining", 0)
    pool_initial = TOTAL_SUPPLY * DIST_COMMUNITY
    pool_pct = pool / pool_initial * 100 if pool_initial > 0 else 0

    st.markdown(metric_card("TOTAL SUPPLY", f"{TOTAL_SUPPLY:,}", "AGNTC", CYAN), unsafe_allow_html=True)
    st.markdown(metric_card("COMMUNITY POOL", f"{pool:,.0f}", f"{pool_pct:.1f}% remaining", CYAN),
                unsafe_allow_html=True)
    st.markdown(metric_card("CLAIMS", str(status.get("total_claims", 0)),
                            f"{status.get('record_count', 0)} records", PURPLE), unsafe_allow_html=True)
    st.markdown(metric_card("AGENTS", str(agents_count),
                            "online" if agents_count > 0 else "awaiting first creation", GREEN),
                unsafe_allow_html=True)

with col_center:
    st.markdown(render_chain_rings(status, agents_count), unsafe_allow_html=True)

with col_right:
    blocks = status.get("blocks_processed", 0)
    epoch = blocks // SLOTS_PER_EPOCH if SLOTS_PER_EPOCH > 0 else 0
    epoch_prog = blocks % SLOTS_PER_EPOCH if SLOTS_PER_EPOCH > 0 else 0

    st.markdown(metric_card("EPOCH", f"#{epoch}", f"{epoch_prog}/{SLOTS_PER_EPOCH} blocks", PURPLE),
                unsafe_allow_html=True)
    st.markdown(metric_card("TOTAL MINED", f"{status.get('total_mined', 0):.4f}",
                            "AGNTC distributed", AMBER), unsafe_allow_html=True)
    st.markdown(metric_card("BLOCK TIME", f"{BLOCK_TIME_MS / 1000:.0f}s",
                            f"next in {status.get('next_block_in', 0)}s", TEXT_DIM), unsafe_allow_html=True)
    st.markdown(metric_card("VERIFIERS", f"{VERIFIERS_PER_BLOCK}/block",
                            f"threshold {VERIFICATION_THRESHOLD}", TEXT_DIM), unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════
#  Event Log
# ═══════════════════════════════════════════════════════════════

st.markdown(f'<div style="margin-top:8px; margin-bottom:4px;">'
            f'<span style="color:{TEXT}; font-size:13px; font-family:JetBrains Mono,monospace;'
            f' font-weight:600;">EVENT LOG</span></div>', unsafe_allow_html=True)

log_lines = st.session_state.event_log[-50:]
log_html = "\n".join(f'<div class="ev">{line}</div>' for line in reversed(log_lines))
st.markdown(f'<div class="event-log">{log_html}</div>', unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════
#  Detail Tabs
# ═══════════════════════════════════════════════════════════════

tab_econ, tab_audit, tab_galaxy = st.tabs(["◆ ECONOMICS", "◉ AUDIT & TESTS", "✦ GALAXY"])


# ─── ECONOMICS ─────────────────────────────────────────────

with tab_econ:
    st.subheader("Economics & Tokenomics")

    with st.expander("Simulation Parameters", expanded=False):
        sc1, sc2, sc3, sc4 = st.columns(4)
        with sc1:
            n_epochs = st.slider("Epochs (months)", 12, 60, 24, key="econ_epochs")
        with sc2:
            n_validators = st.slider("Validators", 10, 100, 30, key="econ_validators")
        with sc3:
            n_free_stakers = st.slider("Free CPU Stakers", 10, 500, 100, key="econ_free")
        with sc4:
            sim_seed = st.number_input("Seed", value=42, min_value=0, key="econ_seed")

    from agentic.ledger.state import LedgerState
    from agentic.ledger.wallet import Wallet
    from agentic.consensus.validator import Validator
    from agentic.consensus.simulator import ConsensusSimulator
    from agentic.economics.staking import StakeRegistry
    from agentic.economics.epoch import EpochManager

    @st.cache_data
    def run_economics_sim(n_ep, n_val, n_free, seed):
        rng = np.random.default_rng(seed)
        state = LedgerState()
        stake_registry = StakeRegistry()
        epoch_manager = EpochManager(epochs_per_year=12)
        DIST = {"Community Pool": DIST_COMMUNITY, "Foundation": DIST_TREASURY,
                "Team & Advisors": DIST_TEAM, "AI Agents": DIST_AGENTS}
        wallets = {}
        total_minted = 0
        for i, (name, share) in enumerate(DIST.items()):
            amount = int(TOTAL_SUPPLY * share)
            w = Wallet(name=name, seed=seed + 1000 + i)
            w.receive_mint(state, amount=amount, slot=0)
            wallets[name] = w
            total_minted += amount
        remainder = TOTAL_SUPPLY - total_minted
        if remainder > 0:
            wallets["Community Pool"].receive_mint(state, amount=remainder, slot=0)
        circ_gen = sum(w.get_balance(state) for n, w in wallets.items() if n != "Community Pool")
        cpu_raw = rng.pareto(a=2.0, size=n_val) + 1
        cpu_raw = cpu_raw / cpu_raw.max()
        cpu_vpus = cpu_raw * 190 + 10
        total_stake_target = int(circ_gen * 0.40)
        stake_raw = rng.pareto(a=1.5, size=n_val) + 1
        stake_raw = stake_raw / stake_raw.sum()
        token_stakes = (stake_raw * total_stake_target).astype(int)
        token_stakes[-1] = total_stake_target - token_stakes[:-1].sum()
        validators = []
        for i in range(n_val):
            v = Validator(id=i, token_stake=float(token_stakes[i]), cpu_vpu=float(cpu_vpus[i]), online=True)
            validators.append(v)
            stake_registry.register_stake(staker=f"validator_{i}".encode(), validator_id=i,
                                          amount=int(token_stakes[i]), epoch=0)
        stake_registry.advance_epoch(1)
        consensus_sim = ConsensusSimulator(validators=validators, seed=seed)
        results = []
        for epoch in range(n_ep):
            stake_registry.advance_epoch(epoch)
            cr = consensus_sim.run_epoch()
            circ = sum(w.get_balance(state) for n, w in wallets.items() if n != "Community Pool")
            ts = stake_registry.get_total_staked()
            online = [v for v in validators if v.online]
            tt = sum(v.token_stake for v in online)
            tc = sum(v.cpu_vpu for v in online)
            orderer = max(online, key=lambda v: v.effective_stake(tt, tc))
            acct = epoch_manager.process_epoch(circulating_supply=circ, fee_revenue=0,
                                               validators=validators, orderer_id=orderer.id, total_staked=ts)
            apy = epoch_manager.get_annualized_yield(epoch, circ, ts)
            results.append({"epoch": epoch, "month": epoch + 1, "circulating": acct.circulating_end,
                            "inflation_rate": acct.inflation_rate, "verifier_rewards": acct.verifier_total,
                            "staker_rewards": acct.staker_total, "apy": apy,
                            "blocks_finalized": cr.blocks_finalized, "avg_finality": cr.avg_finality_s})
        stats = epoch_manager.get_cumulative_stats()
        return results, stats

    epochs_data, cum_stats = run_economics_sim(n_epochs, n_validators, n_free_stakers, sim_seed)

    ec1, ec2, ec3, ec4 = st.columns(4)
    ec1.metric("Cumulative Minted", f"{cum_stats['cumulative_minted']:,.0f}")
    ec2.metric("Cumulative Burned", f"{cum_stats['cumulative_burned']:,.0f}")
    ec3.metric("Net Issuance", f"{cum_stats['net_issuance']:,.0f}")
    final_supply = TOTAL_SUPPLY + cum_stats["net_issuance"]
    ec4.metric("Final Supply", f"{final_supply:,.0f}", delta=f"+{cum_stats['net_issuance'] / TOTAL_SUPPLY:.1%}")

    econ_c1, econ_c2 = st.columns(2)
    with econ_c1:
        fig_s = go.Figure(go.Scatter(
            x=[e["month"] for e in epochs_data], y=[e["circulating"] for e in epochs_data],
            name="Circulating", line=dict(color=CYAN, width=2),
            fill="tozeroy", fillcolor="rgba(0,212,255,0.06)"))
        dark_layout(fig_s, "Circulating Supply")
        fig_s.update_xaxes(title="Month")
        fig_s.update_yaxes(title="AGNTC")
        st.plotly_chart(fig_s, use_container_width=True)
    with econ_c2:
        fig_i = go.Figure()
        fig_i.add_trace(go.Scatter(x=[e["month"] for e in epochs_data],
                                   y=[e["inflation_rate"] * 100 for e in epochs_data],
                                   name="Inflation", line=dict(color=YELLOW, width=2)))
        fig_i.add_trace(go.Scatter(x=[e["month"] for e in epochs_data],
                                   y=[e["apy"] * 100 for e in epochs_data],
                                   name="APY", line=dict(color=GREEN, width=2, dash="dot")))
        dark_layout(fig_i, "Inflation & APY")
        fig_i.update_xaxes(title="Month")
        fig_i.update_yaxes(title="%")
        st.plotly_chart(fig_i, use_container_width=True)

    econ_c3, econ_c4 = st.columns(2)
    with econ_c3:
        fig_r = go.Figure()
        fig_r.add_trace(go.Bar(x=[e["month"] for e in epochs_data],
                               y=[e["verifier_rewards"] for e in epochs_data],
                               name=f"Verifiers ({REWARD_SPLIT_VERIFIER:.0%})", marker_color=CYAN))
        fig_r.add_trace(go.Bar(x=[e["month"] for e in epochs_data],
                               y=[e["staker_rewards"] for e in epochs_data],
                               name=f"Stakers ({REWARD_SPLIT_STAKER:.0%})", marker_color=PURPLE))
        dark_layout(fig_r, "Epoch Rewards")
        fig_r.update_layout(barmode="stack")
        fig_r.update_xaxes(title="Month")
        st.plotly_chart(fig_r, use_container_width=True)
    with econ_c4:
        fig_f = go.Figure()
        fig_f.add_trace(go.Scatter(x=[e["month"] for e in epochs_data],
                                   y=[e["avg_finality"] for e in epochs_data],
                                   name="Finality (s)", line=dict(color=CYAN, width=2)))
        fig_f.add_trace(go.Bar(x=[e["month"] for e in epochs_data],
                               y=[e["blocks_finalized"] for e in epochs_data],
                               name="Blocks", marker_color="rgba(139,92,246,0.3)", yaxis="y2"))
        dark_layout(fig_f, "Consensus Performance")
        fig_f.update_layout(yaxis=dict(title="Finality (s)"),
                            yaxis2=dict(title="Blocks", overlaying="y", side="right",
                                        gridcolor="rgba(0,0,0,0)"))
        st.plotly_chart(fig_f, use_container_width=True)

    st.markdown("---")
    st.markdown("#### Staking Calculator")
    cc1, cc2, cc3 = st.columns(3)
    with cc1:
        user_token = st.number_input("Your Stake (AGNTC)", value=10000, min_value=0, key="ct")
        user_cpu = st.number_input("Your CPU (VPU/hr)", value=40.0, min_value=0.0, key="cc")
    with cc2:
        net_token = st.number_input("Network Token Staked", value=5_000_000, min_value=1, key="cnt")
        net_cpu = st.number_input("Network CPU (VPU)", value=10000.0, min_value=1.0, key="cnc")
    with cc3:
        if net_token > 0 and net_cpu > 0:
            eff = ALPHA * (user_token / net_token) + BETA * (user_cpu / net_cpu)
            est = eff * TOTAL_SUPPLY * INITIAL_INFLATION_RATE
            apy = (est / user_token * 100) if user_token > 0 else 0
            st.metric("Effective Stake", f"{eff * 100:.4f}%")
            st.metric("Est. Annual Reward", f"{est:,.0f} AGNTC")
            st.metric("Personal APY", f"{apy:.1f}%")


# ─── AUDIT & TESTS ────────────────────────────────────────

with tab_audit:
    st.subheader("Testnet Simulation Audit — February 2026")
    st.markdown("55 findings across 6 layers. All high/medium severity resolved.")

    st.markdown("#### Findings Matrix")
    layers = list(AUDIT_FINDINGS.keys())
    sevs = ["Critical", "High", "Medium", "Low"]

    hm = '<div style="display:grid; grid-template-columns:120px repeat(4,48px) 56px; gap:3px; align-items:center;">'
    hm += '<div></div>'
    for s in sevs:
        hm += f'<div style="color:{TEXT_MUTED}; font-size:9px; text-align:center;">{s[:4].upper()}</div>'
    hm += f'<div style="color:{TEXT_MUTED}; font-size:9px; text-align:center;">SUM</div>'
    for layer in layers:
        f = AUDIT_FINDINGS[layer]
        total = sum(f.values())
        hm += f'<div style="color:{TEXT}; font-size:11px; font-family:JetBrains Mono,monospace;">{layer}</div>'
        for s in sevs:
            c = f[s]
            cls = f"sev-{s.lower()}" if c > 0 else "sev-zero"
            hm += f'<div class="audit-cell {cls}">{c}</div>'
        hm += (f'<div class="audit-cell" style="background:rgba(0,212,255,0.1); color:{CYAN};'
               f' border:1px solid rgba(0,212,255,0.2);">{total}</div>')
    hm += f'<div style="color:{CYAN}; font-size:11px; font-weight:600;">TOTAL</div>'
    for s in sevs:
        t = sum(AUDIT_FINDINGS[l][s] for l in layers)
        cls = f"sev-{s.lower()}" if t > 0 else "sev-zero"
        hm += f'<div class="audit-cell {cls}" style="font-weight:700;">{t}</div>'
    gt = sum(sum(v.values()) for v in AUDIT_FINDINGS.values())
    hm += (f'<div class="audit-cell" style="background:rgba(0,212,255,0.15); color:{CYAN};'
           f' border:1px solid {CYAN}; font-weight:700;">{gt}</div></div>')
    st.markdown(hm, unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)

    st.markdown("#### Key Protocol Fixes")
    st.dataframe(
        [{"ID": f[0], "Fix": f[1], "Layer": f[2], "Sev": f[3]} for f in AUDIT_KEY_FIXES],
        use_container_width=True, hide_index=True,
        column_config={"ID": st.column_config.TextColumn(width=50),
                       "Fix": st.column_config.TextColumn(width=400),
                       "Layer": st.column_config.TextColumn(width=100),
                       "Sev": st.column_config.TextColumn(width=80)})
    st.markdown("<br>", unsafe_allow_html=True)

    st.markdown("#### Test Suite")
    tc1, tc2 = st.columns([1, 3])
    with tc1:
        if st.button("▸ Run Tests", use_container_width=True):
            with st.spinner("Running tests..."):
                try:
                    res = subprocess.run(
                        ["python3", "-m", "pytest", TESTS_DIR, "-v", "--tb=short", "-q"],
                        capture_output=True, text=True, timeout=60,
                        cwd=str(Path(__file__).resolve().parent))
                    st.session_state.test_output = res.stdout + res.stderr
                    st.session_state.test_rc = res.returncode
                    st.session_state.test_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                except subprocess.TimeoutExpired:
                    st.session_state.test_output = "TIMEOUT"
                    st.session_state.test_rc = -1
                    st.session_state.test_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with tc2:
        if "test_ts" in st.session_state:
            rc = st.session_state.test_rc
            c = GREEN if rc == 0 else RED
            t = "ALL PASSING" if rc == 0 else "FAILURES"
            st.markdown(f'<span style="color:{c}; font-family:JetBrains Mono; font-size:13px;">● {t}</span> '
                        f'<span style="color:{TEXT_MUTED}; font-size:11px;">{st.session_state.test_ts}</span>',
                        unsafe_allow_html=True)
    if "test_output" in st.session_state:
        out = st.session_state.test_output
        summary = [l for l in out.strip().split("\n") if "passed" in l or "failed" in l]
        if summary:
            st.code(summary[-1], language=None)
        with st.expander("Full output"):
            st.code(out[-3000:] if len(out) > 3000 else out, language=None)

    st.markdown("#### Coverage by Layer")
    lt = {"Ledger": 124, "Economics": 85, "Galaxy": 56, "Consensus": 52,
          "Verification": 30, "API": 28, "Integration": 17, "Benchmarks": 7, "Other": 128}
    fig_t = go.Figure(go.Bar(
        x=list(lt.values()), y=list(lt.keys()), orientation="h",
        marker_color=[CYAN, PURPLE, GREEN, YELLOW, ORANGE, "#6366F1", "#A78BFA", TEXT_DIM, TEXT_MUTED],
        text=[str(v) for v in lt.values()], textposition="outside",
        textfont=dict(color=TEXT_DIM, size=11)))
    dark_layout(fig_t, "527 Tests by Layer", 350)
    fig_t.update_xaxes(title="Tests")
    st.plotly_chart(fig_t, use_container_width=True)


# ─── GALAXY ────────────────────────────────────────────────

with tab_galaxy:
    st.subheader("Galaxy Grid")
    if not api_online:
        st.warning("Testnet API offline — start the API to see live galaxy data.")

    gc1, gc2 = st.columns([3, 2])
    with gc1:
        if claims_data and len(claims_data) > 0:
            fig_g = go.Figure(go.Scatter(
                x=[c["x"] for c in claims_data], y=[c["y"] for c in claims_data],
                mode="markers",
                marker=dict(size=[max(6, c["stake"] / 20) for c in claims_data],
                            color=[c["density"] for c in claims_data],
                            colorscale=[[0, "#1a1a2e"], [0.5, PURPLE], [1.0, CYAN]],
                            colorbar=dict(title="Density", tickfont=dict(color=TEXT_DIM)),
                            line=dict(width=1, color="rgba(0,212,255,0.3)")),
                text=[f"({c['x']},{c['y']}) d={c['density']:.3f} s={c['stake']}" for c in claims_data],
                hoverinfo="text"))
            dark_layout(fig_g, f"Live Claims ({len(claims_data)})", 500)
            fig_g.update_xaxes(title="X", range=[GRID_MIN - 100, GRID_MAX + 100])
            fig_g.update_yaxes(title="Y", range=[GRID_MIN - 100, GRID_MAX + 100])
            st.plotly_chart(fig_g, use_container_width=True)
        else:
            fig_e = go.Figure()
            fig_e.add_annotation(x=0, y=0, text="EMPTY GALAXY — awaiting first claim",
                                 font=dict(color=TEXT_MUTED, size=16, family="JetBrains Mono"),
                                 showarrow=False)
            dark_layout(fig_e, "Galaxy Grid", 500)
            fig_e.update_xaxes(title="X", range=[GRID_MIN - 100, GRID_MAX + 100])
            fig_e.update_yaxes(title="Y", range=[GRID_MIN - 100, GRID_MAX + 100])
            st.plotly_chart(fig_e, use_container_width=True)
    with gc2:
        if agents_data and len(agents_data) > 0:
            st.markdown(f"**{len(agents_data)} Agents Online**")
            st.dataframe(
                [{"Tier": a["tier"].upper(), "Coord": f"({a['x']}, {a['y']})",
                  "Stake": a["stake"], "Density": round(a["density"], 3),
                  "Rate": round(a["mining_rate"], 4)} for a in agents_data],
                use_container_width=True, hide_index=True, height=450)
        else:
            st.markdown(
                f'<div style="background:{BG_CARD}; border:1px solid rgba(255,255,255,0.04);'
                f' border-radius:8px; padding:40px 20px; text-align:center; margin-top:20px;">'
                f'<div style="font-size:36px; margin-bottom:12px;">✦</div>'
                f'<div style="color:{TEXT}; font-size:14px; font-family:JetBrains Mono,monospace;'
                f' margin-bottom:8px;">Empty Galaxy</div>'
                f'<div style="color:{TEXT_MUTED}; font-size:12px; font-family:JetBrains Mono,monospace;">'
                f'No agents created yet. The galaxy awaits colonization.</div></div>', unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════
#  Footer
# ═══════════════════════════════════════════════════════════════

st.markdown("---")
st.markdown(
    f'<div style="text-align:center; color:{TEXT_MUTED}; font-size:10px; font-family:JetBrains Mono,monospace;">'
    f'AGENTIC CHAIN v0.3 — PoAIV — 527 Tests — Zero Genesis — {datetime.now().strftime("%Y-%m-%d %H:%M")}'
    f'</div>', unsafe_allow_html=True)
