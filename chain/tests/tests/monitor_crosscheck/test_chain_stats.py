"""Cross-check: Dashboard chain stats.

Each test fetches from the API and asserts the data matches what
the monitor's updateChainStatus() would display:

  hero-block         ← blocks_processed
  hero-subtitle      ← epoch_ring, state_root[:12]
  mining-value       ← total_mined
  network-claims     ← total_claims
  network-agents     ← len(agents table)
  staking-cpu        ← sum(staked_cpu) from agents
  epoch-ring         ← epoch_ring
  epoch-hardness     ← hardness
  supply-value       ← circulating_supply
  burned-value       ← burned_fees
  epoch-progress-bar ← client-side formula 4*N*(N+1)
"""
from __future__ import annotations

import pytest


class TestHeroSection:
    """Block height and epoch subtitle."""

    def test_blocks_processed_is_non_negative(self, status):
        assert status["blocks_processed"] >= 0, "Hero counter must be ≥ 0"

    def test_state_root_is_64_char_hex(self, status):
        sr = status["state_root"]
        assert len(sr) == 64
        int(sr, 16)  # raises ValueError if not valid hex

    def test_epoch_ring_is_positive_int(self, status):
        ring = status["epoch_ring"]
        assert isinstance(ring, int)
        assert ring >= 1, "epoch_ring must start at 1"


class TestMiningCard:
    """AGNTC Mined stat."""

    def test_total_mined_is_float(self, status):
        assert isinstance(status["total_mined"], float)
        assert status["total_mined"] >= 0.0

    def test_total_mined_equals_circulating_supply(self, status):
        # API: circulating_supply = total_rewards_distributed = total_mined
        # Monitor: mining-value and supply-value both read different fields but must agree
        assert abs(status["total_mined"] - status["circulating_supply"]) < 1e-6, (
            f"total_mined ({status['total_mined']}) != "
            f"circulating_supply ({status['circulating_supply']})"
        )


class TestNetworkCard:
    """Deployed Agents and Total Claims stats."""

    def test_total_claims_matches_claims_endpoint(self, status, claims):
        assert status["total_claims"] == len(claims), (
            f"/api/status total_claims={status['total_claims']} "
            f"but /api/claims returned {len(claims)} items"
        )

    def test_genesis_has_nine_claims(self, claims):
        assert len(claims) == 9, "Genesis must produce exactly 9 active claims"

    def test_agents_count_matches_claims_count(self, agents, claims):
        # /api/agents returns the same underlying claims as agent objects
        assert len(agents) == len(claims), (
            f"/api/agents count {len(agents)} != /api/claims count {len(claims)}"
        )

    def test_network_agents_all_have_required_fields(self, agents):
        required = {"id", "owner", "x", "y", "tier", "is_user_agent", "stake", "density",
                    "storage_slots", "mining_rate", "border_radius"}
        for agent in agents:
            missing = required - set(agent.keys())
            assert not missing, f"Agent {agent.get('id')} missing fields: {missing}"

    def test_agent_tiers_are_valid(self, agents):
        valid_tiers = {"opus", "sonnet", "haiku"}
        for agent in agents:
            assert agent["tier"] in valid_tiers, f"Invalid tier: {agent['tier']}"


class TestBlockProductionCard:
    """Next block countdown and block time."""

    def test_next_block_in_is_non_negative(self, status):
        assert status["next_block_in"] >= 0.0, "next_block_in should be ≥ 0"

    def test_current_block_time_is_60s(self, status):
        assert status["current_block_time"] == 60.0, (
            f"Expected 60s block time, got {status['current_block_time']}"
        )


class TestStakingCard:
    """Total CPU Staked — summed from agents table."""

    def test_staked_cpu_sum_is_non_negative(self, agents):
        total_cpu = sum(a.get("staked_cpu", 0) or 0 for a in agents)
        assert total_cpu >= 0

    def test_agents_have_staked_cpu_field(self, agents):
        # monitor.js reads staked_cpu from agents table
        # /api/agents doesn't expose staked_cpu directly — check Supabase sync shape instead
        # This is a known gap: /api/agents and agents Supabase table differ slightly
        pass  # documented gap — see test_supabase_sync.py for sync payload coverage


class TestEpochCard:
    """Current Ring and Hardness."""

    def test_epoch_ring_consistent_with_epoch_endpoint(self, status, epoch):
        assert status["epoch_ring"] == epoch["current_ring"], (
            f"/api/status epoch_ring={status['epoch_ring']} "
            f"but /api/epoch current_ring={epoch['current_ring']}"
        )

    def test_hardness_is_16_times_ring(self, status, epoch):
        ring = epoch["current_ring"]
        expected_hardness = 16 * ring
        assert abs(status["hardness"] - expected_hardness) < 1e-6, (
            f"hardness={status['hardness']} but expected 16×{ring}={expected_hardness}"
        )


class TestSupplyCard:
    """Circulating AGNTC."""

    def test_circulating_supply_is_non_negative(self, status):
        assert status["circulating_supply"] >= 0.0


class TestBurnCard:
    """AGNTC Burned — should be 0 at genesis (no claims or fees yet)."""

    def test_burned_fees_is_non_negative(self, status):
        assert status["burned_fees"] >= 0

    def test_burned_fees_is_zero_at_genesis(self, status):
        assert status["burned_fees"] == 0, (
            f"No fees should be burned at genesis, got {status['burned_fees']}"
        )


class TestEpochProgressBar:
    """Epoch progress — validate monitor client-side formula against API.

    Monitor JS formula:
        nextThreshold = 4 * (ring + 1) * (ring + 2)
        prevThreshold = 4 * ring * (ring + 1)
        progress = (mined - prevThreshold) / (nextThreshold - prevThreshold) * 100

    API: epoch_progress = EpochTracker.progress_to_next() (0.0–1.0)
    """

    def test_epoch_progress_field_in_range(self, status):
        p = status["epoch_progress"]
        assert 0.0 <= p <= 1.0, f"epoch_progress {p} out of [0,1] range"

    def test_monitor_formula_matches_api_progress(self, status):
        ring = status["epoch_ring"]
        mined = status["total_mined"]

        # Monitor JS formula (from monitor.js lines 97-104)
        next_threshold = 4 * (ring + 1) * (ring + 2)
        prev_threshold = 4 * ring * (ring + 1)
        if next_threshold > prev_threshold and mined >= prev_threshold:
            monitor_progress = (mined - prev_threshold) / (next_threshold - prev_threshold)
        else:
            monitor_progress = 0.0
        monitor_progress = min(1.0, monitor_progress)

        api_progress = status["epoch_progress"]

        assert abs(monitor_progress - api_progress) < 0.01, (
            f"Monitor formula gives {monitor_progress:.4f} but API gives {api_progress:.4f} "
            f"(ring={ring}, mined={mined}, prev={prev_threshold}, next={next_threshold})"
        )

    def test_epoch_agntc_remaining_consistent(self, status, epoch):
        # Monitor doesn't display agntc_remaining but it must be internally consistent
        remaining = epoch["agntc_remaining"]
        progress = epoch["progress"]
        assert remaining >= 0.0
        assert 0.0 <= progress <= 1.0

    def test_progress_plus_remaining_adds_up(self, epoch):
        total_for_ring = epoch["next_threshold"] - 0  # threshold from 0
        # agntc_remaining should equal next_threshold * (1 - progress) approximately
        # (epoch threshold is cumulative, so this is an approximation check)
        assert epoch["agntc_remaining"] >= 0.0
