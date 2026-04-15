# models/resume_parser.py
# Phase 1 – Data Ingestion & Parsing
# Supports PDF (via pdfplumber + PyMuPDF fallback) and DOCX

from __future__ import annotations

import io
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# PDF Extraction
# ──────────────────────────────────────────────────────────────────────────────

def _extract_pdf_pdfplumber(file_bytes: bytes) -> str:
    """Primary PDF extractor using pdfplumber (better table/layout handling)."""
    import pdfplumber

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _extract_pdf_pymupdf(file_bytes: bytes) -> str:
    """Fallback PDF extractor using PyMuPDF (fitz)."""
    import fitz  # PyMuPDF

    text_parts: list[str] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text("text"))
    return "\n".join(text_parts)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract raw text from PDF bytes.
    Tries pdfplumber first, falls back to PyMuPDF if result is empty.
    """
    try:
        text = _extract_pdf_pdfplumber(file_bytes)
        if text.strip():
            return text
        logger.warning("pdfplumber returned empty text, trying PyMuPDF fallback.")
    except Exception as e:
        logger.warning("pdfplumber failed: %s. Trying PyMuPDF fallback.", e)

    try:
        text = _extract_pdf_pymupdf(file_bytes)
        return text
    except Exception as e:
        logger.error("PyMuPDF also failed: %s", e)
        return ""


# ──────────────────────────────────────────────────────────────────────────────
# DOCX Extraction
# ──────────────────────────────────────────────────────────────────────────────

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract raw text from DOCX bytes using python-docx."""
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]

    # Also grab text from tables (common in resumes)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                cell_text = cell.text.strip()
                if cell_text and cell_text not in paragraphs:
                    paragraphs.append(cell_text)

    return "\n".join(paragraphs)


# ──────────────────────────────────────────────────────────────────────────────
# Unified Entry Point
# ──────────────────────────────────────────────────────────────────────────────

def parse_resume(file_bytes: bytes, filename: str) -> str:
    """
    Parse a resume file (PDF or DOCX) and return raw extracted text.

    Args:
        file_bytes: Raw bytes of the uploaded file.
        filename:   Original filename (used to detect file type).

    Returns:
        Extracted raw text string.

    Raises:
        ValueError: If file type is unsupported.
    """
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        text = extract_text_from_pdf(file_bytes)
    elif ext in {".docx", ".doc"}:
        text = extract_text_from_docx(file_bytes)
    elif ext == ".txt":
        text = file_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError(
            f"Unsupported file type: '{ext}'. "
            "Please upload a PDF, DOCX, or TXT file."
        )

    if not text.strip():
        logger.warning("Extracted text is empty for file: %s", filename)

    return text