"""
SRRSS AI Service - Resume Parsing, Candidate Scoring, and Bias Detection
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SRRSS AI Service",
    description="AI service for resume parsing, candidate scoring, and bias detection",
    version="1.0.0"
)


class JobDescription(BaseModel):
    title: str
    description: str
    requiredSkills: List[str]
    experienceMin: Optional[int] = 0


class CandidateProfile(BaseModel):
    skills: List[str] = []
    experience: List[Dict] = []
    education: List[Dict] = []
    yearsExperience: Optional[float] = 0


class ResumeParseRequest(BaseModel):
    file_path: str
    file_type: str


class BiasDetectionRequest(BaseModel):
    job_description: str


class CandidateScoringRequest(BaseModel):
    candidate_profile: Dict
    job_description: Dict


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "srrss-ai-service"}


@app.post("/api/parse-resume")
async def parse_resume(request: ResumeParseRequest):
    """
    Parse a resume file (PDF or DOCX) and extract structured data.
    Returns skills, experience, education, and contact information.
    """
    # Mock implementation - in production, integrate with actual parsing library
    logger.info(f"Parsing resume: {request.file_path} ({request.file_type})")

    # Simulated parsing result
    return {
        "skills": ["Python", "JavaScript", "React", "Node.js", "MongoDB"],
        "experience": [
            {"title": "Software Engineer", "company": "Tech Corp", "years": 3}
        ],
        "education": [
            {"degree": "B.S. Computer Science", "institution": "University", "year": "2020"}
        ],
        "yearsExperience": 3.0,
        "email": "candidate@example.com",
        "phone": "+1-555-0100"
    }


@app.post("/api/detect-bias")
async def detect_bias(request: BiasDetectionRequest):
    """
    Analyze job description for biased language and suggest alternatives.
    Returns flagged terms with severity levels and suggestions.
    """
    logger.info("Analyzing job description for bias")

    # Simple keyword-based bias detection (mock)
    biased_terms = {
        "rockstar": {"severity": "high", "suggestion": "skilled professional"},
        "ninja": {"severity": "high", "suggestion": "expert"},
        "young": {"severity": "high", "suggestion": "enthusiastic"},
        "aggressive": {"severity": "medium", "suggestion": "proactive"},
        "dominant": {"severity": "medium", "suggestion": "leading"},
        "guys": {"severity": "medium", "suggestion": "team members"},
        "salesman": {"severity": "low", "suggestion": "sales representative"},
        "chairman": {"severity": "low", "suggestion": "chairperson"},
    }

    job_desc_lower = request.job_description.lower()
    bias_flags = []

    for term, info in biased_terms.items():
        if term in job_desc_lower:
            bias_flags.append({
                "term": term,
                "suggestion": info["suggestion"],
                "severity": info["severity"]
            })

    return {
        "biasFlags": bias_flags,
        "biasCount": len(bias_flags),
        "analyzed": True
    }


@app.post("/api/score-candidate")
async def score_candidate(request: CandidateScoringRequest):
    """
    Score a candidate against a job description.
    Returns match score (0-100) and breakdown by category.
    """
    logger.info("Scoring candidate against job")

    candidate = request.candidate_profile
    job = request.job_description

    # Extract job requirements
    required_skills = set(job.get("requiredSkills", []))
    candidate_skills = set(candidate.get("skills", []))

    # Skills score (0-40 points)
    if required_skills:
        skill_match = len(required_skills & candidate_skills) / len(required_skills)
        skills_score = int(skill_match * 40)
    else:
        skills_score = 0

    # Experience score (0-30 points)
    candidate_exp_years = candidate.get("yearsExperience", 0)
    min_exp = job.get("experienceMin", 0)
    if min_exp > 0:
        exp_ratio = min(1.0, candidate_exp_years / min_exp)
        experience_score = int(exp_ratio * 30)
    else:
        experience_score = 15  # Default mid score

    # Education score (0-30 points)
    education = candidate.get("education", [])
    if education:
        education_score = 30  # Has education
    else:
        education_score = 15  # No education info

    # Total score
    total_score = skills_score + experience_score + education_score

    return {
        "matchScore": total_score,
        "breakdown": {
            "skills": skills_score,
            "experience": experience_score,
            "education": education_score
        },
        "recommendation": "strong" if total_score >= 70 else "moderate" if total_score >= 40 else "weak"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
