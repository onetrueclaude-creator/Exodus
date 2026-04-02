"""Agentic Chain — Interactive Tokenomics Dashboard."""
from __future__ import annotations
import sys
from pathlib import Path

# Ensure the simulator root is on sys.path so `agentic.*` imports resolve
# when Streamlit runs this file directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

from agentic.economics.inflation import InflationModel
from agentic.params import (
    GENESIS_SUPPLY,
    FEE_BURN_RATE, ALPHA, BETA,
    DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS, DIST_PROFESSIONAL,
    REWARD_SPLIT_ORDERER, REWARD_SPLIT_VERIFIER, REWARD_SPLIT_STAKER,
)

# TODO(v2): redesign dashboard for organic growth model.
# Legacy constants kept for backward-compat dashboard display.
_LEGACY_TOTAL_SUPPLY = 21_000_000
_LEGACY_INITIAL_CIRCULATING = 6_300_000
_LEGACY_INITIAL_RATE = 0.10
_LEGACY_DISINFLATION = 0.10
_LEGACY_FLOOR = 0.01

# Aliases for v2 faction names
DIST_TREASURY = DIST_PROFESSIONAL
DIST_TEAM = DIST_FOUNDERS
DIST_AGENTS = DIST_MACHINES
TOTAL_SUPPLY = _LEGACY_TOTAL_SUPPLY
INITIAL_CIRCULATING = _LEGACY_INITIAL_CIRCULATING
INITIAL_INFLATION_RATE = _LEGACY_INITIAL_RATE
DISINFLATION_RATE = _LEGACY_DISINFLATION
INFLATION_FLOOR = _LEGACY_FLOOR

# ── Design tokens (matching zkagentic-site) ──────────────────────────
BG_DARK = "#0A0A0F"
BG_LIGHT = "#12121A"
ACCENT_CYAN = "#00D4FF"
ACCENT_PURPLE = "#8B5CF6"
TEXT_PRIMARY = "#F8FAFC"
TEXT_SECONDARY = "#94A3B8"
TEXT_MUTED = "#64748B"
CARD_BG = "rgba(255,255,255,0.03)"
CARD_BORDER = "rgba(255,255,255,0.06)"
GREEN = "#4ADE80"
RED = "#F87171"

# Plotly template matching the site
PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, sans-serif", color=TEXT_SECONDARY, size=13),
    xaxis=dict(
        gridcolor="rgba(255,255,255,0.04)", zerolinecolor="rgba(255,255,255,0.06)",
        title_font=dict(color=TEXT_MUTED), tickfont=dict(color=TEXT_MUTED),
    ),
    yaxis=dict(
        gridcolor="rgba(255,255,255,0.04)", zerolinecolor="rgba(255,255,255,0.06)",
        title_font=dict(color=TEXT_MUTED), tickfont=dict(color=TEXT_MUTED),
    ),
    legend=dict(font=dict(color=TEXT_SECONDARY)),
    margin=dict(t=20, b=40, l=55, r=20),
)


def styled_chart(fig: go.Figure, height: int = 320) -> go.Figure:
    """Apply site-consistent dark theme to any Plotly figure."""
    fig.update_layout(**PLOTLY_LAYOUT, height=height)
    return fig


# ── Page config ──────────────────────────────────────────────────────
st.set_page_config(
    page_title="Agentic Chain — Tokenomics",
    page_icon="\u26d3",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Global CSS ───────────────────────────────────────────────────────
st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

    /* Root overrides */
    .stApp {{
        background: {BG_DARK};
        color: {TEXT_PRIMARY};
        font-family: 'Inter', sans-serif;
    }}
    .stApp header {{ background: transparent !important; }}
    [data-testid="stStatusWidget"] {{ display: none !important; }}
    .stApp [data-testid="stSidebar"] {{ background: {BG_LIGHT}; }}

    /* Typography */
    h1, h2, h3, h4, h5, h6 {{
        font-family: 'Space Grotesk', sans-serif !important;
        color: {TEXT_PRIMARY} !important;
        font-weight: 600 !important;
    }}
    p, li, span, label, .stMarkdown {{
        color: {TEXT_SECONDARY};
    }}

    /* Metric cards */
    [data-testid="stMetric"] {{
        background: {CARD_BG};
        border: 1px solid {CARD_BORDER};
        border-radius: 12px;
        padding: 1rem 1.25rem;
        backdrop-filter: blur(8px);
    }}
    [data-testid="stMetricLabel"] {{
        font-family: 'Inter', sans-serif !important;
        font-size: 0.75rem !important;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: {TEXT_MUTED} !important;
    }}
    [data-testid="stMetricLabel"] p {{
        color: {TEXT_MUTED} !important;
    }}
    [data-testid="stMetricValue"] {{
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 1.5rem !important;
        color: {TEXT_PRIMARY} !important;
    }}

    /* Remove default Streamlit gaps */
    .stPlotlyChart {{ margin-top: -0.5rem; margin-bottom: -0.5rem; }}
    .block-container {{ padding-top: 2rem; padding-bottom: 2rem; }}

    /* Horizontal rules → subtle */
    hr {{ border-color: {CARD_BORDER} !important; margin: 1.5rem 0 !important; }}

    /* Glass card helper */
    .glass-card {{
        background: {CARD_BG};
        border: 1px solid {CARD_BORDER};
        border-radius: 12px;
        padding: 1.5rem;
        backdrop-filter: blur(8px);
    }}
    .glass-card h3 {{
        margin-top: 0 !important;
        font-size: 1.1rem !important;
    }}

    /* Gradient text helper */
    .gradient-text {{
        background-image: linear-gradient(to right, {ACCENT_CYAN}, {ACCENT_PURPLE});
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        display: inline;
    }}

    /* Subheader styling */
    .section-title {{
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.35rem;
        font-weight: 600;
        color: {TEXT_PRIMARY};
        margin-bottom: 0.75rem;
    }}

    /* Slider and input theming */
    .stSlider > div > div > div {{ color: {TEXT_MUTED}; }}
    .stNumberInput label, .stSlider label {{ color: {TEXT_SECONDARY} !important; }}

    /* Success / warning boxes */
    .stAlert {{
        border-radius: 12px !important;
        border: 1px solid {CARD_BORDER} !important;
    }}

    /* Katex math */
    .katex {{ color: {TEXT_PRIMARY} !important; }}

    /* Param table */
    .param-table {{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-family: 'Inter', sans-serif;
        font-size: 0.85rem;
    }}
    .param-table th {{
        text-align: left;
        padding: 0.6rem 1rem;
        color: {TEXT_MUTED};
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.7rem;
        border-bottom: 1px solid {CARD_BORDER};
    }}
    .param-table td {{
        padding: 0.55rem 1rem;
        color: {TEXT_SECONDARY};
        border-bottom: 1px solid rgba(255,255,255,0.03);
    }}
    .param-table td:nth-child(2) {{
        font-family: 'JetBrains Mono', monospace;
        color: {ACCENT_CYAN};
    }}

    /* Calculator result */
    .calc-result {{
        background: linear-gradient(135deg, rgba(0,212,255,0.08), rgba(139,92,246,0.08));
        border: 1px solid rgba(0,212,255,0.2);
        border-radius: 12px;
        padding: 1.5rem;
    }}
    .calc-result .big-number {{
        font-family: 'JetBrains Mono', monospace;
        font-size: 2rem;
        font-weight: 700;
    }}
</style>
""", unsafe_allow_html=True)


# ── Header ───────────────────────────────────────────────────────────
st.markdown(f"""
<div style="text-align:center; padding: 1.5rem 0 0.5rem;">
    <h1 style="font-size:2.5rem; font-weight:700; margin-bottom:0.25rem;">
        <span class="gradient-text">AGENTIC CHAIN</span>
    </h1>
    <p style="color:{TEXT_MUTED}; font-size:1rem; margin:0; letter-spacing:0.04em;">
        Privacy-Preserving L1 &nbsp;·&nbsp; ZK-CPU Dual Staking &nbsp;·&nbsp; Tokenomics
    </p>
</div>
""", unsafe_allow_html=True)


# ── Key Metrics Row ──────────────────────────────────────────────────
st.markdown("")
col1, col2, col3, col4, col5 = st.columns(5)
col1.metric("Total Supply", f"{TOTAL_SUPPLY / 1e9:.0f}B AGNTC")
col2.metric("Genesis Circulating", f"{INITIAL_CIRCULATING / 1e6:.0f}M AGNTC")
col3.metric("Initial Inflation", f"{INITIAL_INFLATION_RATE * 100:.0f}%")
col4.metric("Fee Burn Rate", f"{FEE_BURN_RATE * 100:.0f}%")
col5.metric("Inflation Floor", f"{INFLATION_FLOOR * 100:.1f}%")


# ── Compute projection ──────────────────────────────────────────────
model = InflationModel(
    monthly_fee_revenue=500_000.0,
    fee_growth_rate=0.03,
    staking_participation=0.65,
)
projections = model.project(years=10)
proj_df = pd.DataFrame(projections)


# ── Section 1: Distribution + Inflation/Supply ───────────────────────
st.markdown("---")
col_pie, col_charts = st.columns([1, 2])

with col_pie:
    st.markdown('<p class="section-title">Token Distribution</p>', unsafe_allow_html=True)
    dist_data = pd.DataFrame({
        "Category": [
            "Community Staking Pool",
            "Foundation Reserve",
            "Team & Advisors (4yr vest)",
            "AI Verification Agents",
        ],
        "Share": [DIST_COMMUNITY, DIST_TREASURY, DIST_TEAM, DIST_AGENTS],
    })
    fig_pie = px.pie(
        dist_data, values="Share", names="Category",
        hole=0.45,
        color_discrete_sequence=[ACCENT_CYAN, ACCENT_PURPLE, "#6366F1", "#A78BFA"],
    )
    fig_pie.update_traces(
        textinfo="percent",
        textposition="inside",
        insidetextorientation="horizontal",
        textfont=dict(family="JetBrains Mono", size=12, color=TEXT_PRIMARY),
        marker=dict(line=dict(color=BG_DARK, width=2)),
    )
    styled_chart(fig_pie, height=520)
    fig_pie.update_layout(
        showlegend=True,
        legend=dict(
            font=dict(family="Inter", size=12, color=TEXT_SECONDARY),
            orientation="h",
            yanchor="top", y=-0.05,
            xanchor="center", x=0.5,
        ),
    )
    st.plotly_chart(fig_pie, use_container_width=True)

    # Community pool explanation
    st.markdown(f"""
    <div class="glass-card" style="border-left:3px solid {ACCENT_CYAN}; padding:0.75rem 1rem;">
        <p style="color:{TEXT_SECONDARY}; font-size:0.8rem; margin:0; line-height:1.6;">
            <strong style="color:{TEXT_PRIMARY};">Community Staking Pool (30%)</strong><br>
            Not airdropped. Emitted gradually to users who opt into free community staking
            on our website. More CPU delegated = more share from the pool.
        </p>
    </div>
    """, unsafe_allow_html=True)

with col_charts:
    st.markdown('<p class="section-title">Inflation Rate and Circulating Supply</p>',
                unsafe_allow_html=True)

    # Inflation Rate
    fig_inf = go.Figure()
    fig_inf.add_trace(go.Scatter(
        x=proj_df["year"], y=proj_df["inflation_rate"] * 100,
        mode="lines", name="Inflation Rate",
        line=dict(color=ACCENT_CYAN, width=2.5),
        fill="tozeroy", fillcolor="rgba(0,212,255,0.06)",
    ))
    fig_inf.add_hline(
        y=INFLATION_FLOOR * 100, line_dash="dot", line_color=ACCENT_PURPLE,
        annotation_text=f"Floor {INFLATION_FLOOR*100:.1f}%",
        annotation_font=dict(color=ACCENT_PURPLE, size=11),
    )
    styled_chart(fig_inf, height=240)
    fig_inf.update_layout(
        yaxis_title="Annual Rate (%)",
        yaxis_range=[0, INITIAL_INFLATION_RATE * 100 * 1.2],
        xaxis_title="",
    )
    st.plotly_chart(fig_inf, use_container_width=True)

    # Circulating Supply
    fig_sup = go.Figure()
    fig_sup.add_trace(go.Scatter(
        x=proj_df["year"], y=proj_df["circulating_supply"] / 1e6,
        mode="lines", name="Circulating Supply",
        line=dict(color=GREEN, width=2.5),
        fill="tozeroy", fillcolor="rgba(74,222,128,0.06)",
    ))
    fig_sup.add_hline(
        y=INITIAL_CIRCULATING / 1e6, line_dash="dot", line_color=TEXT_MUTED,
        annotation_text=f"Genesis: {INITIAL_CIRCULATING/1e6:.0f}M",
        annotation_font=dict(color=TEXT_MUTED, size=11),
    )
    styled_chart(fig_sup, height=240)
    fig_sup.update_layout(xaxis_title="Year", yaxis_title="Millions AGNTC")
    st.plotly_chart(fig_sup, use_container_width=True)


# ── Section 2: Vesting Schedule ───────────────────────────────────────
st.markdown("---")
st.markdown('<p class="section-title">Token Vesting Schedule</p>', unsafe_allow_html=True)

# Vesting parameters (months)
VESTING = {
    "Community Pool":      {"share": DIST_COMMUNITY,  "cliff": 12, "linear": 48, "color": ACCENT_CYAN},
    "Foundation Reserve":  {"share": DIST_TREASURY,   "cliff": 6,  "linear": 48, "color": "#6366F1"},
    "Team & Advisors":     {"share": DIST_TEAM,       "cliff": 12, "linear": 48, "color": ACCENT_PURPLE},
    "AI Agents":           {"share": DIST_AGENTS,     "cliff": 0,  "linear": 36, "color": "#A78BFA"},
}

vest_months = 60  # 5 years
fig_vest = go.Figure()
for name, v in VESTING.items():
    tokens = TOTAL_SUPPLY * v["share"]
    unlocked = []
    for m in range(vest_months + 1):
        if v["linear"] == 0:
            unlocked.append(tokens)
        elif m < v["cliff"]:
            unlocked.append(0)
        else:
            vested_months = min(m - v["cliff"], v["linear"])
            unlocked.append(tokens * vested_months / v["linear"])
    fig_vest.add_trace(go.Scatter(
        x=list(range(vest_months + 1)),
        y=[u / 1e6 for u in unlocked],
        mode="lines", name=name,
        line=dict(color=v["color"], width=2),
        stackgroup="one",
    ))
styled_chart(fig_vest, height=360)
fig_vest.update_layout(
    xaxis_title="Month", yaxis_title="Unlocked Tokens (Millions)",
    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5,
                bgcolor="rgba(0,0,0,0)"),
    hovermode="x unified",
)
st.plotly_chart(fig_vest, use_container_width=True)

# Vesting summary table
vest_html = f"""
<div class="glass-card" style="padding:0.5rem 0; margin-top:0.5rem;">
<table class="param-table">
<tr><th>Allocation</th><th>Share</th><th>Tokens</th><th>Cliff</th><th>Vesting</th></tr>
"""
for name, v in VESTING.items():
    tokens = TOTAL_SUPPLY * v["share"]
    cliff_str = f'{v["cliff"]}mo' if v["cliff"] > 0 else "None"
    vest_str = f'{v["linear"]}mo linear' if v["linear"] > 0 else "Fully unlocked"
    vest_html += (
        f'<tr><td>{name}</td><td>{v["share"]:.0%}</td>'
        f'<td style="font-family:JetBrains Mono,monospace;color:{ACCENT_CYAN}">'
        f'{tokens/1e6:.0f}M</td>'
        f'<td>{cliff_str}</td><td>{vest_str}</td></tr>'
    )
vest_html += "</table></div>"
st.markdown(vest_html, unsafe_allow_html=True)


# ── Section 3: ZK-CPU Staking Model ─────────────────────────────────
st.markdown("---")
st.markdown('<p class="section-title">ZK-CPU Dual Staking Model</p>', unsafe_allow_html=True)
col_formula, col_weights = st.columns([1, 1])

with col_formula:
    st.markdown(f"""
<div class="glass-card">
<p style="color:{TEXT_SECONDARY}; line-height:1.7; margin-bottom:1rem;">
The <strong style="color:{TEXT_PRIMARY}">effective stake</strong> determines each validator's
share of block rewards:
</p>
</div>
""", unsafe_allow_html=True)

    st.latex(
        rf"S_{{\mathrm{{eff}}}} = {ALPHA}\;\cdot\;"
        rf"\frac{{\text{{token stake}}}}{{\text{{total tokens}}}}"
        rf"\;+\; {BETA}\;\cdot\;"
        rf"\frac{{\text{{CPU (VPU)}}}}{{\text{{total CPU}}}}"
    )

    st.markdown(f"""
<div class="glass-card" style="margin-top:0.75rem;">
<p style="color:{TEXT_SECONDARY}; line-height:1.7; margin:0;">
With <strong style="color:{ACCENT_CYAN}">&beta; = {BETA:.0%}</strong> &gt;
<strong style="color:{ACCENT_PURPLE}">&alpha; = {ALPHA:.0%}</strong>, validators who contribute
stronger ZK proof hardware earn proportionally more than pure-capital stakers —
preventing plutocratic concentration and incentivizing computational investment.
</p>
</div>
""", unsafe_allow_html=True)

with col_weights:
    fig_weights = go.Figure()
    fig_weights.add_trace(go.Bar(
        x=["Token Weight (\u03b1)", "CPU Weight (\u03b2)"],
        y=[ALPHA, BETA],
        marker_color=[ACCENT_PURPLE, ACCENT_CYAN],
        marker_line=dict(color=BG_DARK, width=1),
        text=[f"{ALPHA:.0%}", f"{BETA:.0%}"],
        textposition="outside",
        textfont=dict(family="JetBrains Mono", size=16, color=TEXT_PRIMARY),
    ))
    styled_chart(fig_weights, height=320)
    fig_weights.update_layout(
        yaxis_title="Weight in Effective Stake",
        yaxis_range=[0, 1],
        showlegend=False,
    )
    st.plotly_chart(fig_weights, use_container_width=True)


# ── Section 4: Reward Distribution + Protocol Parameters ─────────────
st.markdown("---")
col_rewards, col_params_sec = st.columns([1, 2])

with col_rewards:
    st.markdown('<p class="section-title">Block Reward Split</p>', unsafe_allow_html=True)
    fig_rewards = go.Figure()
    fig_rewards.add_trace(go.Bar(
        x=[REWARD_SPLIT_VERIFIER, REWARD_SPLIT_STAKER, REWARD_SPLIT_ORDERER],
        y=["Verifiers (ZK proofs)", "Stakers (delegators)", "Orderer (proposer)"],
        orientation="h",
        marker_color=[ACCENT_CYAN, ACCENT_PURPLE, "#6366F1"],
        text=[f"{REWARD_SPLIT_VERIFIER:.0%}", f"{REWARD_SPLIT_STAKER:.0%}", f"{REWARD_SPLIT_ORDERER:.0%}"],
        textposition="auto",
        textfont=dict(family="JetBrains Mono", size=14, color=TEXT_PRIMARY),
    ))
    styled_chart(fig_rewards, height=200)
    fig_rewards.update_layout(
        xaxis=dict(visible=False),
        yaxis=dict(tickfont=dict(size=12)),
        showlegend=False,
        margin=dict(t=10, b=10, l=150, r=20),
    )
    st.plotly_chart(fig_rewards, use_container_width=True)

with col_params_sec:
    st.markdown('<p class="section-title">Protocol Parameters</p>', unsafe_allow_html=True)
    params_html = f"""
    <div class="glass-card" style="padding:0.5rem 0;">
    <table class="param-table">
    <tr><th>Parameter</th><th>Value</th><th>Rationale</th></tr>
    <tr><td>Genesis Circulating</td><td>{INITIAL_CIRCULATING/1e6:.0f}M</td><td>Minimal initial supply — all other tokens vest over time</td></tr>
    <tr><td>Inflation Start</td><td>{INITIAL_INFLATION_RATE*100:.0f}%</td><td>Balanced early incentive for ZK prover network bootstrap</td></tr>
    <tr><td>Disinflation</td><td>{DISINFLATION_RATE*100:.0f}%/yr</td><td>Fast decay rewards early adopters, creates urgency to stake</td></tr>
    <tr><td>Inflation Floor</td><td>{INFLATION_FLOOR*100:.1f}%</td><td>Permanent staking incentive at network maturity</td></tr>
    <tr><td>Fee Burn</td><td>{FEE_BURN_RATE*100:.0f}%</td><td>Half of fees burned, half to verifiers and treasury</td></tr>
    <tr><td>CPU Weight (&beta;)</td><td>{BETA:.0%}</td><td>Rewards computational contribution over capital</td></tr>
    <tr><td>Token Weight (&alpha;)</td><td>{ALPHA:.0%}</td><td>Capital participation in consensus with Sybil resistance</td></tr>
    <tr><td>Orderer Split</td><td>{REWARD_SPLIT_ORDERER:.0%}</td><td>Block proposer reward share</td></tr>
    <tr><td>Verifier Split</td><td>{REWARD_SPLIT_VERIFIER:.0%}</td><td>ZK proof generation reward — largest share for hardest work</td></tr>
    <tr><td>Staker Split</td><td>{REWARD_SPLIT_STAKER:.0%}</td><td>Delegator / passive staking share</td></tr>
    </table>
    </div>
    """
    st.markdown(params_html, unsafe_allow_html=True)


# ── Section 5: 10-Year Projection ────────────────────────────────────
st.markdown("---")
st.markdown('<p class="section-title" style="font-size:1.5rem;">10-Year Tokenomics Projection</p>',
            unsafe_allow_html=True)

proj_col1, proj_col2, proj_col3 = st.columns(3)
with proj_col1:
    st.metric("Starting Monthly Fee Revenue", "500,000 AGNTC")
with proj_col2:
    st.metric("Monthly Fee Growth", "3%")
with proj_col3:
    st.metric("Staking Participation", "65%")

# Row 1: Crossover + Staking Yield
col_cross, col_yield = st.columns(2)

with col_cross:
    st.markdown(f'<p class="section-title" style="font-size:1rem;">Sustainability Crossover</p>',
                unsafe_allow_html=True)
    fig_cross = go.Figure()
    fig_cross.add_trace(go.Scatter(
        x=proj_df["year"], y=proj_df["monthly_inflation"] / 1e6,
        mode="lines", name="Inflation Issuance",
        line=dict(color=RED, width=2),
    ))
    fig_cross.add_trace(go.Scatter(
        x=proj_df["year"], y=proj_df["monthly_fee_revenue"] / 1e6,
        mode="lines", name="Fee Revenue",
        line=dict(color=ACCENT_CYAN, width=2),
    ))
    styled_chart(fig_cross, height=300)
    fig_cross.update_layout(
        xaxis_title="Year", yaxis_title="Monthly (M AGNTC)",
        legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01,
                    bgcolor="rgba(0,0,0,0)"),
    )
    st.plotly_chart(fig_cross, use_container_width=True)

    crossover = None
    for p in projections:
        if p["month"] > 0 and p["monthly_fee_revenue"] > p["monthly_inflation"]:
            crossover = p
            break
    if crossover:
        st.markdown(
            f'<div class="glass-card" style="border-left:3px solid {ACCENT_CYAN}; padding:0.75rem 1rem;">'
            f'<span style="color:{GREEN};">&#10003;</span> '
            f'<span style="color:{TEXT_SECONDARY};">Sustainability crossover at '
            f'<strong style="color:{TEXT_PRIMARY};">Year {crossover["year"]:.1f}</strong> '
            f'(Month {crossover["month"]}): fee revenue exceeds inflation issuance.</span></div>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f'<div class="glass-card" style="border-left:3px solid {RED}; padding:0.75rem 1rem;">'
            f'<span style="color:{TEXT_SECONDARY};">No crossover within 10-year projection. '
            f'Fee revenue needs to exceed inflation issuance for sustainability.</span></div>',
            unsafe_allow_html=True,
        )

with col_yield:
    st.markdown(f'<p class="section-title" style="font-size:1rem;">Staking Yield (APY)</p>',
                unsafe_allow_html=True)
    fig_yield = go.Figure()
    fig_yield.add_trace(go.Scatter(
        x=proj_df["year"], y=proj_df["staking_yield_annual"] * 100,
        mode="lines", name="Staking APY",
        line=dict(color=ACCENT_PURPLE, width=2.5),
        fill="tozeroy", fillcolor="rgba(139,92,246,0.08)",
    ))
    styled_chart(fig_yield, height=300)
    fig_yield.update_layout(xaxis_title="Year", yaxis_title="APY (%)")
    st.plotly_chart(fig_yield, use_container_width=True)

# Row 2: Net issuance
st.markdown(f'<p class="section-title" style="font-size:1rem;">Net Monthly Issuance (Inflation − Burn)</p>',
            unsafe_allow_html=True)
fig_net = go.Figure()
fig_net.add_trace(go.Bar(
    x=proj_df["year"],
    y=proj_df["net_monthly_issuance"] / 1e6,
    marker_color=[GREEN if v < 0 else RED for v in proj_df["net_monthly_issuance"]],
    marker_line=dict(width=0),
    name="Net Issuance",
))
fig_net.add_hline(y=0, line_color="rgba(255,255,255,0.15)", line_width=1)
styled_chart(fig_net, height=300)
fig_net.update_layout(
    xaxis_title="Year", yaxis_title="Millions AGNTC / month",
    bargap=0.02,
)
st.plotly_chart(fig_net, use_container_width=True)

# Row 3: Cumulative burn vs inflation
col_burn, col_summary = st.columns([2, 1])

with col_burn:
    st.markdown(f'<p class="section-title" style="font-size:1rem;">Cumulative Inflation vs Burn</p>',
                unsafe_allow_html=True)
    fig_cum = go.Figure()
    fig_cum.add_trace(go.Scatter(
        x=proj_df["year"], y=proj_df["total_inflation_issued"] / 1e6,
        mode="lines", name="Total Inflated",
        line=dict(color=RED, width=2),
        fill="tozeroy", fillcolor="rgba(248,113,113,0.06)",
    ))
    fig_cum.add_trace(go.Scatter(
        x=proj_df["year"], y=proj_df["total_burned"] / 1e6,
        mode="lines", name="Total Burned",
        line=dict(color=GREEN, width=2),
        fill="tozeroy", fillcolor="rgba(74,222,128,0.06)",
    ))
    styled_chart(fig_cum, height=300)
    fig_cum.update_layout(
        xaxis_title="Year", yaxis_title="Cumulative (Millions AGNTC)",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5,
                    bgcolor="rgba(0,0,0,0)"),
    )
    st.plotly_chart(fig_cum, use_container_width=True)

with col_summary:
    st.markdown(f'<p class="section-title" style="font-size:1rem;">10-Year Summary</p>',
                unsafe_allow_html=True)
    final = projections[-1]
    total_inflated = final["total_inflation_issued"]
    total_burned = final["total_burned"]
    net_change = total_inflated - total_burned
    final_supply = final["circulating_supply"]

    summary_html = f"""
    <div class="glass-card">
        <div style="margin-bottom:1rem;">
            <span style="color:{TEXT_MUTED}; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em;">Genesis Circulating</span><br>
            <span style="font-family:'JetBrains Mono'; font-size:1.3rem; color:{ACCENT_CYAN};">{INITIAL_CIRCULATING/1e6:.0f}M</span>
        </div>
        <div style="margin-bottom:1rem;">
            <span style="color:{TEXT_MUTED}; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em;">Total Inflated</span><br>
            <span style="font-family:'JetBrains Mono'; font-size:1.3rem; color:{RED};">+{total_inflated/1e6:,.0f}M</span>
        </div>
        <div style="margin-bottom:1rem;">
            <span style="color:{TEXT_MUTED}; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em;">Total Burned</span><br>
            <span style="font-family:'JetBrains Mono'; font-size:1.3rem; color:{GREEN};">-{total_burned/1e6:,.0f}M</span>
        </div>
        <div style="margin-bottom:1rem; padding-top:0.75rem; border-top:1px solid {CARD_BORDER};">
            <span style="color:{TEXT_MUTED}; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em;">Net Change</span><br>
            <span style="font-family:'JetBrains Mono'; font-size:1.3rem; color:{GREEN if net_change < 0 else RED};">
                {"" if net_change < 0 else "+"}{net_change/1e6:,.0f}M
            </span>
        </div>
        <div style="padding-top:0.75rem; border-top:1px solid {CARD_BORDER};">
            <span style="color:{TEXT_MUTED}; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em;">Final Supply (Yr 10)</span><br>
            <span style="font-family:'JetBrains Mono'; font-size:1.3rem; color:{ACCENT_CYAN};">{final_supply/1e6:,.0f}M</span>
        </div>
    </div>
    """
    st.markdown(summary_html, unsafe_allow_html=True)


# ── Section 6: Staking Reward Calculator ─────────────────────────────
st.markdown("---")
st.markdown('<p class="section-title" style="font-size:1.5rem;">Staking Reward Calculator</p>',
            unsafe_allow_html=True)
st.markdown(f'<p style="color:{TEXT_SECONDARY}; margin-top:-0.5rem; margin-bottom:1rem;">'
            f'Estimate your AGNTC staking rewards based on token stake and CPU delegation.</p>',
            unsafe_allow_html=True)

calc_col1, calc_col2, calc_col3 = st.columns([1, 1, 1])

with calc_col1:
    user_tokens = st.number_input(
        "Your Token Stake (AGNTC)",
        min_value=0, max_value=100_000_000, value=100_000, step=10_000,
    )
    user_cpu_vcpus = st.number_input(
        "Your CPU Delegation (vCPUs)",
        min_value=0, max_value=10_000, value=8, step=1,
        help="Number of virtual CPUs dedicated to verification",
    )

with calc_col2:
    network_total_staked = st.number_input(
        "Network Total Staked (AGNTC)",
        min_value=1_000_000, max_value=500_000_000, value=200_000_000, step=10_000_000,
    )
    network_total_cpu = st.number_input(
        "Network Total CPU (vCPUs)",
        min_value=100, max_value=10_000_000, value=50_000, step=1_000,
    )

with calc_col3:
    if network_total_staked > 0 and network_total_cpu > 0:
        token_share = user_tokens / network_total_staked
        cpu_share = user_cpu_vcpus / network_total_cpu
        effective_stake = ALPHA * token_share + BETA * cpu_share

        # Annual rewards from Year 1 inflation
        year1_rate = projections[12]["inflation_rate"] if len(projections) > 12 else INITIAL_INFLATION_RATE
        year1_supply = projections[12]["circulating_supply"] if len(projections) > 12 else INITIAL_CIRCULATING
        annual_inflation_pool = year1_supply * year1_rate
        annual_verifier_pool = annual_inflation_pool * REWARD_SPLIT_VERIFIER
        annual_staker_pool = annual_inflation_pool * REWARD_SPLIT_STAKER

        user_annual_verifier_reward = annual_verifier_pool * effective_stake
        user_annual_staker_reward = annual_staker_pool * token_share
        user_total_annual = user_annual_verifier_reward + user_annual_staker_reward

        personal_apy = (user_total_annual / user_tokens * 100) if user_tokens > 0 else 0.0

        st.markdown(f"""
        <div class="calc-result">
            <span style="color:{TEXT_MUTED}; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em;">
                Your Effective Stake
            </span><br>
            <span class="big-number" style="color:{ACCENT_CYAN};">{effective_stake:.6f}</span>
            <span style="color:{TEXT_MUTED}; font-size:0.8rem;"> ({effective_stake*100:.4f}%)</span>
            <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid {CARD_BORDER};">
                <span style="color:{TEXT_MUTED}; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em;">
                    Est. Annual Rewards (Year 1)
                </span><br>
                <span class="big-number" style="color:{GREEN};">{user_total_annual:,.0f}</span>
                <span style="color:{TEXT_MUTED}; font-size:0.8rem;"> AGNTC</span>
            </div>
            <div style="margin-top:0.75rem;">
                <span style="color:{TEXT_MUTED}; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em;">
                    Personal APY
                </span><br>
                <span class="big-number" style="color:{ACCENT_PURPLE};">{personal_apy:.1f}%</span>
            </div>
            <div style="margin-top:0.75rem; font-size:0.75rem; color:{TEXT_MUTED};">
                Token contribution: {ALPHA*token_share*100:.4f}% &nbsp;&middot;&nbsp;
                CPU contribution: {BETA*cpu_share*100:.4f}%
            </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.info("Enter network totals to calculate rewards.")


# ── Section 7: CPU Delegation Cost Model ─────────────────────────────
st.markdown("---")
st.markdown('<p class="section-title" style="font-size:1.5rem;">CPU Delegation Cost Model</p>',
            unsafe_allow_html=True)
st.markdown(f'<p style="color:{TEXT_SECONDARY}; margin-top:-0.5rem; margin-bottom:1rem;">'
            f'Estimate the real-world cost of running verification agents and expected ROI.</p>',
            unsafe_allow_html=True)

cpu_col1, cpu_col2, cpu_col3 = st.columns(3)

with cpu_col1:
    electricity_kwh = st.number_input(
        "Electricity Cost ($/kWh)",
        min_value=0.01, max_value=1.00, value=0.12, step=0.01,
        format="%.2f",
    )
    cpu_tdp_watts = st.number_input(
        "CPU TDP (Watts)",
        min_value=15, max_value=500, value=65, step=5,
        help="Thermal Design Power of your CPU",
    )

with cpu_col2:
    hours_per_day = st.slider(
        "Hours Running / Day",
        min_value=1, max_value=24, value=24, step=1,
    )
    agntc_price_usd = st.number_input(
        "Assumed AGNTC Price (USD)",
        min_value=0.001, max_value=100.0, value=0.10, step=0.01,
        format="%.3f",
        help="Projected token price for ROI calculation",
    )

with cpu_col3:
    daily_kwh = (cpu_tdp_watts / 1000) * hours_per_day
    monthly_kwh = daily_kwh * 30
    monthly_electricity_cost = monthly_kwh * electricity_kwh
    annual_electricity_cost = monthly_electricity_cost * 12

    estimated_vcpus = max(1, int(cpu_tdp_watts / 8))

    if network_total_cpu > 0:
        cpu_share_est = estimated_vcpus / network_total_cpu
        est_eff_stake = BETA * cpu_share_est
        year1_rate_est = projections[12]["inflation_rate"] if len(projections) > 12 else INITIAL_INFLATION_RATE
        year1_supply_est = projections[12]["circulating_supply"] if len(projections) > 12 else INITIAL_CIRCULATING
        est_annual_pool = year1_supply_est * year1_rate_est * REWARD_SPLIT_VERIFIER
        est_annual_agntc = est_annual_pool * est_eff_stake
        est_annual_usd = est_annual_agntc * agntc_price_usd
        net_profit = est_annual_usd - annual_electricity_cost
        roi_pct = (net_profit / annual_electricity_cost * 100) if annual_electricity_cost > 0 else 0

        profit_color = GREEN if net_profit > 0 else RED

        st.markdown(f"""
        <div class="calc-result">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div>
                    <span style="color:{TEXT_MUTED}; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em;">
                        Monthly Electricity
                    </span><br>
                    <span style="font-family:'JetBrains Mono'; font-size:1.2rem; color:{RED};">
                        ${monthly_electricity_cost:.2f}
                    </span>
                </div>
                <div>
                    <span style="color:{TEXT_MUTED}; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em;">
                        Est. vCPUs
                    </span><br>
                    <span style="font-family:'JetBrains Mono'; font-size:1.2rem; color:{ACCENT_CYAN};">
                        {estimated_vcpus}
                    </span>
                </div>
            </div>
            <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid {CARD_BORDER};">
                <span style="color:{TEXT_MUTED}; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em;">
                    Est. Annual Reward
                </span><br>
                <span style="font-family:'JetBrains Mono'; font-size:1.2rem; color:{GREEN};">
                    {est_annual_agntc:,.0f} AGNTC
                </span>
                <span style="color:{TEXT_MUTED}; font-size:0.75rem;"> (${est_annual_usd:,.2f})</span>
            </div>
            <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid {CARD_BORDER};">
                <span style="color:{TEXT_MUTED}; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em;">
                    Net Annual Profit
                </span><br>
                <span style="font-family:'JetBrains Mono'; font-size:1.5rem; color:{profit_color};">
                    {"+" if net_profit > 0 else ""}${net_profit:,.2f}
                </span>
                <span style="color:{TEXT_MUTED}; font-size:0.75rem;"> ({roi_pct:+.0f}% ROI)</span>
            </div>
        </div>
        """, unsafe_allow_html=True)


# ── Footer ───────────────────────────────────────────────────────────
st.markdown(f"""
<div style="text-align:center; padding:2rem 0 1rem; border-top:1px solid {CARD_BORDER}; margin-top:2rem;">
    <p style="color:{TEXT_MUTED}; font-size:0.8rem; margin:0;">
        <span class="gradient-text" style="font-weight:600;">Agentic Chain</span>
        &nbsp;·&nbsp; Privacy-Preserving L1 with ZK-CPU Dual Staking
    </p>
    <p style="color:{TEXT_MUTED}; font-size:0.7rem; margin:0.25rem 0 0;">
        All projections are simulations — not financial advice
    </p>
</div>
""", unsafe_allow_html=True)
