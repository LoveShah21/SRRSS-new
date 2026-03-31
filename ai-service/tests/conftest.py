"""
Pytest configuration and fixtures for AI service tests
"""
import pytest


@pytest.fixture(scope="session")
def test_config():
    """Return test configuration"""
    return {
        "base_url": "http://test",
        "test_file_path": "/uploads/test.pdf",
    }
