"""
Tests for Resume Parser API endpoint
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
async def test_parse_resume_pdf(client):
    """Test parsing a PDF resume"""
    response = await client.post("/api/parse-resume", json={
        "file_path": "/uploads/resume.pdf",
        "file_type": "pdf"
    })

    assert response.status_code == 200
    data = response.json()

    assert "skills" in data
    assert "experience" in data
    assert "education" in data
    assert "yearsExperience" in data
    assert isinstance(data["skills"], list)
    assert len(data["skills"]) > 0


@pytest.mark.asyncio
async def test_parse_resume_docx(client):
    """Test parsing a DOCX resume"""
    response = await client.post("/api/parse-resume", json={
        "file_path": "/uploads/resume.docx",
        "file_type": "docx"
    })

    assert response.status_code == 200
    data = response.json()

    assert "skills" in data
    assert isinstance(data["skills"], list)


@pytest.mark.asyncio
async def test_parse_resume_missing_file_path(client):
    """Test error handling for missing file_path"""
    response = await client.post("/api/parse-resume", json={
        "file_type": "pdf"
    })

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_parse_resume_missing_file_type(client):
    """Test error handling for missing file_type"""
    response = await client.post("/api/parse-resume", json={
        "file_path": "/uploads/resume.pdf"
    })

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_parse_resume_invalid_file_type(client):
    """Test parsing with unsupported file type"""
    response = await client.post("/api/parse-resume", json={
        "file_path": "/uploads/resume.txt",
        "file_type": "txt"
    })

    assert response.status_code == 200
    # Should still return a response (mock implementation)
    data = response.json()
    assert "skills" in data
