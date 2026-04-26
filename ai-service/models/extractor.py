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
LOCATION_RE = re.compile(r"\b[A-Z][a-z]+(?:,?\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+)?\b")
SEPARATOR_SPLIT_RE = re.compile(r"\s+[|]\s+|[|]")
DATE_ONLY_RE = re.compile(
    rf"^(?:{DATE_SPAN_RE.pattern}|{YEAR_RANGE_RE.pattern}|{MONTH_YEAR_RE.pattern}|\b(?:19|20)\d{{2}}\b)$",
    re.IGNORECASE,
)
EDUCATION_NOISE_RE = re.compile(
    r"\b(cpi|cgpa|gpa|percentage|relevant coursework|coursework|above minimum threshold)\b",
    re.IGNORECASE,
)
SECTION_HEADER_MAP = {
    "education": {
        "education",
        "academic background",
        "qualifications",
    },
    "experience": {
        "experience",
        "work experience",
        "professional experience",
        "employment",
        "work history",
        "position of responsibility",
        "positions of responsibility",
        "responsibility",
        "internship",
        "internships",
    },
    "projects": {
        "projects",
        "project",
        "ai ml projects",
        "academic projects",
    },
    "other": {
        "technical skills",
        "skills",
        "summary",
        "professional summary",
        "achievements",
        "coursework",
        "areas of interest",
        "soft skills",
        "alignment with ai engineer intern role",
        "note",
        "languages",
        "computer languages",
        "database",
        "contact",
        "profile",
    },
}
INLINE_DEGREE_RE = re.compile(
    r"\b("
    r"m\.?\s?sc(?:\s*\([^)]+\))?|b\.?\s?sc(?:\s*\([^)]+\))?|"
    r"m\.?\s?tech|b\.?\s?tech|m\.?\s?e|b\.?\s?e|"
    r"mca|bca|mba|ph\.?\s?d|"
    r"master of [a-z&() \-]+|bachelor of [a-z&() \-]+|"
    r"higher secondary certificate|secondary school certificate|"
    r"higher secondary|secondary school|12th(?:\s+science)?|10th"
    r")\b",
    re.IGNORECASE,
)
TECH_STACK_ONLY_RE = re.compile(r"^[A-Za-z0-9.+#/\- ]+(?:[,·]\s*[A-Za-z0-9.+#/\- ]+)+$")
PROJECT_TECH_SPLIT_RE = re.compile(r"\s*[·,]\s*")
CONTACT_OR_SIDEBAR_RE = re.compile(
    r"^(?:contact|profile|computer|languages|database|note|english|hindi|gujarati|mysql|mongodb|react js|python|wordpress|php|java)$",
    re.IGNORECASE,
)
URL_RE = re.compile(
    r"\b(?:https?://|www\.)[^\s|]+|\b(?:linkedin\.com/in/[^\s|]+|github\.com/[^\s|]+)\b",
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
        text = (
            text.replace("ﬁ", "fi")
            .replace("ﬂ", "fl")
            .replace("ﬀ", "ff")
            .replace("’", "'")
            .replace("–", "-")
            .replace("—", "-")
        )
        text = text.replace("§", " ")
        text = re.sub(r"[•●◆▸▪■□▶✓✔➤►📧#ï]", " ", text)
        text = re.sub(r"\b([A-Z])\s+(?=[A-Z]\b)", r"\1", text)
        text = re.sub(r"(?<=[a-z]{6,})(?=[A-Z])", " ", text)
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
        normalized: List[str] = []
        for raw in text.splitlines():
            candidate = raw.strip()
            if candidate.count("|") >= 2:
                fragments = [part for part in SEPARATOR_SPLIT_RE.split(candidate) if part.strip()]
            else:
                fragments = [candidate]
            for fragment in fragments:
                line = self._normalize_line(fragment)
                if line and not self._is_noise(line):
                    normalized.append(line)
        return normalized

    def _section_for_header(self, line: str) -> str | None:
        low = line.lower().strip()
        compact = re.sub(r"[^a-z0-9 ]", "", low).strip()
        for section, values in SECTION_HEADER_MAP.items():
            if compact in values:
                return section
        if "projects" in compact and len(compact.split()) <= 8:
            return "projects"
        if "project" in compact and len(compact.split()) <= 8:
            return "projects"
        return None

    def _looks_like_header(self, line: str) -> bool:
        if self._section_for_header(line):
            return True
        words = line.split()
        if line.endswith(":"):
            return True
        if len(words) > 10:
            return False
        if len(line) > 70:
            return False
        alpha_chars = re.sub(r"[^A-Za-z]", "", line)
        return bool(alpha_chars) and (line.isupper() or len(words) <= 4)

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

    def _looks_like_location_line(self, line: str) -> bool:
        if not line or EDUCATION_NOISE_RE.search(line):
            return False
        lowered = line.lower()
        if any(token in lowered for token in ("university", "college", "school", "institute", "academy", "polytechnic")):
            return False
        if re.search(r"\b(remote|on[- ]?site|onsite)\b", lowered):
            return False
        if len(line.split()) > 6:
            return False
        return "," in line or bool(re.fullmatch(r"[A-Za-z ]+", line))

    def _extract_degree_text(self, text: str) -> str:
        match = INLINE_DEGREE_RE.search(text)
        if match:
            return match.group(0).strip(" -|,;:.")
        return ""

    def _clean_entry_text(self, parts: List[str]) -> List[str]:
        cleaned: List[str] = []
        for part in parts:
            line = self._normalize_line(part)
            if not line:
                continue
            if CONTACT_OR_SIDEBAR_RE.fullmatch(line):
                continue
            cleaned.append(line)
        return cleaned

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
        if re.search(r"\b\d+(?:\.\d+)?\s*(?:years?|yrs?|months?)\b", low) and len(words) > 6:
            return False
        return True

    def _is_project_heading(self, line: str) -> bool:
        if "|" in line:
            return True
        low = line.lower()
        if "projects and" in low:
            return False
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
        date_indices = [
            idx for idx, line in enumerate(lines)
            if self._is_date_only_line(line) or YEAR_RANGE_RE.search(line) or MONTH_YEAR_RE.search(line) or YEAR_RE.search(line)
        ]

        for position, idx in enumerate(date_indices):
            line = lines[idx]
            if CONTACT_OR_SIDEBAR_RE.fullmatch(line) or EDUCATION_NOISE_RE.search(line):
                continue

            next_idx = date_indices[position + 1] if position + 1 < len(date_indices) else len(lines)
            entry_slice = [lines[idx - 1]] if idx > 0 else []
            institution_seen = bool(entry_slice and INSTITUTION_RE.search(entry_slice[0]))
            for part in lines[idx: next_idx]:
                if institution_seen and INSTITUTION_RE.search(part):
                    institution_match = INSTITUTION_RE.search(part)
                    previous_institution = INSTITUTION_RE.search(" ".join(entry_slice))
                    if institution_match and previous_institution and institution_match.group(1).lower() != previous_institution.group(1).lower():
                        break
                entry_slice.append(part)
                if INSTITUTION_RE.search(part):
                    institution_seen = True
            window = self._clean_entry_text(entry_slice)

            institution = ""
            for part in window:
                institution_match = INSTITUTION_RE.search(part)
                if institution_match:
                    institution = institution_match.group(1).strip(" -|,;:.")
                    institution = re.sub(r"^(?:LANGUAGES|COMPUTER)\s+", "", institution, flags=re.IGNORECASE)
                    break

            degree = ""
            for part in window:
                if EDUCATION_NOISE_RE.search(part) or self._looks_like_location_line(part):
                    continue
                candidate_degree = self._extract_degree_text(part)
                if candidate_degree:
                    degree = candidate_degree
                    break

            year_match = YEAR_RE.search(line)
            year = year_match.group(0) if year_match else ""

            if not institution and self._looks_like_location_line(window[0] if window else ""):
                continue
            if not (degree or institution or year):
                continue

            key = (degree.lower(), institution.lower(), year.lower())
            if key in seen:
                continue
            seen.add(key)
            entries.append(
                {
                    "institution": institution or "Unknown",
                    "year": year or "Unknown",
                    "degree": degree or "Unknown",
                }
            )

        return entries[:6]

    def _parse_experience_heading(self, line: str) -> tuple[str, str]:
        duration = self._extract_duration(line)
        company = self._remove_dates(line)
        return company or "Unknown", duration

    def _looks_like_company_line(self, line: str) -> bool:
        if not line or self._is_date_only_line(line):
            return False
        low = line.lower()
        if any(token in low for token in ("technical skills", "achievements", "coursework", "areas of interest", "summary", "education")):
            return False
        if EDUCATION_NOISE_RE.search(line) or DEGREE_RE.search(line):
            return False
        if self._is_role_line(line):
            return False
        if re.search(r"\b(member|representative|coordinator|executive|volunteer)\b", low):
            return False
        return 2 <= len(line.split()) <= 18

    def _looks_like_role_line(self, line: str) -> bool:
        if not line or self._is_date_only_line(line):
            return False
        if self._is_role_line(line):
            return True
        low = line.lower()
        return bool(re.search(r"\b(member|representative|coordinator|executive|head|volunteer)\b", low))

    def extract_experience(self, text: str) -> List[Dict[str, Any]]:
        sections = self._split_sections(text)
        lines = sections["experience"]
        if not lines:
            candidate_lines = self._lines(text)
            lines = []
            for idx, line in enumerate(candidate_lines):
                if not self._is_experience_heading(line):
                    continue
                window = candidate_lines[max(0, idx - 2): min(len(candidate_lines), idx + 3)]
                joined = " ".join(window)
                if DEGREE_RE.search(joined) or any(self._section_for_header(part) == "education" for part in window):
                    continue
                if not any(self._looks_like_company_line(part) or self._looks_like_role_line(part) for part in window if part != line):
                    continue
                lines.append(line)
                for part in candidate_lines[idx + 1: min(len(candidate_lines), idx + 5)]:
                    lines.append(part)

        entries: List[Dict[str, Any]] = []
        seen = set()
        i = 0
        while i < len(lines):
            line = lines[i]
            if not self._is_experience_heading(line):
                i += 1
                continue

            duration = self._extract_duration(line)
            company, role = "", ""
            inline_text = self._remove_dates(line)
            prev = lines[i - 1] if i > 0 else ""
            prev2 = lines[i - 2] if i > 1 else ""
            next_line = lines[i + 1] if i + 1 < len(lines) else ""
            next2 = lines[i + 2] if i + 2 < len(lines) else ""

            if inline_text and self._looks_like_role_line(inline_text):
                role = inline_text
            elif inline_text:
                company = inline_text

            surrounding = [prev, prev2, next_line, next2]
            for candidate in surrounding:
                if not role and self._looks_like_role_line(candidate):
                    role = candidate
                elif not company and self._looks_like_company_line(candidate):
                    company = candidate

            if not company and role and next_line and self._looks_like_company_line(next_line):
                company = next_line
            if not role and company and next_line and self._looks_like_role_line(next_line):
                role = next_line

            description_lines: List[str] = []
            j = i + 1

            role_parts: List[str] = []
            while j < len(lines) and not self._is_experience_heading(lines[j]) and self._looks_like_role_line(lines[j]):
                role_parts.append(lines[j])
                if len(role_parts) >= 2:
                    j += 1
                    break
                j += 1
            if role_parts and not role:
                role = " ".join(role_parts).strip()

            while j < len(lines) and not self._is_experience_heading(lines[j]):
                candidate = lines[j]
                if self._is_content_line(candidate):
                    description_lines.append(candidate)
                j += 1

            if not role:
                role = "Role not specified"
            if not company:
                company = "Unknown"
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

            if current and not current["techStack"] and TECH_STACK_ONLY_RE.fullmatch(line):
                current["techStack"] = [
                    token.strip(" -|,;:.")
                    for token in PROJECT_TECH_SPLIT_RE.split(line)
                    if token.strip(" -|,;:.")
                ][:12]
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

    def extract_links(self, text: str) -> Dict[str, Any]:
        found: List[str] = []
        seen = set()

        for match in URL_RE.finditer(text):
            raw = match.group(0).strip("()[]{}<>,;:.")
            if "@" in raw:
                continue
            normalized = raw
            if not re.match(r"^https?://", normalized, re.IGNORECASE):
                normalized = f"https://{normalized}"
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            found.append(normalized)

        linked_in = next((url for url in found if "linkedin.com/" in url.lower()), "")
        github = next((url for url in found if "github.com/" in url.lower()), "")
        portfolio = next(
            (
                url for url in found
                if "linkedin.com/" not in url.lower() and "github.com/" not in url.lower()
            ),
            "",
        )

        return {
            "linkedIn": linked_in,
            "github": github,
            "portfolio": portfolio,
            "other": found,
        }

    def parse(self, text: str) -> Dict[str, Any]:
        return {
            "skills": self.extract_skills(text),
            "education": self.extract_education(text),
            "experience": self.extract_experience(text),
            "projects": self.extract_projects(text),
            "links": self.extract_links(text),
        }
