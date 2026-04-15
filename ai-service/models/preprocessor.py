# models/preprocessor.py
# Phase 2 – Text Preprocessing
# Lowercase → remove special chars → remove stopwords → lemmatize (via spaCy)

from __future__ import annotations

import re
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# spaCy model loader (cached – loaded only once per process)
# ──────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_spacy_model():
    """Load spaCy English model once and cache it."""
    import spacy

    model_name = "en_core_web_sm"
    try:
        nlp = spacy.load(model_name, disable=["parser", "ner"])
    except OSError:
        logger.info("Downloading spaCy model '%s'...", model_name)
        from spacy.cli import download
        download(model_name)
        nlp = spacy.load(model_name, disable=["parser", "ner"])

    return nlp


# ──────────────────────────────────────────────────────────────────────────────
# Individual cleaning steps
# ──────────────────────────────────────────────────────────────────────────────

def _lowercase(text: str) -> str:
    return text.lower()


def _remove_urls(text: str) -> str:
    return re.sub(r"https?://\S+|www\.\S+", " ", text)


def _remove_emails(text: str) -> str:
    return re.sub(r"\S+@\S+\.\S+", " ", text)


def _remove_phone_numbers(text: str) -> str:
    return re.sub(r"(\+?\d[\d\s\-().]{7,}\d)", " ", text)


def _remove_special_characters(text: str) -> str:
    """Keep letters, digits, spaces, and hyphens (for compound skills)."""
    # Replace bullet chars and decorators with space
    text = re.sub(r"[•●◆▸▪■□▶✓✔➤►]", " ", text)
    # Keep alphanumerics, spaces, hyphens, dots (for e.g. "node.js", "3.5 years")
    text = re.sub(r"[^a-z0-9\s\-\.]", " ", text)
    return text


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


# ──────────────────────────────────────────────────────────────────────────────
# Main preprocessing functions
# ──────────────────────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    """
    Basic cleaning pipeline (no NLP model required).
    Used as a lightweight pass before embedding or skill extraction.
    """
    text = _lowercase(text)
    text = _remove_urls(text)
    text = _remove_emails(text)
    text = _remove_phone_numbers(text)
    text = _remove_special_characters(text)
    text = _normalize_whitespace(text)
    return text


def preprocess_text(text: str) -> str:
    """
    Full preprocessing pipeline:
    clean → tokenize → remove stopwords → lemmatize (spaCy)

    Returns a space-joined string of lemmatized tokens.
    """
    text = clean_text(text)

    nlp = _load_spacy_model()
    doc = nlp(text)

    tokens = [
        token.lemma_
        for token in doc
        if not token.is_stop          # remove stopwords
        and not token.is_punct        # remove punctuation tokens
        and not token.is_space        # remove whitespace tokens
        and len(token.lemma_) > 1     # skip single-char tokens
    ]

    return " ".join(tokens)


def preprocess_for_embedding(text: str) -> str:
    """
    Lighter preprocessing specifically for sentence-transformer input.
    Sentence-BERT works better with natural language, so we:
      - clean (remove noise)
      - but do NOT lemmatize / remove stopwords
        (the model needs context words like "years of experience")
    """
    text = _lowercase(text)
    text = _remove_urls(text)
    text = _remove_emails(text)
    text = _remove_phone_numbers(text)
    # For embedding, keep more punctuation so sentences stay intact
    text = re.sub(r"[^a-z0-9\s\-\.,;:()/]", " ", text)
    text = _normalize_whitespace(text)
    return text