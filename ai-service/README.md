# 🎯 Resume Ranker – ML-Powered Candidate Ranking System

A production-ready ML pipeline that parses resumes, generates semantic embeddings with **Sentence-BERT**, and ranks candidates against a job description using a three-component weighted scoring system.

---

## 📁 Project Structure

```
resume_ranker/
│
├── app.py                   # Phase 9 – FastAPI server (all endpoints)
├── demo.py                  # Standalone demo (no server needed)
├── requirements.txt         # All dependencies
│
├── models/
│   ├── __init__.py
│   ├── resume_parser.py     # Phase 1 – PDF/DOCX/TXT text extraction
│   ├── preprocessor.py      # Phase 2 – Cleaning, stopwords, lemmatization
│   ├── embedder.py          # Phase 3 – Sentence-BERT embeddings
│   ├── scorer.py            # Phase 4-7 – Similarity, skills, exp, final score
│   └── ranker.py            # Phase 8 – Full pipeline orchestrator
│
└── utils/
    ├── __init__.py
    └── skill_dict.py        # Master skill dictionary + normalization
```

---

## ⚙️ Setup

### 1. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Download spaCy model
```bash
python -m spacy download en_core_web_sm
```

> Sentence-BERT model (`all-MiniLM-L6-v2`) downloads automatically on first run (~85 MB).

---

## 🚀 Quick Start

### Option A – Standalone demo (no server)
```bash
python demo.py
```
Uses 3 built-in sample resumes ranked against a sample Python backend JD.

**With your own files:**
```bash
python demo.py --jd path/to/job_description.txt --resumes cv1.pdf cv2.docx cv3.pdf
```

### Option B – Run the API server
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```
Open API docs at: **http://localhost:8000/docs**

---

## 📡 API Usage (Phase 9)

### Workflow

```
POST /upload_jd       →  get job_id
POST /upload_resume   →  attach resumes to job_id
POST /get_rankings    →  run ML pipeline, get ranked results
GET  /results/{id}    →  fetch cached results
DELETE /clear/{id}    →  clean up session
```

### Step 1 – Upload Job Description
```bash
curl -X POST http://localhost:8000/upload_jd \
  -F "jd_text=We are hiring a Python engineer with 4+ years of experience in FastAPI, PostgreSQL, Docker, and AWS." \
  -F "job_title=Senior Python Engineer"
```
**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_title": "Senior Python Engineer",
  "message": "Job description saved. Now upload resumes via /upload_resume."
}
```

### Step 2 – Upload Resumes
```bash
curl -X POST http://localhost:8000/upload_resume \
  -F "job_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "files=@alice_cv.pdf" \
  -F "files=@bob_cv.docx"
```

### Step 3 – Get Rankings
```bash
curl -X POST http://localhost:8000/get_rankings \
  -F "job_id=550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "job_id": "550e8400-...",
  "total_resumes": 2,
  "rankings": [
    {
      "rank": 1,
      "candidate_name": "Alice Johnson",
      "filename": "alice_cv.pdf",
      "final_score_pct": 84.3,
      "similarity_score": 0.8712,
      "skill_match": {
        "jd_skills": ["python", "fastapi", "postgresql", "docker", "aws"],
        "resume_skills": ["python", "fastapi", "postgresql", "docker", "aws", "redis"],
        "matched_skills": ["python", "fastapi", "postgresql", "docker", "aws"],
        "missing_skills": [],
        "skill_score": 1.0
      },
      "experience_match": {
        "jd_years_required": 4.0,
        "resume_years_found": 5.0,
        "experience_score": 1.0,
        "note": "Meets requirement (5 ≥ 4 yrs)."
      }
    },
    ...
  ]
}
```

---

## 🧠 Scoring Formula (Phase 7)

```
final_score = (0.60 × similarity_score) 
            + (0.25 × skill_score) 
            + (0.15 × experience_score)
```

| Component        | Weight | How it's computed                                        |
|-----------------|--------|----------------------------------------------------------|
| Similarity       | 60%    | Cosine similarity of Sentence-BERT embeddings            |
| Skill Match      | 25%    | `|matched skills| / |JD skills required|`                |
| Experience Match | 15%    | Regex-extracted years compared against JD requirement    |

---

## 🛠️ Tech Stack

| Layer              | Tool / Library                      |
|--------------------|--------------------------------------|
| PDF Parsing        | `pdfplumber` + `PyMuPDF` (fallback)  |
| DOCX Parsing       | `python-docx`                        |
| Text Preprocessing | `spaCy` (en_core_web_sm)             |
| Embeddings         | `sentence-transformers` (MiniLM-L6)  |
| Similarity         | `scikit-learn` cosine_similarity     |
| API Backend        | `FastAPI` + `uvicorn`                |
| Data Validation    | `pydantic`                           |

---

## 🔌 Integration with Your Group Project

Your group's platform should call these three endpoints in order:

1. When a **company posts a job** → `POST /upload_jd` → store `job_id`
2. When **resumes are submitted** → `POST /upload_resume` (with `job_id`)
3. When the **company views candidates** → `POST /get_rankings` → display ranked list

The ML module is fully decoupled — it just needs text in, rankings out.