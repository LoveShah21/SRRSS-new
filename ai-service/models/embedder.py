# models/embedder.py
# Phase 3 – Embedding Generation (CORE ML)
# Uses Sentence-BERT: all-MiniLM-L6-v2 (fast, 384-dim, great for semantic similarity)

from __future__ import annotations

import logging
import numpy as np
from functools import lru_cache

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"


# ──────────────────────────────────────────────────────────────────────────────
# Model loader (singleton – loaded once per process)
# ──────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_model():
    """Load Sentence-BERT model once and cache it in memory."""
    from sentence_transformers import SentenceTransformer

    logger.info("Loading Sentence-BERT model: %s", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)
    logger.info("Model loaded successfully.")
    return model


# ──────────────────────────────────────────────────────────────────────────────
# Embedding functions
# ──────────────────────────────────────────────────────────────────────────────

def get_embedding(text: str) -> np.ndarray:
    """
    Encode a single text string into a dense vector.

    Args:
        text: Preprocessed text to embed.

    Returns:
        1-D numpy array of shape (384,) for all-MiniLM-L6-v2.
    """
    model = _load_model()
    embedding = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
    return embedding  # shape: (384,)


def get_embeddings_batch(texts: list[str]) -> np.ndarray:
    """
    Encode multiple texts in a single batch for efficiency.

    Args:
        texts: List of preprocessed text strings.

    Returns:
        2-D numpy array of shape (N, 384).
    """
    model = _load_model()
    embeddings = model.encode(
        texts,
        batch_size=32,
        convert_to_numpy=True,
        normalize_embeddings=True,   # L2-normalised → cosine = dot product
        show_progress_bar=len(texts) > 10,
    )
    return embeddings  # shape: (N, 384)