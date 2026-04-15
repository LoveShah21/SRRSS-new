#!/usr/bin/env python
# demo.py
# Run the full pipeline end-to-end WITHOUT starting the API server.
# Great for testing your ML model standalone before integrating with the backend.
#
# Usage:
#   python demo.py
#
# Or with real files:
#   python demo.py --jd path/to/jd.txt --resumes cv1.pdf cv2.docx

from __future__ import annotations

import argparse
import textwrap
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Sample data (used when no files are provided)
# ──────────────────────────────────────────────────────────────────────────────

SAMPLE_JD = """
Job Title: Senior Python Backend Engineer

We are looking for an experienced Python developer to join our backend team.

Requirements:
- 4+ years of experience in backend development
- Strong proficiency in Python and FastAPI or Django
- Experience with PostgreSQL and Redis
- Knowledge of Docker and Kubernetes
- Familiarity with AWS (EC2, S3, Lambda)
- Understanding of REST API design and microservices architecture
- Machine learning integration experience is a plus
- Excellent communication and teamwork skills

Responsibilities:
- Design and build scalable backend services
- Collaborate with frontend and ML teams
- Write unit and integration tests
- Participate in code reviews
"""

SAMPLE_RESUMES = [
    {
        "filename": "alice_resume.txt",
        "candidate_name": "Alice Johnson",
        "text": """
Alice Johnson
Senior Software Engineer | alice@email.com | github.com/alicejohnson

EXPERIENCE
Software Engineer – TechCorp (2019 – Present)
  - Built RESTful APIs using FastAPI and Python serving 10M requests/day
  - Designed PostgreSQL schemas and optimized slow queries by 40%
  - Deployed services to AWS using Docker and Kubernetes
  - Integrated machine learning models into production pipelines

Junior Developer – StartupXYZ (2018 – 2019)
  - Developed Flask microservices, worked with Redis caching layer
  - Used GitHub Actions for CI/CD

SKILLS
Python, FastAPI, Django, PostgreSQL, Redis, Docker, Kubernetes, AWS, EC2, S3,
Machine Learning, scikit-learn, REST API, Microservices, Git, Linux, SQL

EDUCATION
B.S. Computer Science – State University (2018)
        """,
    },
    {
        "filename": "bob_resume.txt",
        "candidate_name": "Bob Smith",
        "text": """
Bob Smith
Full Stack Developer | bob@email.com

EXPERIENCE
Web Developer – Digital Agency (2021 – Present)
  - Built React frontends with TypeScript and Next.js
  - Used Node.js Express for backend API development
  - Basic experience with PostgreSQL and MongoDB
  - Deployed projects on Heroku and Netlify

Intern – WebShop (2020 – 2021)
  - HTML, CSS, JavaScript development

SKILLS
JavaScript, TypeScript, React, Node.js, Express, HTML, CSS, MongoDB,
PostgreSQL, Git, REST API

EDUCATION
B.S. Information Technology (2020)
        """,
    },
    {
        "filename": "carol_resume.txt",
        "candidate_name": "Carol Davis",
        "text": """
Carol Davis
Python Data Engineer | carol@email.com

EXPERIENCE
Data Engineer – Analytics Co (2020 – Present)
  - Python-based ETL pipelines with Apache Spark and Airflow
  - PostgreSQL, Snowflake data warehouse management
  - Deployed ML models with FastAPI on AWS Lambda
  - Experience with S3, EC2, Docker containers
  - Redis caching for data pipelines

Associate Engineer – DataFirm (2018 – 2020)
  - Python scripting, SQL, pandas, numpy
  - Machine learning prototypes using scikit-learn

SKILLS
Python, FastAPI, PostgreSQL, Redis, Docker, AWS, S3, Lambda, EC2,
Machine Learning, scikit-learn, pandas, Apache Spark, SQL, Git, Linux

EDUCATION
M.S. Data Science (2018)
        """,
    },
]


# ──────────────────────────────────────────────────────────────────────────────
# Pretty printer
# ──────────────────────────────────────────────────────────────────────────────

SEPARATOR = "─" * 70
BOLD = "\033[1m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
RESET = "\033[0m"


def _score_color(pct: float) -> str:
    if pct >= 70:
        return GREEN
    elif pct >= 50:
        return YELLOW
    else:
        return RED


def print_results(results) -> None:
    print(f"\n{BOLD}{CYAN}{'━'*70}{RESET}")
    print(f"{BOLD}{CYAN}   RESUME RANKING RESULTS{RESET}")
    print(f"{BOLD}{CYAN}{'━'*70}{RESET}\n")

    for r in results:
        color = _score_color(r.final_score_pct)
        print(f"{BOLD}#{r.rank}  {r.candidate_name}{RESET}  ({r.filename})")
        print(f"   Final Score   : {color}{BOLD}{r.final_score_pct:.1f}%{RESET}")
        print(f"   Similarity    : {r.similarity_score:.4f}")
        print(f"   Skill Score   : {r.skill_match.skill_score:.4f}")
        print(f"   Exp. Score    : {r.experience_match.experience_score:.2f}  "
              f"→ {r.experience_match.note}")

        if r.skill_match.matched_skills:
            skills_str = ", ".join(r.skill_match.matched_skills)
            print(f"   {GREEN}✔ Matched{RESET}     : "
                  f"{textwrap.fill(skills_str, width=55, subsequent_indent=' '*18)}")

        if r.skill_match.missing_skills:
            skills_str = ", ".join(r.skill_match.missing_skills)
            print(f"   {RED}✘ Missing{RESET}     : "
                  f"{textwrap.fill(skills_str, width=55, subsequent_indent=' '*18)}")

        print(f"   {SEPARATOR}")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def run_demo(jd_path: str | None, resume_paths: list[str]) -> None:
    from models.ranker import rank_resumes, ResumeFile

    # ── Load JD ──────────────────────────────────────────────────────────
    if jd_path:
        jd_text = Path(jd_path).read_text(encoding="utf-8")
        print(f"📄  Job description loaded from: {jd_path}")
    else:
        jd_text = SAMPLE_JD
        print("📄  Using built-in sample job description.")

    # ── Load resumes ──────────────────────────────────────────────────────
    if resume_paths:
        resume_files = []
        for path in resume_paths:
            p = Path(path)
            resume_files.append(
                ResumeFile(
                    filename=p.name,
                    file_bytes=p.read_bytes(),
                    candidate_name="",   # auto-extracted
                )
            )
        print(f"📋  Loaded {len(resume_files)} resume file(s) from disk.")
    else:
        # Use in-memory sample resumes (as text files)
        resume_files = [
            ResumeFile(
                filename=r["filename"],
                file_bytes=r["text"].encode("utf-8"),
                candidate_name=r["candidate_name"],
            )
            for r in SAMPLE_RESUMES
        ]
        print(f"📋  Using {len(resume_files)} built-in sample resumes.\n")

    # ── Run pipeline ──────────────────────────────────────────────────────
    print("⚙️   Running ML pipeline (this may take a moment on first run)...\n")
    results = rank_resumes(resume_files, jd_text)

    # ── Display results ───────────────────────────────────────────────────
    print_results(results)


def main():
    parser = argparse.ArgumentParser(
        description="Resume Ranker – standalone demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
            Examples:
              python demo.py                             # runs with sample data
              python demo.py --jd jd.txt                # custom JD, sample resumes
              python demo.py --jd jd.txt --resumes a.pdf b.docx
        """),
    )
    parser.add_argument("--jd", type=str, default=None, help="Path to JD text file")
    parser.add_argument(
        "--resumes", nargs="+", default=[], help="Paths to resume files (PDF/DOCX/TXT)"
    )
    args = parser.parse_args()
    run_demo(args.jd, args.resumes)


if __name__ == "__main__":
    main()