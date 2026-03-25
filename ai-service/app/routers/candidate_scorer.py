"""
Candidate Scorer Router
Scores candidates against job requirements.
Generates a 0-100 match score with breakdown.
"""

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class CandidateProfile(BaseModel):
    firstName: str = ""
    lastName: str = ""
    skills: list[str] = []
    education: list[dict] = []
    experience: list[dict] = []


class JobDescription(BaseModel):
    title: str = ""
    description: str = ""
    requiredSkills: list[str] = []
    experienceMin: int = 0


class ScoreRequest(BaseModel):
    candidate_profile: CandidateProfile
    job_description: JobDescription


class ScoreResponse(BaseModel):
    matchScore: int = 0
    breakdown: dict = {"skills": 0, "experience": 0, "education": 0}
    explanation: str = ""


def compute_skill_score(candidate_skills: list[str], required_skills: list[str]) -> int:
    """Score based on skill overlap (0-100)."""
    if not required_skills:
        return 50  # Neutral if no skills specified

    candidate_lower = {s.lower() for s in candidate_skills}
    required_lower = {s.lower() for s in required_skills}

    if not required_lower:
        return 50

    matched = candidate_lower & required_lower
    return min(100, int((len(matched) / len(required_lower)) * 100))


def compute_experience_score(experience: list[dict], min_years: int) -> int:
    """Score based on total experience vs requirement (0-100)."""
    total_years = sum(e.get("years", 0) for e in experience)
    if min_years <= 0:
        return 70 if total_years > 0 else 50

    ratio = total_years / min_years
    return min(100, int(ratio * 100))


def compute_education_score(education: list[dict]) -> int:
    """Score based on education level (0-100)."""
    if not education:
        return 30

    degree_weights = {
        "phd": 100, "doctor": 100,
        "master": 85, "ms": 85, "ma": 85, "mtech": 85, "mba": 85,
        "bachelor": 70, "bs": 70, "ba": 70, "btech": 70, "be": 70,
    }

    max_score = 40  # Base score for having any education
    for edu in education:
        degree = edu.get("degree", "").lower().replace(".", "")
        for key, score in degree_weights.items():
            if key in degree:
                max_score = max(max_score, score)
                break

    return max_score


@router.post("/score-candidate", response_model=ScoreResponse)
async def score_candidate(request: ScoreRequest):
    """Score a candidate profile against a job description."""
    cp = request.candidate_profile
    jd = request.job_description

    skill_score = compute_skill_score(cp.skills, jd.requiredSkills)
    exp_score = compute_experience_score(cp.experience, jd.experienceMin)
    edu_score = compute_education_score(cp.education)

    # Weighted average (skills most important)
    weights = {"skills": 0.50, "experience": 0.30, "education": 0.20}
    total = int(
        skill_score * weights["skills"]
        + exp_score * weights["experience"]
        + edu_score * weights["education"]
    )

    # Generate explanation
    matched_skills = set(s.lower() for s in cp.skills) & set(s.lower() for s in jd.requiredSkills)
    missing_skills = set(s.lower() for s in jd.requiredSkills) - set(s.lower() for s in cp.skills)

    explanation = f"Match: {total}/100. "
    if matched_skills:
        explanation += f"Matched skills: {', '.join(matched_skills)}. "
    if missing_skills:
        explanation += f"Missing: {', '.join(missing_skills)}."

    return ScoreResponse(
        matchScore=total,
        breakdown={
            "skills": skill_score,
            "experience": exp_score,
            "education": edu_score,
        },
        explanation=explanation,
    )
