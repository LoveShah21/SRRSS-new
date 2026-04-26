from types import SimpleNamespace


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_detect_bias_contract(client):
    res = client.post(
        "/api/detect-bias",
        json={"job_description": "Looking for a young engineer with strong delivery mindset."},
    )
    assert res.status_code == 200
    body = res.json()
    assert "biasFlags" in body
    assert "biasScore" in body
    assert "isBiased" in body
    assert "recommendation" in body


def test_score_candidate_contract(client):
    res = client.post(
        "/api/score-candidate",
        json={
            "candidate_profile": {
                "skills": ["Python", "FastAPI"],
                "experience": [{"title": "Backend Engineer", "company": "Acme", "years": 3}],
                "education": [{"degree": "B.Tech", "institution": "Test University"}],
            },
            "job_description": {
                "title": "Python Engineer",
                "description": "Build APIs using Python and FastAPI",
                "requiredSkills": ["Python", "FastAPI", "Docker"],
                "experienceMin": 2,
            },
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert 0 <= body["matchScore"] <= 100
    assert set(body["breakdown"].keys()) == {"skills", "experience", "education"}
    assert "matchedSkills" in body["explanation"]
    assert "missingSkills" in body["explanation"]
    assert "experienceNote" in body["explanation"]


def test_parse_resume_contract(client, monkeypatch, app_module_ref):
    class FakeResponse:
        status_code = 200
        content = b"dummy-bytes"

    class FakeAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            return False

        async def get(self, *_args, **_kwargs):
            return FakeResponse()

    class FakeExtractor:
        def parse(self, _text):
            return {
                "skills": ["Python", "FastAPI"],
                "education": [
                    {"institution": "Test University", "year": "2022", "degree": "B.Tech"}
                ],
                "experience": [
                    {"company": "Acme", "role": "Developer", "duration": "2 years", "description": "Built APIs"}
                ],
                "projects": [
                    {
                        "name": "Candidate Portal",
                        "techStack": ["React", "Node.js"],
                        "description": "Built end-to-end profile automation.",
                    }
                ],
                "links": {
                    "linkedIn": "https://linkedin.com/in/test-candidate",
                    "github": "https://github.com/test-candidate",
                    "portfolio": "",
                    "other": [
                        "https://linkedin.com/in/test-candidate",
                        "https://github.com/test-candidate",
                    ],
                },
            }

    monkeypatch.setattr(app_module_ref.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(app_module_ref, "parse_resume", lambda *_args, **_kwargs: "resume text")
    monkeypatch.setattr(app_module_ref, "ResumeStructuredExtractor", lambda: FakeExtractor())

    res = client.post(
        "/api/parse-resume",
        json={
            "file_url": "http://example.com/resume.pdf",
            "file_path": "resumes/demo.pdf",
            "file_type": "pdf",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["skills"] == ["Python", "FastAPI"]
    assert body["education"][0]["institution"] == "Test University"
    assert body["experience"][0]["company"] == "Acme"
    assert body["projects"][0]["name"] == "Candidate Portal"
    assert body["links"]["linkedIn"] == "https://linkedin.com/in/test-candidate"


def test_multistep_session_flow(client, monkeypatch, app_module_ref):
    def fake_rank_resumes(_resume_files, _jd_text):
        skill_match = SimpleNamespace(
            jd_skills=["python", "fastapi"],
            resume_skills=["python", "fastapi"],
            matched_skills=["python", "fastapi"],
            missing_skills=[],
            skill_score=1.0,
        )
        experience_match = SimpleNamespace(
            jd_years_required=2.0,
            resume_years_found=3.0,
            experience_score=1.0,
            note="Meets requirement.",
        )
        return [
            SimpleNamespace(
                rank=1,
                candidate_name="Test Candidate",
                filename="resume.txt",
                final_score_pct=90.0,
                similarity_score=0.9,
                skill_match=skill_match,
                experience_match=experience_match,
            )
        ]

    monkeypatch.setattr(app_module_ref, "rank_resumes", fake_rank_resumes)

    create_res = client.post(
        "/upload_jd",
        data={"jd_text": "Need Python and FastAPI", "job_title": "Backend Engineer"},
    )
    assert create_res.status_code == 200
    job_id = create_res.json()["job_id"]

    upload_res = client.post(
        "/upload_resume",
        data={"job_id": job_id},
        files=[("files", ("resume.txt", b"Python FastAPI", "text/plain"))],
    )
    assert upload_res.status_code == 200
    assert upload_res.json()["total_resumes_in_session"] == 1

    rankings_res = client.post("/get_rankings", data={"job_id": job_id})
    assert rankings_res.status_code == 200
    assert rankings_res.json()["total_resumes"] == 1
    assert rankings_res.json()["rankings"][0]["candidate_name"] == "Test Candidate"

    cached_res = client.get(f"/results/{job_id}")
    assert cached_res.status_code == 200
    assert cached_res.json()["total_resumes"] == 1

    clear_res = client.delete(f"/clear/{job_id}")
    assert clear_res.status_code == 200

    missing_res = client.get(f"/results/{job_id}")
    assert missing_res.status_code == 404
