# chain/tests/test_api_params.py
from fastapi.testclient import TestClient
import agentic.testnet.api as api
import agentic.params as p


def test_api_params_returns_economy_and_chain_blocks():
    with TestClient(api.app) as c:
        r = c.get("/api/params")
        assert r.status_code == 200
        body = r.json()
        eco, chain = body["economy"], body["chain"]
        # economy block mirrors params.py (concordance — can't silently drift)
        assert eco["upgradeCostBase"] == p.NODE_UPGRADE_COST_BASE
        assert eco["upgradeCostGrowth"] == p.NODE_UPGRADE_COST_GROWTH
        assert eco["cpuPerTurnFlat"] == p.NODE_CPU_PER_TURN_FLAT
        assert eco["cpuPerTurnPerLevel"] == p.NODE_CPU_PER_TURN_PER_LEVEL
        assert eco["tierMultipliers"] == p.NODE_TIER_MULTIPLIERS
        assert eco["tierBands"] == p.NODE_TIER_BANDS
        assert eco["miningPresets"] == p.MINING_PRESETS
        assert eco["securingPresets"] == p.SECURING_PRESETS
        assert eco["subscription"] == p.SUBSCRIPTION_ECONOMY
        # chain block mirrors params.py
        assert chain["baseMiningRatePerBlock"] == p.BASE_MINING_RATE_PER_BLOCK
        assert chain["hardnessMultiplier"] == p.HARDNESS_MULTIPLIER
        assert chain["feeBurnRate"] == p.FEE_BURN_RATE
        assert chain["annualInflationCeiling"] == p.ANNUAL_INFLATION_CEILING
