# models/ranker.py
# Phase 8 – Ranking System
# Orchestrates parsing → embedding → scoring → sorting for a batch of resumes

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

from models.resume_parser import parse_resume
from models.preprocessor import preprocess_text, preprocess_for_embedding
from models.embedder import get_embedding, get_embeddings_batch
from models.scorer import score_resume, ScoringResult
from utils.skill_dict import normalize_skill

logger = logging.getLogger(__name__)


@dataclass
class ResumeFile:
    filename: str
    file_bytes: bytes
    candidate_name: str = ""   # Optional: extracted or provided by caller


def _extract_candidate_name(raw_text: str) -> str:
    """
    Heuristic: the candidate name is usually on the first 1-2 lines of the resume.
    Returns the first non-empty line as a best guess.
    """
    lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
    if not lines:
        return "Unknown"
    # First line that looks like a name (no digits, reasonable length)
    import re
    for line in lines[:5]:
        if (
            2 < len(line) < 60
            and not re.search(r"\d", line)
            and not any(
                kw in line.lower()
                for kw in ["resume", "curriculum", "vitae", "cv", "profile", "summary"]
            )
        ):
            return line
    return lines[0][:60]   # fallback: first line truncated


def rank_resumes(
    resume_files: list[ResumeFile],
    jd_text: str,
) -> list[ScoringResult]:
    """
    Full pipeline: parse → preprocess → embed → score → rank N resumes against a JD.

    Args:
        resume_files:  List of ResumeFile objects (filename + raw bytes).
        jd_text:       Raw job description text.

    Returns:
        List of ScoringResult, sorted by final_score descending (rank 1 = best).
    """
    if not resume_files:
        raise ValueError("No resume files provided.")
    if not jd_text.strip():
        raise ValueError("Job description text is empty.")

    # ── Step 1: Parse all resumes ─────────────────────────────────────────
    logger.info("Parsing %d resume(s)...", len(resume_files))
    raw_texts: list[str] = []
    valid_files: list[ResumeFile] = []

    for rf in resume_files:
        try:
            raw = parse_resume(rf.file_bytes, rf.filename)
            if not raw.strip():
                logger.warning("Empty text from '%s' – skipping.", rf.filename)
                continue
            raw_texts.append(raw)
            valid_files.append(rf)
        except Exception as e:
            logger.error("Failed to parse '%s': %s", rf.filename, e)

    if not raw_texts:
        raise RuntimeError("No resumes could be parsed successfully.")

    # ── Step 2: Extract candidate names (if not pre-filled) ──────────────
    for rf, raw in zip(valid_files, raw_texts):
        if not rf.candidate_name:
            rf.candidate_name = _extract_candidate_name(raw)

    # ── Step 3: Preprocess texts ──────────────────────────────────────────
    logger.info("Preprocessing texts...")
    jd_for_embedding = preprocess_for_embedding(jd_text)
    resume_texts_for_embedding = [preprocess_for_embedding(t) for t in raw_texts]

    # ── Step 4: Generate embeddings (batch for efficiency) ────────────────
    logger.info("Generating embeddings...")
    jd_embedding: np.ndarray = get_embedding(jd_for_embedding)

    all_texts = resume_texts_for_embedding   # may be 1 or many
    if len(all_texts) > 1:
        resume_embeddings = get_embeddings_batch(all_texts)
    else:
        resume_embeddings = get_embedding(all_texts[0]).reshape(1, -1)

    # ── Step 5: Score each resume ─────────────────────────────────────────
    logger.info("Scoring %d resume(s)...", len(valid_files))
    results: list[ScoringResult] = []

    for i, (rf, raw, embed) in enumerate(
        zip(valid_files, raw_texts, resume_embeddings)
    ):
        try:
            result = score_resume(
                resume_text=raw,
                jd_text=jd_text,
                resume_embedding=embed,
                jd_embedding=jd_embedding,
                filename=rf.filename,
                candidate_name=rf.candidate_name,
            )
            results.append(result)
        except Exception as e:
            logger.error("Scoring failed for '%s': %s", rf.filename, e)

    # ── Step 6: Sort & assign ranks ───────────────────────────────────────
    results.sort(key=lambda r: r.final_score, reverse=True)
    for rank, result in enumerate(results, start=1):
        result.rank = rank

    logger.info("Ranking complete. Top candidate: %s (%.1f%%)",
                results[0].candidate_name if results else "N/A",
                results[0].final_score_pct if results else 0)

    return results