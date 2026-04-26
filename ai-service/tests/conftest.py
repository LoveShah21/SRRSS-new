import os
import sys
import types
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure tests can run without API key setup noise.
os.environ.setdefault("AI_REQUIRE_API_KEY", "false")
os.environ.setdefault("AI_SERVICE_API_KEY", "test-ai-key")
os.environ["REDIS_URL"] = ""

# Add parent directory (ai-service root) to sys.path so imports work in CI
ai_service_root = Path(__file__).parent.parent
if str(ai_service_root) not in sys.path:
    sys.path.insert(0, str(ai_service_root))

# The runtime environment can block spaCy native DLLs. Inject a lightweight
# extractor module for tests so app import remains stable.
fake_extractor_module = types.ModuleType("models.extractor")


class _TestResumeStructuredExtractor:
    def parse(self, _text):
        return {"skills": [], "education": [], "experience": [], "projects": [], "links": {}}


fake_extractor_module.ResumeStructuredExtractor = _TestResumeStructuredExtractor
sys.modules["models.extractor"] = fake_extractor_module

import app as app_module  # noqa: E402


@pytest.fixture
def app_module_ref():
    return app_module


@pytest.fixture
def client():
    return TestClient(app_module.app)
