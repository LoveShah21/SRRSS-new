from __future__ import annotations

import regex as re
import spacy
from spacy.matcher import PhraseMatcher
from typing import Any, Dict, List

from utils.skill_dict import ALL_SKILLS_UNIQUE, normalize_skill

MONTH_RE = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*"
YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b", re.IGNORECASE)
YEAR_RANGE_RE = re.compile(r"\b(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}\b|\b(?:19|20)\d{2}\s*[-–]\s*present\b", re.IGNORECASE)
MONTH_YEAR_RE = re.compile(rf"\b{MONTH_RE}\s*(?:19|20)\d{{2}}\b", re.IGNORECASE)
DATE_SPAN_RE = re.compile(rf"\b{MONTH_RE}\s*(?:19|20)\d{{2}}\s*[-–]\s*(?:{MONTH_RE}\s*(?:19|20)\d{{2}}|present)\b", re.IGNORECASE)
DURATION_RE = re.compile(
    rf"{DATE_SPAN_RE.pattern}|{YEAR_RANGE_RE.pattern}|{MONTH_YEAR_RE.pattern}|\b\d+(?:\.\d+)?\+?\s*(?:years?|yrs?|months?)\b",
    re.IGNORECASE,
)

DEGREE_RE = re.compile(
    r"\b("
    r"b\.?\s?tech|m\.?\s?tech|b\.?\s?e|m\.?\s?e|"
    r"bca|mca|b\.?\s?sc|m\.?\s?sc|mba|ph\.?\s?d|"
    r"bachelor(?:'s)?|master(?:'s)?|diploma|"
    r"higher secondary|secondary school|12th|10th|ssc|hsc|ghseb|gseb|cpi|cgpa|percentage"
    r")\b",
    re.IGNORECASE,
)

INSTITUTION_RE = re.compile(
    r"([A-Za-z][A-Za-z&.,'()\- ]{2,}(?:University|College|Institute|School|Academy|Polytechnic))",
    re.IGNORECASE,
)

ROLE_HINT_RE = re.compile(
    r"\b(intern|engineer|developer|analyst|participant|consultant|associate|manager|lead|architect)\b",
    re.IGNORECASE,
)


class ResumeStructuredExtractor:
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception:
            self.nlp = spacy.blank("en")

        self.matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        patterns = [self.nlp.make_doc(skill) for skill in ALL_SKILLS_UNIQUE]
        self.matcher.add("SKILL", patterns)

    def _normalize_line(self, line: str) -> str:
        text = line.strip()
        if not text:
            return ""
        text = text.replace("§", " ")
        text = re.sub(r"[•●◆▸▪■□▶✓✔➤►]", " ", text)
        text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
        text = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", " ", text)
        text = re.sub(r"([A-Za-z])(\d)", r"\1 \2", text)
        text = re.sub(r"(\d)([A-Za-z])", r"\1 \2", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip(" -|,;:.")

    def _is_noise(self, line: str) -> bool:
        if not line:
            return True
        if re.fullmatch(r"[.\-–•]+", line):
            return True
        return False

    def _lines(self, text: str) -> List[str]:
        normalized = [self._normalize_line(raw) for raw in text.splitlines()]
        return [line for line in normalized if not self._is_noise(line)]

    def _section_for_header(self, line: str) -> str | None:
        low = line.lower().strip()
        compact = re.sub(r"[^a-z0-9 ]", "", low).strip()
        if re.fullmatch(r"(education|academic background|qualifications?)", compact):
            return "education"
        if re.fullmatch(r"(experience|work experience|professional experience|employment|work history)", compact):
            return "experience"
        if "|" not in line and "project" in compact and len(compact.split()) <= 8:
            return "projects"
        if compact in {"technical skills", "skills", "summary", "achievements", "coursework", "areas of interest"}:
            return "other"
        return None

    def _looks_like_header(self, line: str) -> bool:
        words = line.split()
        if line.endswith(":"):
            return True
        if len(words) > 10:
            return False
        if len(line) > 70:
            return False
        return True

    def _split_sections(self, text: str) -> Dict[str, List[str]]:
        sections: Dict[str, List[str]] = {
            "education": [],
            "experience": [],
            "projects": [],
            "other": [],
        }
        current = "other"

        for line in self._lines(text):
            header = self._section_for_header(line)
            if header and self._looks_like_header(line):
                current = header
                continue
            sections[current].append(line)

        return sections

    def extract_skills(self, text: str) -> List[str]:
        doc = self.nlp("\n".join(self._lines(text)))
        matches = self.matcher(doc)
        found = set()
        for _, start, end in matches:
            found.add(normalize_skill(doc[start:end].text))
        return sorted(found)[:40]

    def _extract_duration(self, line: str) -> str:
        match = DURATION_RE.search(line)
        return match.group(0) if match else "Unknown"

    def _remove_dates(self, line: str) -> str:
        text = DATE_SPAN_RE.sub("", line)
        text = YEAR_RANGE_RE.sub("", text)
        text = MONTH_YEAR_RE.sub("", text)
        text = YEAR_RE.sub("", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip(" -|,;:.")

    def _is_date_only_line(self, line: str) -> bool:
        if self._extract_duration(line) == "Unknown":
            return False
        return self._remove_dates(line) == ""

    def _is_experience_heading(self, line: str) -> bool:
        if "|" in line:
            return False
        has_date = bool(DURATION_RE.search(line))
        if not has_date:
            return False
        words = line.split()
        if len(words) < 2 or len(words) > 22:
            return False
        low = line.lower()
        if any(token in low for token in ("percentage", "cpi", "cgpa", "skills", "coursework")):
            return False
        return True

    def _is_project_heading(self, line: str) -> bool:
        if "|" in line:
            return True
        low = line.lower()
        if "project" in low and len(line.split()) <= 18:
            return True
        return False

    def _is_role_line(self, line: str) -> bool:
        if len(line.split()) > 10:
            return False
        if ROLE_HINT_RE.search(line):
            return True
        low = line.lower()
        return "remote" in low or "on-site" in low or "onsite" in low

    def _is_content_line(self, line: str) -> bool:
        low = line.lower()
        if self._is_project_heading(line) or self._is_experience_heading(line):
            return False
        if any(token in low for token in ("technical skills", "achievements", "coursework", "areas of interest")):
            return False
        return len(line) >= 18

    def extract_education(self, text: str) -> List[Dict[str, Any]]:
        sections = self._split_sections(text)
        lines = sections["education"] or [line for line in self._lines(text) if DEGREE_RE.search(line) or INSTITUTION_RE.search(line)]

        entries: List[Dict[str, Any]] = []
        seen = set()
        i = 0
        while i < len(lines):
            line = lines[i]
            low = line.lower()
            if any(token in low for token in ("experience", "project", "skills", "summary")):
                i += 1
                continue
            if self._is_date_only_line(line):
                i += 1
                continue

            if i + 1 < len(lines) and self._is_date_only_line(lines[i + 1]):
                line = f"{line} {lines[i + 1]}"
                i += 1

            institution_match = INSTITUTION_RE.search(line)
            institution = institution_match.group(1).strip(" -|,;:.") if institution_match else ""
            year_match = YEAR_RE.search(line)
            year = year_match.group(0) if year_match else ""
            degree = self._remove_dates(line)
            if institution:
                degree = re.sub(re.escape(institution), "", degree, flags=re.IGNORECASE).strip(" -|,;:.")

            if not (degree or institution or year):
                i += 1
                continue
            if not degree and institution:
                degree = institution
            if (not institution or institution == "Unknown") and re.search(r"\b(cpi|cgpa|percentage)\b", degree, re.IGNORECASE):
                i += 1
                continue

            key = (degree.lower(), institution.lower(), year.lower())
            if key in seen:
                i += 1
                continue
            seen.add(key)

            entries.append(
                {
                    "institution": institution or "Unknown",
                    "year": year or "Unknown",
                    "degree": degree or "Unknown",
                }
            )
            i += 1

        return entries[:6]

    def _parse_experience_heading(self, line: str) -> tuple[str, str]:
        duration = self._extract_duration(line)
        company = self._remove_dates(line)
        return company or "Unknown", duration

    def _looks_like_company_line(self, line: str) -> bool:
        if not line or self._is_date_only_line(line):
            return False
        low = line.lower()
        if any(token in low for token in ("technical skills", "achievements", "coursework", "areas of interest", "summary")):
            return False
        if self._is_role_line(line):
            return False
        return 2 <= len(line.split()) <= 18

    def extract_experience(self, text: str) -> List[Dict[str, Any]]:
        sections = self._split_sections(text)
        lines = sections["experience"]
        if not lines:
            lines = [line for line in self._lines(text) if self._is_experience_heading(line)]

        entries: List[Dict[str, Any]] = []
        seen = set()
        i = 0
        while i < len(lines):
            line = lines[i]
            if not self._is_experience_heading(line):
                i += 1
                continue

            company, duration = self._parse_experience_heading(line)
            if company == "Unknown" and i > 0:
                prev = lines[i - 1]
                if self._looks_like_company_line(prev):
                    company = prev
            role = ""
            description_lines: List[str] = []
            j = i + 1

            role_parts: List[str] = []
            while j < len(lines) and not self._is_experience_heading(lines[j]) and self._is_role_line(lines[j]):
                role_parts.append(lines[j])
                if len(role_parts) >= 2:
                    j += 1
                    break
                j += 1
            if role_parts:
                role = " ".join(role_parts).strip()

            while j < len(lines) and not self._is_experience_heading(lines[j]):
                candidate = lines[j]
                if self._is_content_line(candidate):
                    description_lines.append(candidate)
                j += 1

            if not role:
                role = "Role not specified"
            description = " ".join(description_lines[:3]).strip()

            key = (company.lower(), role.lower(), duration.lower())
            if key not in seen:
                seen.add(key)
                entries.append(
                    {
                        "company": company[:120],
                        "role": role[:120],
                        "duration": duration[:50],
                        "description": description[:420],
                    }
                )

            i = j

        return entries[:8]

    def _parse_project_heading(self, line: str) -> tuple[str, List[str]]:
        if "|" in line:
            name_raw, stack_raw = line.split("|", 1)
            name = name_raw.strip(" -|,;:.")
            stack = [
                token.strip(" -|,;:.")
                for token in stack_raw.split(",")
                if token.strip(" -|,;:.")
            ]
            return name, stack[:10]
        return line.strip(" -|,;:."), []

    def extract_projects(self, text: str) -> List[Dict[str, Any]]:
        sections = self._split_sections(text)
        lines = sections["projects"]
        if not lines:
            lines = [line for line in self._lines(text) if self._is_project_heading(line)]

        projects: List[Dict[str, Any]] = []
        current: Dict[str, Any] | None = None
        seen = set()

        for line in lines:
            if self._is_project_heading(line):
                if current and (current["name"] or current["description"]):
                    key = (current["name"].lower(), current["description"].lower())
                    if key not in seen:
                        seen.add(key)
                        projects.append(current)
                name, tech_stack = self._parse_project_heading(line)
                current = {"name": name[:120], "techStack": tech_stack, "description": ""}
                continue

            if current and self._is_content_line(line):
                if current["description"]:
                    current["description"] += " "
                current["description"] += line
                current["description"] = current["description"][:500]

        if current and (current["name"] or current["description"]):
            key = (current["name"].lower(), current["description"].lower())
            if key not in seen:
                projects.append(current)

        return projects[:8]

    def parse(self, text: str) -> Dict[str, Any]:
        return {
            "skills": self.extract_skills(text),
            "education": self.extract_education(text),
            "experience": self.extract_experience(text),
            "projects": self.extract_projects(text),
        }
