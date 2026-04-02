"""Benchmarks for FastAPI endpoint response times."""
import time
import pytest
from fastapi.testclient import TestClient
from agentic.testnet.api import app
from tests.conftest import TEST_ADMIN_TOKEN

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


class TestAPIResponseTimes:
    def _time_endpoint(self, client, method, url, iterations=100, headers=None):
        fn = client.get if method == "GET" else client.post
        fn(url, headers=headers)  # warmup
        start = time.perf_counter()
        for _ in range(iterations):
            resp = fn(url, headers=headers)
            assert resp.status_code == 200
        elapsed = time.perf_counter() - start
        return (elapsed / iterations) * 1000  # ms

    def test_status_latency(self, client):
        ms = self._time_endpoint(client, "GET", "/api/status")
        print(f"\n  GET /api/status: {ms:.2f}ms")
        assert ms < 10.0

    def test_claims_latency(self, client):
        ms = self._time_endpoint(client, "GET", "/api/claims")
        print(f"\n  GET /api/claims: {ms:.2f}ms")
        assert ms < 50.0

    def test_coordinate_latency(self, client):
        ms = self._time_endpoint(client, "GET", "/api/coordinate/0/0")
        print(f"\n  GET /api/coordinate/0/0: {ms:.2f}ms")
        assert ms < 10.0

    def test_agents_latency(self, client):
        ms = self._time_endpoint(client, "GET", "/api/agents")
        print(f"\n  GET /api/agents: {ms:.2f}ms")
        assert ms < 50.0

    def test_grid_small_latency(self, client):
        ms = self._time_endpoint(
            client, "GET",
            "/api/grid/region?x_min=-5&x_max=5&y_min=-5&y_max=5",
        )
        print(f"\n  GET /api/grid/region (11x11): {ms:.2f}ms")
        assert ms < 100.0

    def test_grid_large_latency(self, client):
        ms = self._time_endpoint(
            client, "GET",
            "/api/grid/region?x_min=0&x_max=99&y_min=0&y_max=99",
            iterations=10,
        )
        print(f"\n  GET /api/grid/region (100x100): {ms:.2f}ms")
        assert ms < 5000.0

    def test_reset_latency(self, client):
        ms = self._time_endpoint(
            client, "POST", "/api/reset", iterations=10,
            headers=_ADMIN,
        )
        print(f"\n  POST /api/reset: {ms:.2f}ms")
        assert ms < 2000.0
