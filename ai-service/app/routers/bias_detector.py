"""
Bias Detector Router
Scans job descriptions for biased or exclusionary language.
Uses a curated dictionary of known bias terms.
"""

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class BiasCheckRequest(BaseModel):
    job_description: str


class BiasFlag(BaseModel):
    term: str
    suggestion: str
    severity: str  # "low", "medium", "high"


class BiasCheckResponse(BaseModel):
    biasFlags: list[BiasFlag] = []
    score: int = 100  # 100 = no bias detected, 0 = highly biased
    summary: str = ""


# Curated bias dictionary (expandable)
BIAS_TERMS = {
    # Gender-coded masculine
    "rockstar": {"suggestion": "skilled professional", "severity": "medium"},
    "ninja": {"suggestion": "expert", "severity": "medium"},
    "guru": {"suggestion": "specialist", "severity": "low"},
    "he ": {"suggestion": "they/the candidate", "severity": "high"},
    "his ": {"suggestion": "their", "severity": "high"},
    "manpower": {"suggestion": "workforce", "severity": "medium"},
    "chairman": {"suggestion": "chairperson", "severity": "medium"},
    "mankind": {"suggestion": "humanity", "severity": "low"},
    "man-hours": {"suggestion": "person-hours", "severity": "low"},
    "aggressive": {"suggestion": "ambitious", "severity": "medium"},
    "dominant": {"suggestion": "leading", "severity": "medium"},
    "competitive": {"suggestion": "results-driven", "severity": "low"},
    # Gender-coded feminine (may alienate some candidates)
    "nurturing": {"suggestion": "supportive", "severity": "low"},
    # Age bias
    "young": {"suggestion": "early-career", "severity": "high"},
    "digital native": {"suggestion": "proficient with technology", "severity": "medium"},
    "recent graduate": {"suggestion": "entry-level candidate", "severity": "low"},
    "energetic": {"suggestion": "motivated", "severity": "low"},
    # Cultural bias
    "native english": {"suggestion": "fluent in English", "severity": "high"},
    "culture fit": {"suggestion": "values alignment", "severity": "medium"},
    # Disability bias
    "able-bodied": {"suggestion": "physically capable of performing duties", "severity": "high"},
    "normal": {"suggestion": "typical", "severity": "low"},
}


@router.post("/detect-bias", response_model=BiasCheckResponse)
async def detect_bias(request: BiasCheckRequest):
    """Scan a job description for biased language."""
    text_lower = request.job_description.lower()
    flags = []

    for term, info in BIAS_TERMS.items():
        if term.lower() in text_lower:
            flags.append(BiasFlag(
                term=term.strip(),
                suggestion=info["suggestion"],
                severity=info["severity"],
            ))

    # Calculate score
    severity_weights = {"low": 5, "medium": 10, "high": 20}
    penalty = sum(severity_weights.get(f.severity, 5) for f in flags)
    score = max(0, 100 - penalty)

    # Summary
    if not flags:
        summary = "No bias detected. The job description appears inclusive."
    elif score >= 70:
        summary = f"Minor bias concerns ({len(flags)} term(s) flagged). Consider revising for inclusivity."
    elif score >= 40:
        summary = f"Moderate bias detected ({len(flags)} term(s) flagged). Revision recommended."
    else:
        summary = f"Significant bias detected ({len(flags)} term(s) flagged). Strong revision needed."

    return BiasCheckResponse(
        biasFlags=flags,
        score=score,
        summary=summary,
    )
