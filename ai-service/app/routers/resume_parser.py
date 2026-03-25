"""
Resume Parser Router
Parses uploaded PDF/DOCX resumes to extract structured data:
  - Skills, Education, Experience
Uses pattern-matching heuristics (production would use NLP/LLM).
"""

import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter()


class ResumeParseRequest(BaseModel):
    file_path: str
    file_type: str  # "pdf" or "docx"


class ParsedResume(BaseModel):
    skills: list[str] = []
    education: list[dict] = []
    experience: list[dict] = []
    raw_text: str = ""


# Common tech skills for extraction
KNOWN_SKILLS = {
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "react", "angular", "vue", "node.js", "express", "django", "flask", "fastapi",
    "sql", "postgresql", "mongodb", "redis", "docker", "kubernetes", "aws", "azure", "gcp",
    "git", "ci/cd", "rest", "graphql", "html", "css", "tailwind",
    "machine learning", "deep learning", "nlp", "computer vision",
    "data analysis", "pandas", "numpy", "tensorflow", "pytorch",
    "agile", "scrum", "jira", "figma", "photoshop",
}


def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Reads file content. In production, use PyPDF2/python-docx."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


def extract_skills(text: str) -> list[str]:
    """Extract skills from resume text using keyword matching."""
    text_lower = text.lower()
    found = []
    for skill in KNOWN_SKILLS:
        if skill in text_lower:
            found.append(skill.title() if len(skill) > 3 else skill.upper())
    return sorted(set(found))


def extract_education(text: str) -> list[dict]:
    """Extract education entries using pattern heuristics."""
    edu_entries = []
    degree_patterns = [
        r"(B\.?(?:S|A|Tech|E|Sc)|M\.?(?:S|A|Tech|E|Sc)|Ph\.?D|MBA|Bachelor|Master|Doctor)\s*(?:of|in)?\s*([\w\s]+?)(?:\n|\r|,|\d{4})",
    ]
    for pattern in degree_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            edu_entries.append({
                "degree": match.group(1).strip(),
                "institution": match.group(2).strip()[:60],
                "year": "",
            })
    return edu_entries[:5]  # Cap at 5


def extract_experience(text: str) -> list[dict]:
    """Extract work experience using pattern heuristics."""
    exp_entries = []
    # Look for job title patterns
    title_patterns = [
        r"((?:Senior|Junior|Lead|Staff|Principal)?\s*(?:Software|Frontend|Backend|Full.?Stack|Data|DevOps|ML|AI|Product|Project|QA)\s*(?:Engineer|Developer|Analyst|Scientist|Manager|Architect|Designer))",
    ]
    for pattern in title_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            exp_entries.append({
                "title": match.group(1).strip(),
                "company": "",
                "years": 0,
                "description": "",
            })
    return exp_entries[:5]  # Cap at 5


@router.post("/parse-resume", response_model=ParsedResume)
async def parse_resume(request: ResumeParseRequest):
    """Parse a resume file and extract structured data."""
    text = extract_text_from_file(request.file_path, request.file_type)

    return ParsedResume(
        skills=extract_skills(text),
        education=extract_education(text),
        experience=extract_experience(text),
        raw_text=text[:2000],  # First 2000 chars for preview
    )
