from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import resume_parser, candidate_scorer, bias_detector

app = FastAPI(
    title="SRRSS AI Service",
    description="AI-powered resume parsing, candidate scoring, and bias detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(resume_parser.router, prefix="/api", tags=["Resume Parsing"])
app.include_router(candidate_scorer.router, prefix="/api", tags=["Candidate Scoring"])
app.include_router(bias_detector.router, prefix="/api", tags=["Bias Detection"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}
