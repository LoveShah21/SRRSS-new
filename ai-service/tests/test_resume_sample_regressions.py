import importlib.util
from pathlib import Path
import sys


AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = AI_SERVICE_ROOT.parent
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from models.resume_parser import parse_resume


RESUME_DIR = PROJECT_ROOT / "resumes"
EXTRACTOR_PATH = AI_SERVICE_ROOT / "models" / "extractor.py"


def _load_real_extractor_class():
    spec = importlib.util.spec_from_file_location("real_resume_extractor", EXTRACTOR_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module.ResumeStructuredExtractor


def _parse_sample(filename: str) -> dict:
    extractor = _load_real_extractor_class()()
    path = RESUME_DIR / filename
    raw_text = parse_resume(path.read_bytes(), path.name)
    return extractor.parse(raw_text)


def test_dau_sample_projects_and_responsibility_are_parsed():
    parsed = _parse_sample("DAU_AUM_CV (1).pdf")

    assert len(parsed["projects"]) >= 3
    assert any(project["name"] == "Portfolio Risk Analysis Dashboard" for project in parsed["projects"])
    assert any(exp["role"] == "Batch representative of MSTC club" for exp in parsed["experience"])


def test_love_shah_resume_keeps_project_descriptions():
    parsed = _parse_sample("resume.pdf")

    assert len(parsed["projects"]) >= 3
    assert any("production-ready rental management platform" in project["description"].lower() for project in parsed["projects"])
    assert not any("certificate of project completion" in project["name"].lower() for project in parsed["projects"])


def test_ritu_resume_no_longer_invents_experience_from_education_dates():
    parsed = _parse_sample("Ritu_CV.pdf")

    assert parsed["experience"] == []
    assert parsed["education"]
    assert parsed["education"][0]["institution"].lower().startswith("lj college")


def test_sample_resumes_extract_linkedin_when_present():
    parsed = _parse_sample("resume.pdf")

    assert parsed["links"]["linkedIn"] == "https://linkedin.com/in/love-shah"
