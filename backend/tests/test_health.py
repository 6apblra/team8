import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_root_and_health():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data and data["message"] == "TeamUp API"

        r2 = await ac.get("/health")
        assert r2.status_code == 200
        assert r2.json() == {"status": "ok"}
