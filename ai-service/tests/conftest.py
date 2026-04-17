import os
import sys
import types

import pytest
from fastapi.testclient import TestClient

# Ensure tests can run without API key setup noise.
os.environ.setdefault("AI_REQUIRE_API_KEY", "false")
os.environ.setdefault("AI_SERVICE_API_KEY", "test-ai-key")

# The runtime environment can block spaCy native DLLs. Inject a lightweight
# extractor module for tests so app import remains stable.
fake_extractor_module = types.ModuleType("models.extractor")


class _TestResumeStructuredExtractor:
    def parse(self, _text):
        return {"skills": [], "education": [], "experience": []}


fake_extractor_module.ResumeStructuredExtractor = _TestResumeStructuredExtractor
sys.modules["models.extractor"] = fake_extractor_module

import app as app_module  # noqa: E402


@pytest.fixture
def app_module_ref():
    return app_module


@pytest.fixture
def client():
    return TestClient(app_module.app)
