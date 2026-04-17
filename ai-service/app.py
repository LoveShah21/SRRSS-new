# app.py
# Phase 9 – FastAPI Backend
#
# Endpoints:
#   POST /upload_resume      – upload one or many resumes (PDF/DOCX/TXT)
#   POST /upload_jd          – submit job description text
#   POST /get_rankings       – score & rank all uploaded resumes vs the JD
#   GET  /results/{job_id}   – retrieve stored results
#   DELETE /clear/{job_id}   – clear session data
#   GET  /health             – health check

from __future__ import annotations

import logging
import os
import uuid
import base64
import httpx
from typing import Any, Dict, List
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl
from dotenv import load_dotenv

from models.ranker import rank_resumes, ResumeFile
from models.resume_parser import parse_resume
from models.extractor import ResumeStructuredExtractor
from models.ethics import BiasDetector, PIIMasker
from models.scorer import compute_experience_score, compute_final_score, compute_skill_score
from session_store import SessionStore

# ... (rest of imports)

# ... (logging config remains same)

# ──────────────────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────────────────

# Load environment variables from ai-service/.env when present.
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=False)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s – %(message)s",
)
logger = logging.getLogger("resume_ranker.api")

# ──────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Resume Ranker API",
    description=(
        "ML-powered API that parses resumes, embeds them with Sentence-BERT, "
        "and ranks candidates against a job description."
    ),
    version="1.0.0",
)

def _parse_allowed_origins() -> list[str]:
    raw = os.getenv("AI_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:5173"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-KEY"],
)

AI_REQUIRE_API_KEY = os.getenv("AI_REQUIRE_API_KEY", "true").lower() in {"1", "true", "yes", "on"}
AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY")


def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-KEY")):
    if not AI_REQUIRE_API_KEY:
        return
    if not AI_SERVICE_API_KEY:
        logger.error("AI_SERVICE_API_KEY is not configured while API key enforcement is enabled.")
        raise HTTPException(status_code=500, detail="AI service auth is misconfigured.")
    if x_api_key != AI_SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key.")

# ──────────────────────────────────────────────────────────────────────────────
# Session store (Redis-backed when configured, with in-memory fallback)
# ──────────────────────────────────────────────────────────────────────────────

SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "86400"))
session_store = SessionStore(
    redis_url=os.getenv("REDIS_URL"),
    ttl_seconds=SESSION_TTL_SECONDS,
)


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Response Models
# ──────────────────────────────────────────────────────────────────────────────

class BiasReport(BaseModel):
    bias_score: float
    findings: List[Dict[str, Any]]
    is_biased: bool
    recommendation: str

class ParseResumeRequest(BaseModel):
    file_url: HttpUrl
    file_path: str
    file_type: str

class EducationEntry(BaseModel):
    institution: str
    year: str
    degree: str

class ExperienceEntry(BaseModel):
    company: str
    role: str
    duration: str
    description: str = ""

class ProjectEntry(BaseModel):
    name: str
    techStack: List[str] = Field(default_factory=list)
    description: str = ""

class ParseResumeResponse(BaseModel):
    skills: List[str]
    education: List[EducationEntry]
    experience: List[ExperienceEntry]
    projects: List[ProjectEntry] = Field(default_factory=list)

class ScoreCandidateRequest(BaseModel):
    candidate_profile: Dict[str, Any]
    job_description: Dict[str, Any]

class SkillMatchOut(BaseModel):
    jd_skills: list[str]
    resume_skills: list[str]
    matched_skills: list[str]
    missing_skills: list[str]
    skill_score: float

class ExperienceMatchOut(BaseModel):
    jd_years_required: float | None
    resume_years_found: float | None
    experience_score: float
    note: str

class CandidateResult(BaseModel):
    rank: int
    candidate_name: str
    filename: str
    final_score_pct: float          # 0 – 100
    similarity_score: float         # 0 – 1
    skill_match: SkillMatchOut
    experience_match: ExperienceMatchOut

class RankingResponse(BaseModel):
    job_id: str
    total_resumes: int
    rankings: list[CandidateResult]

class ScoreCandidateResponse(BaseModel):
    matchScore: float
    breakdown: Dict[str, float]
    explanation: Dict[str, Any]


# ──────────────────────────────────────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────────────────────────────────────

def _result_to_out(r) -> CandidateResult:
    return CandidateResult(
        rank=r.rank,
        candidate_name=r.candidate_name,
        filename=r.filename,
        final_score_pct=r.final_score_pct,
        similarity_score=r.similarity_score,
        skill_match=SkillMatchOut(
            jd_skills=r.skill_match.jd_skills,
            resume_skills=r.skill_match.resume_skills,
            matched_skills=r.skill_match.matched_skills,
            missing_skills=r.skill_match.missing_skills,
            skill_score=r.skill_match.skill_score,
        ),
        experience_match=ExperienceMatchOut(
            jd_years_required=r.experience_match.jd_years_required,
            resume_years_found=r.experience_match.resume_years_found,
            experience_score=r.experience_match.experience_score,
            note=r.experience_match.note,
        ),
    )


def _new_session(job_title: str = "Untitled Position") -> dict[str, Any]:
    return {
        "resumes": [],
        "jd_text": "",
        "job_title": job_title,
        "results": [],
    }


def _encode_resume_file(resume: ResumeFile) -> dict[str, Any]:
    return {
        "filename": resume.filename,
        "candidate_name": resume.candidate_name or "",
        "file_bytes_b64": base64.b64encode(resume.file_bytes).decode("utf-8"),
    }


def _decode_resume_file(payload: dict[str, Any]) -> ResumeFile:
    return ResumeFile(
        filename=payload.get("filename", "resume.pdf"),
        candidate_name=payload.get("candidate_name", ""),
        file_bytes=base64.b64decode(payload.get("file_bytes_b64", "")),
    )


def _candidate_result_to_dict(result: CandidateResult) -> dict[str, Any]:
    if hasattr(result, "model_dump"):
        return result.model_dump()
    return result.dict()


def _candidate_result_from_dict(payload: dict[str, Any]) -> CandidateResult:
    return CandidateResult(**payload)


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health_check():
    """Verify the API is running."""
    return {"status": "ok", "service": "Resume Ranker API v1.0.0"}


@app.post("/api/check-bias", response_model=BiasReport, tags=["Ethical AI"])
async def check_bias(request: Dict[str, Any], _: None = Depends(require_api_key)):
    """
    Analyze a job description for biased or exclusionary language.
    """
    text = request.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is required for bias analysis.")

    detector = BiasDetector()
    return detector.analyze_text(text)


@app.post("/api/detect-bias", tags=["Ethical AI"])
async def detect_bias(request: Dict[str, Any], _: None = Depends(require_api_key)):
    """
    Compatibility endpoint used by backend jobs router.
    Returns normalized biasFlags payload expected by Node backend.
    """
    text = request.get("job_description") or request.get("text") or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="job_description or text is required.")

    detector = BiasDetector()
    report = detector.analyze_text(text)
    bias_flags = [
        {
            "term": finding.get("term", ""),
            "suggestion": finding.get("suggestion", ""),
            "severity": "high" if finding.get("count", 0) > 1 else "medium",
        }
        for finding in report.get("findings", [])
    ]
    return {
        "biasFlags": bias_flags,
        "biasScore": report.get("bias_score", 0),
        "isBiased": report.get("is_biased", False),
        "recommendation": report.get("recommendation", ""),
    }


@app.post("/api/score-candidate", response_model=ScoreCandidateResponse, tags=["AI Scoring"])
async def score_candidate(request: ScoreCandidateRequest, _: None = Depends(require_api_key)):
    """
    Score one candidate profile against one job description.
    Returns 0-100 matchScore with recruiter-friendly explanation.
    """
    candidate_profile = request.candidate_profile or {}
    job_description = request.job_description or {}

    profile_skills = candidate_profile.get("skills") or []
    profile_experience = candidate_profile.get("experience") or []
    profile_education = candidate_profile.get("education") or []

    resume_parts: list[str] = []
    if profile_skills:
        resume_parts.append(f"Skills: {', '.join(map(str, profile_skills))}")
    for exp in profile_experience:
        if isinstance(exp, dict):
            title = exp.get("title") or exp.get("role") or ""
            company = exp.get("company") or ""
            years = exp.get("years")
            years_part = f" ({years} years)" if years is not None else ""
            resume_parts.append(f"Experience: {title} at {company}{years_part}".strip())
    for edu in profile_education:
        if isinstance(edu, dict):
            degree = edu.get("degree") or ""
            institution = edu.get("institution") or ""
            resume_parts.append(f"Education: {degree} at {institution}".strip())
    resume_text = "\n".join(part for part in resume_parts if part).strip()

    jd_required_skills = job_description.get("requiredSkills") or []
    jd_title = str(job_description.get("title") or "").strip()
    jd_description = str(job_description.get("description") or "").strip()
    jd_experience_min = job_description.get("experienceMin")
    jd_parts = [jd_title, jd_description]
    if jd_required_skills:
        jd_parts.append(f"Required skills: {', '.join(map(str, jd_required_skills))}")
    if jd_experience_min is not None:
        jd_parts.append(f"Minimum {jd_experience_min} years experience required")
    jd_text = "\n".join(part for part in jd_parts if part).strip()

    if not jd_text:
        raise HTTPException(status_code=400, detail="job_description must include title or description.")
    if not resume_text:
        return {
            "matchScore": 0,
            "breakdown": {"skills": 0, "experience": 0, "education": 0},
            "explanation": {
                "matchedSkills": [],
                "missingSkills": jd_required_skills,
                "experienceNote": "Candidate profile does not include enough data for scoring.",
            },
        }

    skill_match = compute_skill_score(resume_text, jd_text)
    experience_match = compute_experience_score(resume_text, jd_text)
    semantic_similarity = 0.5
    final_score = compute_final_score(
        similarity_score=semantic_similarity,
        skill_score=skill_match.skill_score,
        experience_score=experience_match.experience_score,
    )
    match_score = round(final_score * 100, 2)

    return {
        "matchScore": match_score,
        "breakdown": {
            "skills": round(skill_match.skill_score * 100, 2),
            "experience": round(experience_match.experience_score * 100, 2),
            "education": 0,
        },
        "explanation": {
            "matchedSkills": skill_match.matched_skills,
            "missingSkills": skill_match.missing_skills,
            "experienceNote": experience_match.note,
        },
    }


@app.post("/api/parse-resume", response_model=ParseResumeResponse, tags=["AI Extraction"])
async def parse_resume_endpoint(
    request: ParseResumeRequest,
    anonymize: bool = False,
    _: None = Depends(require_api_key),
):
    """
    Fetch a resume from a URL, extract raw text, and return structured JSON
    for profile auto-filling in the backend.
    """
    try:
        # 1. Fetch file bytes from R2
        async with httpx.AsyncClient() as client:
            response = await client.get(str(request.file_url), timeout=10.0)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch resume from storage.")
            file_bytes = response.content

        # 2. Extract raw text
        raw_text = parse_resume(file_bytes, request.file_path)

        if not raw_text:
            return ParseResumeResponse(skills=[], education=[], experience=[])

        # 3. Optional Anonymization (PII Masking)
        if anonymize:
            masker = PIIMasker()
            # Note: In production we'd pass the loaded spacy nlp object here
            # For now, we use the regex-based mask.
            raw_text = masker.mask(raw_text)

        # 4. Structured extraction
        extractor = ResumeStructuredExtractor()
        structured_data = extractor.parse(raw_text)

        return ParseResumeResponse(**structured_data)

    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e))
    except Exception as e:
        logger.exception("Resume parsing failed for %s", request.file_path)
        raise HTTPException(status_code=500, detail=f"Parsing error: {str(e)}")


@app.post("/upload_resume", tags=["Data Upload"])
async def upload_resume(
    job_id: str = Form(..., description="Job session ID (create one via /upload_jd first)"),
    files: list[UploadFile] = File(..., description="One or more resume files (PDF / DOCX / TXT)"),
    candidate_names: str = Form(
        default="",
        description="Optional comma-separated candidate names matching file order",
    ),
):
    """
    **Phase 1 entry point.**
    Upload one or more resume files for a given job session.
    Files are stored in memory; actual parsing happens at /get_rankings.
    """
    session = session_store.get(job_id)
    if not session:
        session = _new_session()

    names = [n.strip() for n in candidate_names.split(",")] if candidate_names else []

    uploaded = []
    for i, file in enumerate(files):
        content = await file.read()
        name = names[i] if i < len(names) else ""
        session["resumes"].append(
            _encode_resume_file(
                ResumeFile(
                    filename=file.filename or f"resume_{i}.pdf",
                    file_bytes=content,
                    candidate_name=name,
                )
            )
        )
        uploaded.append(file.filename)

    session_store.set(job_id, session)

    logger.info("Uploaded %d resume(s) to job_id=%s", len(files), job_id)
    return {
        "job_id": job_id,
        "uploaded_files": uploaded,
        "total_resumes_in_session": len(session["resumes"]),
    }


@app.post("/upload_jd", tags=["Data Upload"])
async def upload_jd(
    jd_text: str = Form(..., description="Full job description text"),
    job_title: str = Form(default="", description="Optional job title label"),
):
    """
    Submit a job description and receive a new **job_id** for this session.
    Use this job_id in all subsequent calls.
    """
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    job_id = str(uuid.uuid4())
    session_store.set(
        job_id,
        {
            **_new_session(job_title=job_title or "Untitled Position"),
            "jd_text": jd_text,
        },
    )

    logger.info("New job session created: job_id=%s (%s)", job_id, job_title)
    return {
        "job_id": job_id,
        "job_title": job_title or "Untitled Position",
        "message": "Job description saved. Now upload resumes via /upload_resume.",
    }


@app.post("/get_rankings", response_model=RankingResponse, tags=["ML Pipeline"])
async def get_rankings(
    job_id: str = Form(..., description="Job session ID"),
):
    """
    **Core ML endpoint.**
    Triggers the full pipeline for all uploaded resumes vs the stored JD:

    1. Parse resumes (Phase 1)
    2. Preprocess text (Phase 2)
    3. Generate Sentence-BERT embeddings (Phase 3)
    4. Cosine similarity scoring (Phase 4)
    5. Skill extraction & matching (Phase 5)
    6. Experience matching (Phase 6)
    7. Weighted final scoring (Phase 7)
    8. Sort & rank (Phase 8)

    Returns ranked candidate list with scores and skill gap analysis.
    """
    session = session_store.get(job_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"job_id '{job_id}' not found.")
    resumes: list[ResumeFile] = [_decode_resume_file(item) for item in session.get("resumes", [])]
    jd_text: str = session.get("jd_text", "")

    if not resumes:
        raise HTTPException(
            status_code=400,
            detail="No resumes uploaded for this job session. "
                   "Upload resumes first via /upload_resume.",
        )
    if not jd_text:
        raise HTTPException(
            status_code=400,
            detail="No job description found for this session.",
        )

    try:
        results = rank_resumes(resumes, jd_text)
    except Exception as e:
        logger.exception("Ranking pipeline failed for job_id=%s", job_id)
        raise HTTPException(status_code=500, detail=f"Ranking failed: {str(e)}")

    rankings = [_result_to_out(r) for r in results]

    # Persist results for multi-step retrieval (/results/{job_id})
    session["results"] = [_candidate_result_to_dict(result) for result in rankings]
    session_store.set(job_id, session)

    return RankingResponse(
        job_id=job_id,
        total_resumes=len(rankings),
        rankings=rankings,
    )


@app.get("/results/{job_id}", response_model=RankingResponse, tags=["ML Pipeline"])
def get_results(job_id: str):
    """
    Retrieve previously computed rankings for a job session
    (cached after /get_rankings was called).
    """
    session = session_store.get(job_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"job_id '{job_id}' not found.")
    results_payload = session.get("results", [])
    results = [_candidate_result_from_dict(item) for item in results_payload]
    if not results:
        raise HTTPException(
            status_code=404,
            detail="No results yet. Call /get_rankings first.",
        )

    return RankingResponse(
        job_id=job_id,
        total_resumes=len(results),
        rankings=[_result_to_out(r) for r in results],
    )


@app.delete("/clear/{job_id}", tags=["System"])
def clear_session(job_id: str):
    """Delete all data associated with a job session."""
    deleted = session_store.delete(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"job_id '{job_id}' not found.")
    return {"message": f"Session '{job_id}' cleared successfully."}


# ──────────────────────────────────────────────────────────────────────────────
# Dev runner
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
