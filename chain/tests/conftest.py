"""Global test fixtures for the Agentic Chain test suite."""
import pytest

# A shared admin token for all tests that call admin-gated endpoints.
TEST_ADMIN_TOKEN = "test-admin-token"


@pytest.fixture(autouse=True, scope="session")
def _enable_admin_endpoints():
    """Patch _ADMIN_TOKEN so /api/reset and /api/automine work in tests.

    The token is set at session scope so all test modules see it.
    Test code must still send the ``X-Admin-Token`` header (use the
    ``admin_headers`` fixture) when calling admin endpoints.
    """
    from agentic.testnet import api as _api_module

    original = _api_module._ADMIN_TOKEN
    _api_module._ADMIN_TOKEN = TEST_ADMIN_TOKEN
    yield
    _api_module._ADMIN_TOKEN = original


@pytest.fixture(scope="session")
def admin_headers() -> dict:
    """Return headers dict for admin-gated endpoints."""
    return {"X-Admin-Token": TEST_ADMIN_TOKEN}
