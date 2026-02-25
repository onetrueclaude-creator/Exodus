#!/usr/bin/env python3
"""Agentic Chain — Genesis Simulation Dashboard (Streamlit)."""
from __future__ import annotations

import streamlit as st
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from dataclasses import dataclass, field

from agentic.params import (
    GENESIS_SUPPLY, ALPHA, BETA, SLOTS_PER_EPOCH,
    FEE_BURN_RATE, REWARD_SPLIT_ORDERER, REWARD_SPLIT_VERIFIER,
    REWARD_SPLIT_STAKER, DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS,
    DIST_PROFESSIONAL,
)

# TODO(v2): redesign dashboard for organic growth model.
# Legacy constants kept for backward-compat dashboard display.
TOTAL_SUPPLY = 21_000_000
INITIAL_INFLATION_RATE = 0.10
DISINFLATION_RATE = 0.10
INFLATION_FLOOR = 0.01

# Aliases for v2 faction names
DIST_TREASURY = DIST_PROFESSIONAL
DIST_TEAM = DIST_FOUNDERS
DIST_AGENTS = DIST_MACHINES
from agentic.ledger.state import LedgerState
from agentic.ledger.wallet import Wallet
from agentic.consensus.validator import Validator
from agentic.consensus.simulator import ConsensusSimulator
from agentic.economics.staking import StakeRegistry
from agentic.economics.epoch import EpochManager

# ── Design tokens ───────────────────────────────────────────
BG = "#0A0A0F"
BG_CARD = "#12121A"
CYAN = "#00D4FF"
PURPLE = "#8B5CF6"
GREEN = "#10B981"
RED = "#EF4444"
YELLOW = "#F59E0B"
TEXT = "#E2E8F0"
TEXT_DIM = "#94A3B8"

LOCKED_POOLS = {"Community Pool (LOCKED)"}
COMMUNITY_VESTING_EPOCHS = 12

DISTRIBUTION = {
    "Community Pool (LOCKED)": DIST_COMMUNITY,
    "Foundation Reserve":      DIST_TREASURY,
    "Team & Advisors":         DIST_TEAM,
    "AI Verification Agents":  DIST_AGENTS,
}


@dataclass
class FreeCPUStaker:
    id: int
    name: str
    cpu_vpu: float
    start_epoch: int = 0
    total_rewards: float = 0.0
    eligible: bool = False

    def check_eligibility(self, current_epoch: int) -> bool:
        self.eligible = (current_epoch - self.start_epoch) >= COMMUNITY_VESTING_EPOCHS
        return self.eligible


def dark_layout(fig, title="", height=400):
    """Apply dark theme to plotly figure."""
    fig.update_layout(
        title=dict(text=title, font=dict(color=TEXT, size=16)),
        paper_bgcolor=BG_CARD,
        plot_bgcolor=BG_CARD,
        font=dict(color=TEXT_DIM, family="Inter"),
        height=height,
        margin=dict(l=40, r=40, t=50, b=40),
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT_DIM)),
        xaxis=dict(gridcolor="#1E293B", zerolinecolor="#1E293B"),
        yaxis=dict(gridcolor="#1E293B", zerolinecolor="#1E293B"),
    )
    return fig


@st.cache_data
def run_simulation(n_epochs: int, n_validators: int, n_free_stakers: int, seed: int):
    """Run the full genesis simulation and return all data."""
    rng = np.random.default_rng(seed)
    state = LedgerState()
    stake_registry = StakeRegistry()
    epoch_manager = EpochManager(epochs_per_year=12)

    # ── Genesis ──
    wallets: dict[str, Wallet] = {}
    genesis_data = []
    total_minted = 0
    for i, (name, share) in enumerate(DISTRIBUTION.items()):
        amount = int(TOTAL_SUPPLY * share)
        w = Wallet(name=name, seed=seed + 1000 + i)
        w.receive_mint(state, amount=amount, slot=0)
        wallets[name] = w
        genesis_data.append({"Category": name, "Amount": amount, "Share": share})
        total_minted += amount

    remainder = TOTAL_SUPPLY - total_minted
    if remainder > 0:
        wallets["Community Pool (LOCKED)"].receive_mint(state, amount=remainder, slot=0)

    circulating_genesis = sum(
        w.get_balance(state) for name, w in wallets.items() if name not in LOCKED_POOLS
    )
    locked_genesis = sum(
        w.get_balance(state) for name, w in wallets.items() if name in LOCKED_POOLS
    )

    # ── Validators ──
    cpu_raw = rng.pareto(a=2.0, size=n_validators) + 1
    cpu_raw = cpu_raw / cpu_raw.max()
    cpu_vpus = cpu_raw * 190 + 10

    total_stake_target = int(circulating_genesis * 0.40)
    stake_raw = rng.pareto(a=1.5, size=n_validators) + 1
    stake_raw = stake_raw / stake_raw.sum()
    token_stakes = (stake_raw * total_stake_target).astype(int)
    token_stakes[-1] = total_stake_target - token_stakes[:-1].sum()

    validators = []
    validator_data = []
    for i in range(n_validators):
        v = Validator(id=i, token_stake=float(token_stakes[i]), cpu_vpu=float(cpu_vpus[i]), online=True)
        validators.append(v)
        stake_registry.register_stake(staker=f"validator_{i}".encode(), validator_id=i, amount=int(token_stakes[i]), epoch=0)

    total_token = float(token_stakes.sum())
    total_cpu = float(cpu_vpus.sum())
    for v in validators:
        es = v.effective_stake(total_token, total_cpu)
        validator_data.append({
            "ID": f"V{v.id:02d}", "Token Stake": int(v.token_stake),
            "CPU (VPU)": round(v.cpu_vpu, 1), "Effective Stake": round(es * 100, 2),
        })

    # ── Free CPU Stakers ──
    free_rng = np.random.default_rng(seed + 5000)
    free_cpu_raw = free_rng.pareto(a=3.0, size=n_free_stakers) + 1
    free_cpu_raw = free_cpu_raw / free_cpu_raw.max()
    free_cpu_vpus = free_cpu_raw * 75 + 5

    free_stakers = [
        FreeCPUStaker(id=i, name=f"FreeStaker_{i:03d}", cpu_vpu=float(free_cpu_vpus[i]), start_epoch=0)
        for i in range(n_free_stakers)
    ]

    stake_registry.advance_epoch(1)
    consensus_sim = ConsensusSimulator(validators=validators, seed=seed)

    # ── Epoch Loop ──
    epoch_results = []
    community_wallet = wallets.get("Community Pool (LOCKED)")

    for epoch in range(n_epochs):
        stake_registry.advance_epoch(epoch)
        consensus_result = consensus_sim.run_epoch()

        # User transactions
        active_wallets = [(n, w) for n, w in wallets.items() if n not in LOCKED_POOLS]
        tx_attempted = tx_successful = fees = 0
        base_slot = (epoch + 1) * SLOTS_PER_EPOCH
        for name, sender in active_wallets:
            if rng.random() < 0.3:
                candidates = [(n, w) for n, w in active_wallets if n != name]
                if not candidates:
                    continue
                rn, recipient = candidates[rng.integers(0, len(candidates))]
                balance = sender.get_balance(state)
                if balance < 10:
                    continue
                amount = max(1, int(balance * rng.uniform(0.01, 0.10)))
                fee = max(1, int(amount * 0.001))
                slot = base_slot + int(rng.integers(0, SLOTS_PER_EPOCH))
                result = sender.transfer(state, recipient, amount, slot)
                tx_attempted += 1
                if result.valid:
                    tx_successful += 1
                    fees += fee

        circulating = sum(w.get_balance(state) for n, w in wallets.items() if n not in LOCKED_POOLS)
        total_staked = stake_registry.get_total_staked()

        online = [v for v in validators if v.online]
        tt = sum(v.token_stake for v in online)
        tc = sum(v.cpu_vpu for v in online)
        orderer = max(online, key=lambda v: v.effective_stake(tt, tc))

        acct = epoch_manager.process_epoch(
            circulating_supply=circulating, fee_revenue=fees,
            validators=validators, orderer_id=orderer.id, total_staked=total_staked,
        )

        for v in online:
            v.total_rewards += acct.validator_rewards.get(v.id, 0)

        # Community pool distribution
        community_distributed = 0
        community_eligible = 0
        eligible = [s for s in free_stakers if s.check_eligibility(epoch)]
        community_eligible = len(eligible)
        if eligible and community_wallet:
            pool_balance = community_wallet.get_balance(state)
            if pool_balance > 0:
                epoch_release = pool_balance // 48
                total_free_cpu = sum(s.cpu_vpu for s in eligible)
                if epoch_release > 0 and total_free_cpu > 0:
                    for s in eligible:
                        reward = int(epoch_release * (s.cpu_vpu / total_free_cpu))
                        if reward > 0:
                            s.total_rewards += reward
                            community_distributed += reward

        pool_remaining = community_wallet.get_balance(state) if community_wallet else 0
        participation = total_staked / circulating if circulating > 0 else 0
        apy = epoch_manager.get_annualized_yield(epoch, circulating, total_staked)

        epoch_results.append({
            "epoch": epoch, "month": epoch + 1,
            "year": epoch / 12,
            "circulating": acct.circulating_end,
            "inflation_rate": acct.inflation_rate,
            "inflation_minted": acct.inflation_minted,
            "fees_collected": acct.fee_revenue,
            "fees_burned": acct.fees_burned,
            "total_distributed": acct.total_distributed,
            "orderer_rewards": acct.orderer_total,
            "verifier_rewards": acct.verifier_total,
            "staker_rewards": acct.staker_total,
            "total_staked": total_staked,
            "participation": participation,
            "apy": apy,
            "tx_attempted": tx_attempted,
            "tx_successful": tx_successful,
            "blocks_finalized": consensus_result.blocks_finalized,
            "avg_finality": consensus_result.avg_finality_s,
            "gini": consensus_result.reward_gini,
            "community_distributed": community_distributed,
            "community_eligible": community_eligible,
            "pool_remaining": pool_remaining,
            "records": state.record_count,
            "nullifiers": state.ns.size,
        })

    stats = epoch_manager.get_cumulative_stats()

    free_staker_data = sorted(
        [{"ID": f"F{s.id:03d}", "CPU (VPU)": round(s.cpu_vpu, 1),
          "Total Rewards": int(s.total_rewards), "Eligible": s.eligible}
         for s in free_stakers],
        key=lambda x: x["Total Rewards"], reverse=True,
    )

    return {
        "genesis": genesis_data,
        "circulating_genesis": circulating_genesis,
        "locked_genesis": locked_genesis,
        "validators": sorted(validator_data, key=lambda x: x["Effective Stake"], reverse=True),
        "free_stakers": free_staker_data,
        "epochs": epoch_results,
        "stats": stats,
        "final_validator_rewards": sorted(
            [{"ID": f"V{v.id:02d}", "Total Rewards": int(v.total_rewards),
              "Token Stake": int(v.token_stake), "CPU (VPU)": round(v.cpu_vpu, 1)}
             for v in validators],
            key=lambda x: x["Total Rewards"], reverse=True,
        ),
    }


# ═══════════════════════════════════════════════════════════════
#  Page Config
# ═══════════════════════════════════════════════════════════════

st.set_page_config(page_title="Agentic Chain — Genesis Simulation", layout="wide", page_icon="⛓")

st.markdown(f"""
<style>
    .stApp {{ background-color: {BG}; }}
    .stMetric label {{ color: {TEXT_DIM} !important; }}
    .stMetric [data-testid="stMetricValue"] {{ color: {CYAN} !important; font-family: 'JetBrains Mono', monospace; }}
    .stMetric [data-testid="stMetricDelta"] {{ font-family: 'JetBrains Mono', monospace; }}
    h1, h2, h3 {{ color: {TEXT} !important; }}
    .stDataFrame {{ background-color: {BG_CARD}; }}
</style>
""", unsafe_allow_html=True)

st.title("⛓ Agentic Chain — Genesis Simulation")

# ── Sidebar Controls ──
with st.sidebar:
    st.header("Simulation Parameters")
    n_epochs = st.slider("Epochs (1 epoch = 1 month)", 12, 60, 24)
    n_validators = st.slider("Validators", 10, 100, 30)
    n_free_stakers = st.slider("Free CPU Stakers", 10, 500, 100)
    seed = st.number_input("Random Seed", value=42, min_value=0)

    st.markdown("---")
    st.markdown(f"**Supply:** {TOTAL_SUPPLY:,} AGNTC")
    st.markdown(f"**Distribution:** Community {DIST_COMMUNITY:.0%} | Foundation {DIST_TREASURY:.0%} | Team {DIST_TEAM:.0%} | Agents {DIST_AGENTS:.0%}")
    st.markdown(f"**Inflation:** {INITIAL_INFLATION_RATE:.0%} → {INFLATION_FLOOR:.0%} floor")
    st.markdown(f"**Staking:** α={ALPHA} (token) β={BETA} (CPU)")
    st.markdown(f"**Rewards:** Verifiers {REWARD_SPLIT_VERIFIER:.0%} | Stakers {REWARD_SPLIT_STAKER:.0%}")

# ── Run Simulation ──
data = run_simulation(n_epochs, n_validators, n_free_stakers, seed)
epochs = data["epochs"]

# ═══════════════════════════════════════════════════════════════
#  Genesis Overview
# ═══════════════════════════════════════════════════════════════

st.header("Genesis Block")

col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Supply", f"{TOTAL_SUPPLY:,}")
col2.metric("Circulating", f"{data['circulating_genesis']:,}")
col3.metric("Locked (Community)", f"{data['locked_genesis']:,}")
col4.metric("Validators", n_validators)

# Distribution pie
col_pie, col_table = st.columns([1, 1])
with col_pie:
    fig_pie = go.Figure(go.Pie(
        labels=[d["Category"] for d in data["genesis"]],
        values=[d["Amount"] for d in data["genesis"]],
        hole=0.45,
        marker=dict(colors=[CYAN, PURPLE, "#6366F1", "#A78BFA"]),
        textinfo="label+percent",
        textfont=dict(color=TEXT),
    ))
    dark_layout(fig_pie, "Token Distribution", 350)
    st.plotly_chart(fig_pie, use_container_width=True)

with col_table:
    st.subheader("Validator Leaderboard")
    st.dataframe(
        data["validators"][:15],
        use_container_width=True, hide_index=True,
        column_config={
            "Token Stake": st.column_config.NumberColumn(format="%d AGNTC"),
            "Effective Stake": st.column_config.NumberColumn(format="%.2f%%"),
        },
    )

# ═══════════════════════════════════════════════════════════════
#  Supply & Inflation
# ═══════════════════════════════════════════════════════════════

st.header("Supply & Inflation")

col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Minted", f"{data['stats']['cumulative_minted']:,}", delta=f"+{data['stats']['cumulative_minted'] / TOTAL_SUPPLY:.1%}")
col2.metric("Total Burned", f"{data['stats']['cumulative_burned']:,}")
col3.metric("Net Issuance", f"{data['stats']['net_issuance']:,}")
final_supply = TOTAL_SUPPLY + data['stats']['net_issuance']
col4.metric("Final Supply", f"{final_supply:,}", delta=f"+{(final_supply - TOTAL_SUPPLY) / TOTAL_SUPPLY:.1%}")

col_supply, col_inflation = st.columns(2)

with col_supply:
    fig_supply = go.Figure()
    fig_supply.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=[e["circulating"] for e in epochs],
        name="Circulating Supply",
        line=dict(color=CYAN, width=2),
        fill="tozeroy", fillcolor="rgba(0,212,255,0.1)",
    ))
    dark_layout(fig_supply, "Circulating Supply Over Time")
    fig_supply.update_yaxes(title="AGNTC")
    fig_supply.update_xaxes(title="Month")
    st.plotly_chart(fig_supply, use_container_width=True)

with col_inflation:
    fig_inf = go.Figure()
    fig_inf.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=[e["inflation_rate"] * 100 for e in epochs],
        name="Annual Inflation Rate",
        line=dict(color=YELLOW, width=2),
    ))
    fig_inf.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=[e["apy"] * 100 for e in epochs],
        name="Estimated APY",
        line=dict(color=GREEN, width=2, dash="dot"),
    ))
    dark_layout(fig_inf, "Inflation Rate & Staking APY")
    fig_inf.update_yaxes(title="%")
    fig_inf.update_xaxes(title="Month")
    st.plotly_chart(fig_inf, use_container_width=True)

# ═══════════════════════════════════════════════════════════════
#  Rewards Distribution
# ═══════════════════════════════════════════════════════════════

st.header("Rewards Distribution")

col_rewards, col_burn = st.columns(2)

with col_rewards:
    fig_rewards = go.Figure()
    fig_rewards.add_trace(go.Bar(
        x=[e["month"] for e in epochs],
        y=[e["verifier_rewards"] for e in epochs],
        name=f"Verifiers ({REWARD_SPLIT_VERIFIER:.0%})",
        marker_color=CYAN,
    ))
    fig_rewards.add_trace(go.Bar(
        x=[e["month"] for e in epochs],
        y=[e["staker_rewards"] for e in epochs],
        name=f"Stakers ({REWARD_SPLIT_STAKER:.0%})",
        marker_color=PURPLE,
    ))
    if REWARD_SPLIT_ORDERER > 0:
        fig_rewards.add_trace(go.Bar(
            x=[e["month"] for e in epochs],
            y=[e["orderer_rewards"] for e in epochs],
            name=f"Orderers ({REWARD_SPLIT_ORDERER:.0%})",
            marker_color="#6366F1",
        ))
    dark_layout(fig_rewards, "Epoch Rewards Breakdown")
    fig_rewards.update_layout(barmode="stack")
    fig_rewards.update_yaxes(title="AGNTC")
    fig_rewards.update_xaxes(title="Month")
    st.plotly_chart(fig_rewards, use_container_width=True)

with col_burn:
    fig_burn = go.Figure()
    fig_burn.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=[e["inflation_minted"] for e in epochs],
        name="Inflation Minted",
        line=dict(color=GREEN, width=2),
        fill="tozeroy", fillcolor="rgba(16,185,129,0.1)",
    ))
    fig_burn.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=[e["fees_burned"] for e in epochs],
        name="Fees Burned",
        line=dict(color=RED, width=2),
    ))
    dark_layout(fig_burn, "Minting vs Burning")
    fig_burn.update_yaxes(title="AGNTC")
    fig_burn.update_xaxes(title="Month")
    st.plotly_chart(fig_burn, use_container_width=True)

# ═══════════════════════════════════════════════════════════════
#  Community Pool & Free CPU Stakers
# ═══════════════════════════════════════════════════════════════

st.header("Community Pool — Free CPU Staking")

total_community_distributed = sum(e["community_distributed"] for e in epochs)
initial_pool = int(TOTAL_SUPPLY * DIST_COMMUNITY)
pool_remaining = initial_pool - total_community_distributed
eligible_count = epochs[-1]["community_eligible"] if epochs else 0

col1, col2, col3, col4 = st.columns(4)
col1.metric("Initial Pool", f"{initial_pool:,}")
col2.metric("Distributed", f"{total_community_distributed:,}", delta=f"-{total_community_distributed / initial_pool:.1%} of pool")
col3.metric("Remaining", f"{pool_remaining:,}")
col4.metric("Eligible Stakers", f"{eligible_count} / {n_free_stakers}")

col_pool, col_free = st.columns(2)

with col_pool:
    fig_pool = go.Figure()
    cumulative_dist = []
    running = 0
    for e in epochs:
        running += e["community_distributed"]
        cumulative_dist.append(running)

    fig_pool.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=[initial_pool - c for c in cumulative_dist],
        name="Pool Remaining",
        line=dict(color=CYAN, width=2),
        fill="tozeroy", fillcolor="rgba(0,212,255,0.1)",
    ))
    fig_pool.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=cumulative_dist,
        name="Cumulative Distributed",
        line=dict(color=GREEN, width=2, dash="dot"),
    ))
    # Add vesting line at epoch 12
    fig_pool.add_vline(x=13, line_dash="dash", line_color=YELLOW, annotation_text="1yr Vest Complete")
    dark_layout(fig_pool, "Community Pool Drawdown")
    fig_pool.update_yaxes(title="AGNTC")
    fig_pool.update_xaxes(title="Month")
    st.plotly_chart(fig_pool, use_container_width=True)

with col_free:
    st.subheader("Top Free CPU Stakers")
    top_free = [s for s in data["free_stakers"] if s["Total Rewards"] > 0][:15]
    if top_free:
        st.dataframe(
            top_free, use_container_width=True, hide_index=True,
            column_config={
                "Total Rewards": st.column_config.NumberColumn(format="%d AGNTC"),
                "CPU (VPU)": st.column_config.NumberColumn(format="%.1f"),
            },
        )
    else:
        st.info(f"Free CPU stakers vest after {COMMUNITY_VESTING_EPOCHS} epochs. Run more epochs to see distributions.")

# ═══════════════════════════════════════════════════════════════
#  Staking & Consensus
# ═══════════════════════════════════════════════════════════════

st.header("Staking & Consensus")

col_staking, col_consensus = st.columns(2)

with col_staking:
    fig_stake = go.Figure()
    fig_stake.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=[e["participation"] * 100 for e in epochs],
        name="Staking Participation",
        line=dict(color=PURPLE, width=2),
    ))
    fig_stake.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=[e["apy"] * 100 for e in epochs],
        name="Est. APY",
        line=dict(color=GREEN, width=2, dash="dot"),
        yaxis="y2",
    ))
    dark_layout(fig_stake, "Staking Participation & APY")
    fig_stake.update_layout(
        yaxis=dict(title="Participation %", range=[0, 100]),
        yaxis2=dict(title="APY %", overlaying="y", side="right", gridcolor="rgba(0,0,0,0)"),
    )
    fig_stake.update_xaxes(title="Month")
    st.plotly_chart(fig_stake, use_container_width=True)

with col_consensus:
    fig_finality = go.Figure()
    fig_finality.add_trace(go.Scatter(
        x=[e["month"] for e in epochs],
        y=[e["avg_finality"] for e in epochs],
        name="Avg Finality",
        line=dict(color=CYAN, width=2),
    ))
    fig_finality.add_trace(go.Bar(
        x=[e["month"] for e in epochs],
        y=[e["blocks_finalized"] for e in epochs],
        name="Blocks Finalized",
        marker_color="rgba(139,92,246,0.3)",
        yaxis="y2",
    ))
    dark_layout(fig_finality, "Consensus Performance")
    fig_finality.update_layout(
        yaxis=dict(title="Finality (seconds)"),
        yaxis2=dict(title="Blocks", overlaying="y", side="right", gridcolor="rgba(0,0,0,0)"),
    )
    fig_finality.update_xaxes(title="Month")
    st.plotly_chart(fig_finality, use_container_width=True)

# ═══════════════════════════════════════════════════════════════
#  Validator Leaderboard (Final)
# ═══════════════════════════════════════════════════════════════

st.header("Validator Rewards Leaderboard")

col_bar, col_table2 = st.columns([2, 1])

with col_bar:
    top_v = data["final_validator_rewards"][:15]
    fig_vbar = go.Figure()
    fig_vbar.add_trace(go.Bar(
        x=[v["ID"] for v in top_v],
        y=[v["Total Rewards"] for v in top_v],
        marker_color=[CYAN if i == 0 else PURPLE if i < 3 else "#6366F1" for i in range(len(top_v))],
        text=[f"{v['Total Rewards']:,}" for v in top_v],
        textposition="outside",
        textfont=dict(color=TEXT_DIM, size=10),
    ))
    dark_layout(fig_vbar, "Top Validators by Total Rewards", 400)
    fig_vbar.update_yaxes(title="AGNTC")
    st.plotly_chart(fig_vbar, use_container_width=True)

with col_table2:
    st.dataframe(
        data["final_validator_rewards"][:15],
        use_container_width=True, hide_index=True,
        column_config={
            "Total Rewards": st.column_config.NumberColumn(format="%d AGNTC"),
            "Token Stake": st.column_config.NumberColumn(format="%d AGNTC"),
        },
    )

# ═══════════════════════════════════════════════════════════════
#  Ledger State
# ═══════════════════════════════════════════════════════════════

st.header("Ledger State")

col1, col2, col3, col4 = st.columns(4)
col1.metric("Records in Merkle Tree", epochs[-1]["records"])
col2.metric("Nullifiers Published", epochs[-1]["nullifiers"])
col3.metric("Total Transactions", sum(e["tx_attempted"] for e in epochs))
col4.metric("Success Rate", f"{sum(e['tx_successful'] for e in epochs) / max(1, sum(e['tx_attempted'] for e in epochs)):.0%}")

st.markdown("---")
st.caption("Agentic Chain Genesis Simulation — Proof of AI Verification (PoAIV) | ZK-CPU Dual Staking")
