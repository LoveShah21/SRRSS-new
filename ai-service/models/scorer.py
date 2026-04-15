# models/scorer.py
# Phase 4 – Cosine Similarity Scoring
# Phase 5 – Skill Extraction & Matching
# Phase 6 – Experience Matching
# Phase 7 – Final Weighted Scoring

from __future__ import annotations

import re
import logging
import numpy as np
from dataclasses import dataclass, field
from sklearn.metrics.pairwise import cosine_similarity

from utils.skill_dict import ALL_SKILLS_UNIQUE, normalize_skill

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Data Classes
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class SkillMatchResult:
    jd_skills: list[str]
    resume_skills: list[str]
    matched_skills: list[str]
    missing_skills: list[str]
    skill_score: float          # 0.0 – 1.0


@dataclass
class ExperienceMatchResult:
    jd_years_required: float | None     # years extracted from JD
    resume_years_found: float | None    # years extracted from resume
    experience_score: float             # 0.0 – 1.0
    note: str


@dataclass
class ScoringResult:
    candidate_name: str
    filename: str
    similarity_score: float         # cosine similarity (0–1)
    skill_match: SkillMatchResult
    experience_match: ExperienceMatchResult
    final_score: float              # weighted (0–1)
    final_score_pct: float          # 0–100
    rank: int = 0                   # set later by ranker


# ──────────────────────────────────────────────────────────────────────────────
# Phase 4 – Cosine Similarity
# ──────────────────────────────────────────────────────────────────────────────

def compute_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Cosine similarity between two 1-D embedding vectors.
    Since embeddings are L2-normalised, this is simply the dot product.
    Returns a float in [0, 1] (embeddings are normalised, so values are ≥ 0).
    """
    # reshape for sklearn: (1, dim) each
    sim = cosine_similarity(vec_a.reshape(1, -1), vec_b.reshape(1, -1))
    score = float(sim[0][0])
    # Clamp to [0, 1] (floating-point safety)
    return max(0.0, min(1.0, score))


# ──────────────────────────────────────────────────────────────────────────────
# Phase 5 – Skill Extraction & Matching
# ──────────────────────────────────────────────────────────────────────────────

def extract_skills(text: str) -> list[str]:
    """
    Extract skills from a text by matching against the master skill dictionary.

    Uses multi-word phrase matching (e.g. "machine learning", "natural language processing")
    as well as single-word matching.

    Returns a deduplicated list of canonical skill names found in the text.
    """
    text_lower = text.lower()
    found: set[str] = set()

    # Sort by length descending so multi-word skills match before their sub-words
    sorted_skills = sorted(ALL_SKILLS_UNIQUE, key=len, reverse=True)

    for skill in sorted_skills:
        # Use word-boundary regex to avoid partial matches
        # e.g., "r" should not match inside "react" or "docker"
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            canonical = normalize_skill(skill)
            found.add(canonical)

    return sorted(found)


def compute_skill_score(resume_text: str, jd_text: str) -> SkillMatchResult:
    """
    Extract skills from both the resume and JD, then compute a skill match score.

    Score = |matched skills| / |JD skills|   (how many required skills are present)
    """
    jd_skills = extract_skills(jd_text)
    resume_skills = extract_skills(resume_text)

    if not jd_skills:
        # No skills found in JD – give a neutral score
        return SkillMatchResult(
            jd_skills=[],
            resume_skills=resume_skills,
            matched_skills=[],
            missing_skills=[],
            skill_score=0.5,    # neutral when JD has no measurable skills
        )

    jd_set = set(jd_skills)
    resume_set = set(resume_skills)

    matched = sorted(jd_set & resume_set)
    missing = sorted(jd_set - resume_set)
    score = len(matched) / len(jd_set)

    return SkillMatchResult(
        jd_skills=jd_skills,
        resume_skills=resume_skills,
        matched_skills=matched,
        missing_skills=missing,
        skill_score=round(score, 4),
    )


# ──────────────────────────────────────────────────────────────────────────────
# Phase 6 – Experience Matching
# ──────────────────────────────────────────────────────────────────────────────

# Patterns for extracting required years from a JD
_EXP_PATTERNS = [
    r"(\d+)\s*\+?\s*(?:to|-)\s*(\d+)\s*\+?\s*years?",          # "3-5 years"
    r"(\d+)\s*\+\s*years?",                                      # "5+ years"
    r"(\d+)\s*years?\s*(?:of\s*)?(?:experience|exp\.?)",         # "3 years of experience"
    r"(?:minimum|at\s+least|minimum\s+of)\s+(\d+)\s*years?",
    r"experience\s*[:\-–]?\s*(\d+)\s*years?",
    r"(\d+)\s*years?\s*(?:in|with|using)",
]

# Explicit "X years of experience" patterns for resume (no date ranges here)
_RESUME_EXPLICIT_EXP_PATTERNS = [
    r"(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp\.?)",
    r"(?:total|overall)\s+(?:experience|exp\.?)\s*[:\-]?\s*(\d+)",
]

# ── Section classification regexes ────────────────────────────────────────────

# Headers that mark a WORK EXPERIENCE section
_WORK_SECTION_RE = re.compile(
    r"^\s*(work\s*experience|professional\s*experience|employment(\s*history)?|"
    r"experience|career(\s*history)?|work\s*history|job\s*history)\s*$",
    re.IGNORECASE,
)

# Headers that mark sections we must SKIP (education, projects, skills, etc.)
_NON_WORK_SECTION_RE = re.compile(
    r"^\s*(education|academic|qualification|schooling|projects?|"
    r"skills?|technical\s*skills?|coursework|certifications?|"
    r"achievements?|activities|languages?|profile|summary|objective|"
    r"position\s*of\s*responsibility|additional|volunteer|awards?|"
    r"interests?|hobbies|publications?|references?|database|"
    r"computer\s*languages?|note)\s*$",
    re.IGNORECASE,
)

# Generic section header detector (short line, only alpha + spaces)
_SECTION_HEADER_RE = re.compile(r"^\s*[A-Za-z][A-Za-z\s&/()]{2,45}\s*$")

# Date range pattern: "2021 – 2023" or "Jan 2020 - Present"
_DATE_RANGE_RE = re.compile(
    r"(\d{4})\s*(?:–|—|-|to)\s*(\d{4}|present|current|now)",
    re.IGNORECASE,
)


def _extract_work_section_text(resume_text: str) -> str | None:
    """
    Isolate only the lines that belong to a work/professional experience section.

    Strategy:
      - Walk lines top-to-bottom tracking the current section.
      - A line is a section header if it matches _SECTION_HEADER_RE AND
        is short (≤ 50 chars) AND has no digits.
      - Collect lines only while inside a recognised work section.
      - Stop collecting when we enter a new, non-work section.

    Returns the collected text, or None if no work section was found.
    """
    lines = resume_text.split("\n")
    in_work_section = False
    work_lines: list[str] = []

    for line in lines:
        stripped = line.strip()

        # Skip blank lines for header detection but keep them for content
        if not stripped:
            if in_work_section:
                work_lines.append(line)
            continue

        is_header = (
            _SECTION_HEADER_RE.match(stripped)
            and len(stripped) <= 50
            and not re.search(r"\d", stripped)   # headers don't contain digits
        )

        if is_header:
            if _WORK_SECTION_RE.match(stripped):
                in_work_section = True          # entered a work section
                continue                        # skip the header itself
            elif _NON_WORK_SECTION_RE.match(stripped):
                in_work_section = False         # left work section
                continue
            else:
                # Unknown section header → leave work section if we were in one
                if in_work_section:
                    in_work_section = False
                continue

        if in_work_section:
            work_lines.append(line)

    return "\n".join(work_lines) if work_lines else None


def _extract_years_from_text(text: str, patterns: list[str]) -> float | None:
    """Extract the most prominent years-of-experience number from text."""
    text_lower = text.lower()
    candidates: list[float] = []

    for pattern in patterns:
        for match in re.finditer(pattern, text_lower):
            groups = [g for g in match.groups() if g and g.isdigit()]
            if groups:
                candidates.append(float(min(int(g) for g in groups)))

    valid = [y for y in candidates if 0 < y < 40]
    return max(valid) if valid else None


def _years_from_date_ranges(text: str) -> float | None:
    """
    Sum non-overlapping date ranges found in `text`.
    Only call this on text already confirmed to be from a work section.
    """
    import datetime
    current_year = datetime.datetime.now().year
    ranges: list[tuple[int, int]] = []

    for match in _DATE_RANGE_RE.finditer(text.lower()):
        start_str, end_str = match.group(1), match.group(2)
        try:
            start = int(start_str)
            end = current_year if end_str in ("present", "current", "now") else int(end_str)
            if 1980 <= start <= current_year and start <= end <= current_year + 1:
                ranges.append((start, end))
        except ValueError:
            continue

    if not ranges:
        return None

    ranges.sort()
    merged: list[tuple[int, int]] = [ranges[0]]
    for start, end in ranges[1:]:
        if start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))

    total = sum(end - start for start, end in merged)
    return float(total) if total > 0 else None


def compute_experience_score(resume_text: str, jd_text: str) -> ExperienceMatchResult:
    """
    Compare candidate experience against JD requirements.

    Resume years detection priority:
      1. Explicit "X years of experience" phrase anywhere in resume.
      2. Date ranges found ONLY inside a work/employment section header.
      3. If neither found → treat as fresher (0 years).

    Scoring:
        resume >= jd_required        → 1.0
        gap == 1 year                → 0.8
        gap == 2 years               → 0.5
        gap > 2 years / fresher      → 0.2
        no JD requirement            → 0.7 (neutral)
    """
    jd_years = _extract_years_from_text(jd_text, _EXP_PATTERNS)

    # Priority 1: explicit "X years of experience" in resume
    resume_years = _extract_years_from_text(resume_text, _RESUME_EXPLICIT_EXP_PATTERNS)

    # Priority 2: date ranges ONLY from the work experience section
    if resume_years is None:
        work_text = _extract_work_section_text(resume_text)
        if work_text:
            resume_years = _years_from_date_ranges(work_text)
        # If work_text is None → no experience section found → fresher (resume_years stays None)

    # ── No JD requirement ──────────────────────────────────────────────────
    if jd_years is None:
        return ExperienceMatchResult(
            jd_years_required=None,
            resume_years_found=resume_years if resume_years is not None else 0.0,
            experience_score=0.7,
            note="No explicit experience requirement in JD. Neutral score applied.",
        )

    # ── Fresher / no experience found ─────────────────────────────────────
    if resume_years is None or resume_years == 0.0:
        return ExperienceMatchResult(
            jd_years_required=jd_years,
            resume_years_found=0.0,
            experience_score=0.2,
            note=(
                f"No professional work experience found in resume (fresher). "
                f"JD requires {jd_years:.0f} yr(s)."
            ),
        )

    # ── Compare ────────────────────────────────────────────────────────────
    gap = jd_years - resume_years
    if gap <= 0:
        score = 1.0
        note = f"Meets requirement ({resume_years:.0f} ≥ {jd_years:.0f} yrs)."
    elif gap <= 1:
        score = 0.8
        note = f"Slightly below requirement ({resume_years:.0f}/{jd_years:.0f} yrs)."
    elif gap <= 2:
        score = 0.5
        note = f"Below requirement by ~2 years ({resume_years:.0f}/{jd_years:.0f} yrs)."
    else:
        score = 0.2
        note = f"Significantly below requirement ({resume_years:.0f}/{jd_years:.0f} yrs)."

    return ExperienceMatchResult(
        jd_years_required=jd_years,
        resume_years_found=resume_years,
        experience_score=score,
        note=note,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Phase 7 – Final Scoring
# ──────────────────────────────────────────────────────────────────────────────

# Weights must sum to 1.0
WEIGHTS = {
    "similarity": 0.60,   # semantic similarity (embedding cosine)
    "skill":      0.25,   # skill match
    "experience": 0.15,   # experience match
}


def compute_final_score(
    similarity_score: float,
    skill_score: float,
    experience_score: float,
    weights: dict[str, float] | None = None,
) -> float:
    """
    Weighted combination of the three sub-scores.

    Args:
        similarity_score:  Cosine similarity between resume and JD embeddings (0–1).
        skill_score:       Fraction of JD skills found in resume (0–1).
        experience_score:  Experience match score (0–1).
        weights:           Custom weights dict (optional). Defaults to WEIGHTS above.

    Returns:
        Final score in [0, 1].
    """
    w = weights or WEIGHTS
    score = (
        w["similarity"] * similarity_score
        + w["skill"] * skill_score
        + w["experience"] * experience_score
    )
    return round(max(0.0, min(1.0, score)), 4)


def score_resume(
    resume_text: str,
    jd_text: str,
    resume_embedding: np.ndarray,
    jd_embedding: np.ndarray,
    filename: str = "resume.pdf",
    candidate_name: str = "Unknown",
) -> ScoringResult:
    """
    End-to-end scoring of a single resume against a job description.

    Steps:
        1. Cosine similarity (Phase 4)
        2. Skill extraction & matching (Phase 5)
        3. Experience matching (Phase 6)
        4. Weighted final score (Phase 7)

    Returns:
        ScoringResult dataclass with all sub-scores and matched/missing skills.
    """
    # Phase 4
    similarity = compute_cosine_similarity(resume_embedding, jd_embedding)

    # Phase 5
    skill_result = compute_skill_score(resume_text, jd_text)

    # Phase 6
    exp_result = compute_experience_score(resume_text, jd_text)

    # Phase 7
    final = compute_final_score(
        similarity_score=similarity,
        skill_score=skill_result.skill_score,
        experience_score=exp_result.experience_score,
    )

    return ScoringResult(
        candidate_name=candidate_name,
        filename=filename,
        similarity_score=round(similarity, 4),
        skill_match=skill_result,
        experience_match=exp_result,
        final_score=final,
        final_score_pct=round(final * 100, 2),
    )