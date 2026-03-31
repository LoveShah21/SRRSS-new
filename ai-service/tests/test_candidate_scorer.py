"""
Tests for Candidate Scorer API endpoint
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
async def test_score_candidate_strong_match(client):
    """Test scoring for a strong candidate match"""
    response = await client.post("/api/score-candidate", json={
        "candidate_profile": {
            "skills": ["Python", "Django", "PostgreSQL", "Redis"],
            "yearsExperience": 5,
            "education": [{"degree": "B.S. Computer Science"}]
        },
        "job_description": {
            "title": "Backend Developer",
            "requiredSkills": ["Python", "Django"],
            "experienceMin": 3
        }
    })

    assert response.status_code == 200
    data = response.json()

    assert "matchScore" in data
    assert "breakdown" in data
    assert "recommendation" in data
    assert data["matchScore"] >= 70
    assert data["recommendation"] == "strong"


@pytest.mark.asyncio
async def test_score_candidate_moderate_match(client):
    """Test scoring for a moderate candidate match"""
    response = await client.post("/api/score-candidate", json={
        "candidate_profile": {
            "skills": ["JavaScript", "React"],
            "yearsExperience": 2,
            "education": [{"degree": "B.A. Business"}]
        },
        "job_description": {
            "title": "Full Stack Developer",
            "requiredSkills": ["Python", "Django", "React"],
            "experienceMin": 3
        }
    })

    assert response.status_code == 200
    data = response.json()

    assert 40 <= data["matchScore"] < 70
    assert data["recommendation"] == "moderate"


@pytest.mark.asyncio
async def test_score_candidate_weak_match(client):
    """Test scoring for a weak candidate match"""
    response = await client.post("/api/score-candidate", json={
        "candidate_profile": {
            "skills": ["Java", "Spring"],
            "yearsExperience": 1,
            "education": []
        },
        "job_description": {
            "title": "Python Developer",
            "requiredSkills": ["Python", "Django", "FastAPI"],
            "experienceMin": 5
        }
    })

    assert response.status_code == 200
    data = response.json()

    assert data["matchScore"] < 40
    assert data["recommendation"] == "weak"


@pytest.mark.asyncio
async def test_score_candidate_breakdown(client):
    """Test that score breakdown is correct"""
    response = await client.post("/api/score-candidate", json={
        "candidate_profile": {
            "skills": ["Python", "Django"],
            "yearsExperience": 3,
            "education": [{"degree": "B.S."}]
        },
        "job_description": {
            "title": "Developer",
            "requiredSkills": ["Python", "Django"],
            "experienceMin": 3
        }
    })

    assert response.status_code == 200
    data = response.json()

    breakdown = data["breakdown"]
    assert "skills" in breakdown
    assert "experience" in breakdown
    assert "education" in breakdown

    # Skills should be max (40) for 100% match
    assert breakdown["skills"] == 40
    # Experience should be max (30) for meeting requirement
    assert breakdown["experience"] == 30
    # Education should be max (30) for having education
    assert breakdown["education"] == 30


@pytest.mark.asyncio
async def test_score_candidate_no_skills_overlap(client):
    """Test scoring when candidate has no matching skills"""
    response = await client.post("/api/score-candidate", json={
        "candidate_profile": {
            "skills": ["Java", "C++", "Ruby"],
            "yearsExperience": 5,
            "education": [{"degree": "PhD"}]
        },
        "job_description": {
            "title": "Python Dev",
            "requiredSkills": ["Python", "Django", "FastAPI"],
            "experienceMin": 3
        }
    })

    assert response.status_code == 200
    data = response.json()

    # Skills score should be 0 (no overlap)
    assert data["breakdown"]["skills"] == 0


@pytest.mark.asyncio
async def test_score_candidate_experience_below_minimum(client):
    """Test scoring when candidate has less experience than required"""
    response = await client.post("/api/score-candidate", json={
        "candidate_profile": {
            "skills": ["Python"],
            "yearsExperience": 1,
            "education": [{"degree": "B.S."}]
        },
        "job_description": {
            "title": "Senior Developer",
            "requiredSkills": ["Python"],
            "experienceMin": 5
        }
    })

    assert response.status_code == 200
    data = response.json()

    # Experience score should be partial (1/5 = 20% of 30 = 6)
    assert data["breakdown"]["experience"] < 30


@pytest.mark.asyncio
async def test_score_candidate_no_experience_requirement(client):
    """Test scoring when job has no experience requirement"""
    response = await client.post("/api/score-candidate", json={
        "candidate_profile": {
            "skills": ["Python"],
            "yearsExperience": 0,
            "education": [{"degree": "B.S."}]
        },
        "job_description": {
            "title": "Junior Developer",
            "requiredSkills": ["Python"],
            "experienceMin": 0
        }
    })

    assert response.status_code == 200
    data = response.json()

    # Should get mid score for experience when no requirement
    assert data["breakdown"]["experience"] == 15


@pytest.mark.asyncio
async def test_score_candidate_no_education(client):
    """Test scoring when candidate has no education info"""
    response = await client.post("/api/score-candidate", json={
        "candidate_profile": {
            "skills": ["Python"],
            "yearsExperience": 3,
            "education": []
        },
        "job_description": {
            "title": "Developer",
            "requiredSkills": ["Python"],
            "experienceMin": 2
        }
    })

    assert response.status_code == 200
    data = response.json()

    # Education score should be mid (15) when no education info
    assert data["breakdown"]["education"] == 15


@pytest.mark.asyncio
async def test_score_candidate_empty_required_skills(client):
    """Test scoring when job has no required skills"""
    response = await client.post("/api/score-candidate", json={
        "candidate_profile": {
            "skills": ["Python", "Django"],
            "yearsExperience": 3,
            "education": [{"degree": "B.S."}]
        },
        "job_description": {
            "title": "Developer",
            "requiredSkills": [],
            "experienceMin": 2
        }
    })

    assert response.status_code == 200
    data = response.json()

    # Skills score should be 0 when no required skills
    assert data["breakdown"]["skills"] == 0


@pytest.mark.asyncio
async def test_score_candidate_missing_field(client):
    """Test error handling for missing required fields"""
    response = await client.post("/api/score-candidate", json={})

    assert response.status_code == 422  # Validation error
