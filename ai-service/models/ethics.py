from __future__ import annotations
import regex as re
from typing import Dict, List, Tuple

class BiasDetector:
    """
    Analyzes text for biased or exclusionary language.
    Focuses on gender-biased terms and age-related requirements.
    """

    # Bias keywords categories
    BIAS_KEYWORDS = {
        "gender_masculine": [
            r"\\bhe\\b", r"\\bhis\\b", r"\\bhim\\b", r"\\bhimself\\b",
            r"\\bchairman\\b", r"\\bman-hours\\b", r"\\bforeman\\b",
            r"\\bguys\\b", r"\\bmanpower\\b"
        ],
        "gender_feminine": [
            r"\\bshe\\b", r"\\bher\\b", r"\\bhers\\b", r"\\bshe's\\b",
            r"\\bchairwoman\\b"
        ],
        "age_bias": [
            r"young", r"recent graduate", r"energetic", r"digital native",
            r"fresh blood", r"entry-level only", r"maximum \\d+ years experience"
        ],
        "exclusionary": [
            r"native speaker", r"perfect english", r"fluent in english",
            r"citizen of", r"eligible to work without sponsorship"
        ]
    }

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Scans text for biased terms and returns a detailed report.
        """
        text_lower = text.lower()
        findings = []
        score = 0

        for category, patterns in self.BIAS_KEYWORDS.items():
            for pattern in patterns:
                matches = re.findall(pattern, text_lower)
                if matches:
                    findings.append({
                        "category": category,
                        "term": matches[0],
                        "count": len(matches),
                        "suggestion": self._get_suggestion(category)
                    })
                    score += len(matches) * 10

        # Normalize score to 0-100
        final_score = min(100, score)

        return {
            "bias_score": final_score,
            "findings": findings,
            "is_biased": len(findings) > 0,
            "recommendation": "Consider using gender-neutral language to attract a more diverse talent pool." if len(findings) > 0 else "Text appears neutral."
        }

    def _get_suggestion(self, category: str) -> str:
        suggestions = {
            "gender_masculine": "Use gender-neutral terms like 'they', 'person', or 'individual'.",
            "gender_feminine": "Use gender-neutral terms like 'they', 'person', or 'individual'.",
            "age_bias": "Focus on skills and competencies rather than age or 'years since graduation'.",
            "exclusionary": "Focus on proficiency levels (e.g., 'professional working proficiency') rather than native status."
        }
        return suggestions.get(category, "Use more inclusive language.")

class PIIMasker:
    """
    Identifies and masks Personal Identifying Information (PII)
    to ensure anonymized screening.
    """

    # Regex patterns for PII
    PATTERNS = {
        "email": r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
        "phone": r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
        "address": r"\d{1,5}\s\w+.*?,?\s?\w+.*?,?\s?\w{2,}\s?\d{5}"
    }

    def mask(self, text: str) -> str:
        """
        Masks identified PII with placeholders.
        """
        masked_text = text
        for label, pattern in self.PATTERNS.items():
            masked_text = re.sub(pattern, f"[{label.upper()}]", masked_text)

        # Note: Names are harder to mask without a full NER model.
        # In a production environment, we would use spaCy's PERSON entity.
        return masked_text

    def mask_with_spacy(self, nlp, text: str) -> str:
        """
        Advanced masking using spaCy's Named Entity Recognition (NER).
        """
        doc = nlp(text)
        result = text

        # Mask PERSON entities
        # We iterate in reverse to avoid offset shifts when replacing text
        entities = sorted([ent for ent in doc.ents if ent.label_ == "PERSON"], key=lambda x: x.start_char, reverse=True)

        for ent in entities:
            result = result[:ent.start_char] + "[NAME]" + result[ent.end_char:]

        # Also apply regex masking for emails/phones
        return self.mask(result)
