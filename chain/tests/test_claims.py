"""Tests for lattice node claim transactions and registry."""
import pytest


class TestClaimEntry:
    def test_create_claim(self):
        from agentic.lattice.claims import ClaimEntry
        from agentic.lattice.coordinate import GridCoordinate
        entry = ClaimEntry(
            owner=b"alice",
            coordinate=GridCoordinate(x=10, y=-10),
            stake_amount=500,
            slot=42,
        )
        assert entry.owner == b"alice"
        assert entry.coordinate.x == 10
        assert entry.stake_amount == 500
        assert entry.active


class TestClaimRegistry:
    def test_register_claim(self):
        from agentic.lattice.claims import ClaimRegistry
        from agentic.lattice.coordinate import GridCoordinate
        reg = ClaimRegistry()
        entry = reg.register(b"alice", GridCoordinate(x=0, y=0), 100, slot=1)
        assert entry is not None
        assert len(reg.get_claims(b"alice")) == 1

    def test_active_claims_for_owner(self):
        from agentic.lattice.claims import ClaimRegistry
        from agentic.lattice.coordinate import GridCoordinate
        reg = ClaimRegistry()
        reg.register(b"alice", GridCoordinate(x=0, y=0), 100, slot=1)
        reg.register(b"alice", GridCoordinate(x=1, y=1), 200, slot=2)
        reg.register(b"bob", GridCoordinate(x=5, y=5), 50, slot=3)
        assert len(reg.get_claims(b"alice")) == 2
        assert len(reg.get_claims(b"bob")) == 1

    def test_release_claim(self):
        from agentic.lattice.claims import ClaimRegistry
        from agentic.lattice.coordinate import GridCoordinate
        reg = ClaimRegistry()
        coord = GridCoordinate(x=10, y=10)
        reg.register(b"alice", coord, 100, slot=1)
        released = reg.release(b"alice", coord)
        assert released is True
        assert len(reg.get_claims(b"alice")) == 0

    def test_release_nonexistent_fails(self):
        from agentic.lattice.claims import ClaimRegistry
        from agentic.lattice.coordinate import GridCoordinate
        reg = ClaimRegistry()
        released = reg.release(b"alice", GridCoordinate(x=0, y=0))
        assert released is False

    def test_get_claim_at_coordinate(self):
        from agentic.lattice.claims import ClaimRegistry
        from agentic.lattice.coordinate import GridCoordinate
        reg = ClaimRegistry()
        coord = GridCoordinate(x=10, y=-10)
        reg.register(b"alice", coord, 300, slot=5)
        claim = reg.get_claim_at(coord)
        assert claim is not None
        assert claim.owner == b"alice"

    def test_no_duplicate_coordinate(self):
        from agentic.lattice.claims import ClaimRegistry
        from agentic.lattice.coordinate import GridCoordinate
        reg = ClaimRegistry()
        coord = GridCoordinate(x=0, y=0)
        reg.register(b"alice", coord, 100, slot=1)
        result = reg.register(b"bob", coord, 200, slot=2)
        assert result is None

    def test_all_active_claims(self):
        from agentic.lattice.claims import ClaimRegistry
        from agentic.lattice.coordinate import GridCoordinate
        reg = ClaimRegistry()
        reg.register(b"alice", GridCoordinate(x=0, y=0), 100, slot=1)
        reg.register(b"bob", GridCoordinate(x=1, y=1), 200, slot=2)
        all_claims = reg.all_active_claims()
        assert len(all_claims) == 2

    def test_total_staked_for_mining(self):
        from agentic.lattice.claims import ClaimRegistry
        from agentic.lattice.coordinate import GridCoordinate
        reg = ClaimRegistry()
        reg.register(b"alice", GridCoordinate(x=0, y=0), 100, slot=1)
        reg.register(b"bob", GridCoordinate(x=1, y=1), 200, slot=2)
        assert reg.total_mining_stake() == 300

    def test_claims_as_mining_input(self):
        from agentic.lattice.claims import ClaimRegistry
        from agentic.lattice.coordinate import GridCoordinate
        reg = ClaimRegistry()
        reg.register(b"alice", GridCoordinate(x=0, y=0), 100, slot=1)
        mining_input = reg.as_mining_claims()
        assert len(mining_input) == 1
        assert mining_input[0]["owner"] == b"alice"
        assert mining_input[0]["stake"] == 100
