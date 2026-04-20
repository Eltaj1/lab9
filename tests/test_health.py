"""
Unit tests for /health, /ping, and /ready endpoints.
Run with: pytest tests/test_health.py -v
"""
import pytest
import sys
import os

# Make sure app.py is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Point to a non-existent Redis so /ready safely returns 503
os.environ["REDIS_URL"] = "redis://127.0.0.1:6399"

from app import app as flask_app


@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


def test_health_returns_200(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_ping_returns_pong(client):
    res = client.get("/ping")
    assert res.status_code == 200
    assert res.get_json()["message"] == "pong"


def test_ready_returns_503_when_redis_down(client):
    res = client.get("/ready")
    assert res.status_code == 503
    assert res.get_json()["status"] == "unavailable"
