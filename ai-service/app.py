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
import uuid
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.ranker import rank_resumes, ResumeFile

# ──────────────────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────────────────

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# In-memory session store (replace with Redis / DB for production)
# ──────────────────────────────────────────────────────────────────────────────

# { job_id: { "resumes": [ResumeFile], "jd_text": str, "results": [...] } }
SESSION_STORE: dict[str, dict[str, Any]] = {}


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Response Models
# ──────────────────────────────────────────────────────────────────────────────

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


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health_check():
    """Verify the API is running."""
    return {"status": "ok", "service": "Resume Ranker API v1.0.0"}


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
    if job_id not in SESSION_STORE:
        SESSION_STORE[job_id] = {"resumes": [], "jd_text": "", "results": []}

    names = [n.strip() for n in candidate_names.split(",")] if candidate_names else []

    uploaded = []
    for i, file in enumerate(files):
        content = await file.read()
        name = names[i] if i < len(names) else ""
        SESSION_STORE[job_id]["resumes"].append(
            ResumeFile(filename=file.filename or f"resume_{i}.pdf",
                       file_bytes=content,
                       candidate_name=name)
        )
        uploaded.append(file.filename)

    logger.info("Uploaded %d resume(s) to job_id=%s", len(files), job_id)
    return {
        "job_id": job_id,
        "uploaded_files": uploaded,
        "total_resumes_in_session": len(SESSION_STORE[job_id]["resumes"]),
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
    SESSION_STORE[job_id] = {
        "resumes": [],
        "jd_text": jd_text,
        "job_title": job_title or "Untitled Position",
        "results": [],
    }

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
    if job_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail=f"job_id '{job_id}' not found.")

    session = SESSION_STORE[job_id]
    resumes: list[ResumeFile] = session.get("resumes", [])
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

    # Cache results
    session["results"] = results

    return RankingResponse(
        job_id=job_id,
        total_resumes=len(results),
        rankings=[_result_to_out(r) for r in results],
    )


@app.get("/results/{job_id}", response_model=RankingResponse, tags=["ML Pipeline"])
def get_results(job_id: str):
    """
    Retrieve previously computed rankings for a job session
    (cached after /get_rankings was called).
    """
    if job_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail=f"job_id '{job_id}' not found.")

    results = SESSION_STORE[job_id].get("results", [])
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
    if job_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail=f"job_id '{job_id}' not found.")
    del SESSION_STORE[job_id]
    return {"message": f"Session '{job_id}' cleared successfully."}


# ──────────────────────────────────────────────────────────────────────────────
# Dev runner
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)