"""
Tests for Bias Detector API endpoint
"""
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app


@pytest.fixture
async def client():
    """Create async test client"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_detect_bias_no_bias(client):
    """Test job description with no biased language"""
    response = await client.post("/api/detect-bias", json={
        "job_description": "We are looking for a skilled software engineer to join our team."
    })

    assert response.status_code == 200
    data = response.json()

    assert "biasFlags" in data
    assert "biasCount" in data
    assert data["biasCount"] == 0
    assert len(data["biasFlags"]) == 0


@pytest.mark.asyncio
async def test_detect_bias_high_severity(client):
    """Test detection of high severity biased terms"""
    response = await client.post("/api/detect-bias", json={
        "job_description": "We need a rockstar ninja developer who is young and aggressive."
    })

    assert response.status_code == 200
    data = response.json()

    assert data["biasCount"] >= 2
    terms = [flag["term"] for flag in data["biasFlags"]]
    assert "rockstar" in terms
    assert "ninja" in terms


@pytest.mark.asyncio
async def test_detect_bias_medium_severity(client):
    """Test detection of medium severity biased terms"""
    response = await client.post("/api/detect-bias", json={
        "job_description": "Looking for dominant team players who can manage guys effectively."
    })

    assert response.status_code == 200
    data = response.json()

    assert data["biasCount"] >= 2
    terms = [flag["term"] for flag in data["biasFlags"]]
    assert "dominant" in terms or "guys" in terms


@pytest.mark.asyncio
async def test_detect_bias_low_severity(client):
    """Test detection of low severity biased terms"""
    response = await client.post("/api/detect-bias", json={
        "job_description": "The chairman will lead the team as a experienced salesman."
    })

    assert response.status_code == 200
    data = response.json()

    assert data["biasCount"] >= 1
    terms = [flag["term"] for flag in data["biasFlags"]]
    assert "chairman" in terms or "salesman" in terms


@pytest.mark.asyncio
async def test_detect_bias_case_insensitive(client):
    """Test that bias detection is case-insensitive"""
    response = await client.post("/api/detect-bias", json={
        "job_description": "We need a ROCKSTAR developer who is a NINJA in coding."
    })

    assert response.status_code == 200
    data = response.json()

    assert data["biasCount"] >= 2
    terms = [flag["term"] for flag in data["biasFlags"]]
    assert "rockstar" in terms
    assert "ninja" in terms


@pytest.mark.asyncio
async def test_detect_bias_suggestions_present(client):
    """Test that suggestions are provided for biased terms"""
    response = await client.post("/api/detect-bias", json={
        "job_description": "Looking for a rockstar developer."
    })

    assert response.status_code == 200
    data = response.json()

    assert len(data["biasFlags"]) > 0
    flag = data["biasFlags"][0]
    assert "suggestion" in flag
    assert "severity" in flag
    assert "term" in flag


@pytest.mark.asyncio
async def test_detect_bias_empty_description(client):
    """Test handling empty job description"""
    response = await client.post("/api/detect-bias", json={
        "job_description": ""
    })

    assert response.status_code == 200
    data = response.json()

    assert data["biasCount"] == 0
    assert data["analyzed"] == True


@pytest.mark.asyncio
async def test_detect_bias_missing_field(client):
    """Test error handling for missing job_description"""
    response = await client.post("/api/detect-bias", json={})

    assert response.status_code == 422  # Validation error
