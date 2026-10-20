"""
src/legal_parser.py
===================
Tách toàn văn văn bản pháp luật (text phẳng, mỗi khối 1 dòng) thành cây
Phần/Chương -> (Mục) -> Điều -> Khoản -> Điểm.

Đầu ra (`ParsedDocument.to_content_json()`) khớp type `DocumentReview` của
trang knowledge-admin trong Caps-Shared_Hub:
    chapters[] -> articles[]{number, title} -> units[]{label, text, status, warning?}

Thuần heuristic theo dòng, không gọi mạng. Những chỗ không chắc chắn được
ghi vào `warnings` (unit có status "WARNING") để người duyệt kiểm tra lại.
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional

# ------------------------------------------------------------
#  Regex nhận diện dòng tiêu đề cấu trúc
# ------------------------------------------------------------
_PART_RE = re.compile(r"^(?:PHẦN|Phần)\s+(?:THỨ\s+|thứ\s+)?(\S+?)\.?(?:\s+(.*))?$")
_CHAPTER_RE = re.compile(r"^(?:CHƯƠNG|Chương)\s+([IVXLC]+|\d+)\b\.?\s*(.*)$")
# "Mục 1", "MỤC II" - bắt buộc có số để không nhầm "Mục đích ..."
_SECTION_RE = re.compile(r"^(?:MỤC|Mục)\s+([IVXLC]+|\d+)\b\.?\s*(.*)$")
_ARTICLE_RE = re.compile(r"^Điều\s+(\d+[a-zđ]?)\s*[.:]?\s*(.*)$")
# "1. ..." nhưng không phải "1.1. ..." (mục con, coi như nội dung);
# văn bản cũ (trước ~2000) ghi Khoản dạng "1- ..." hoặc "2 - ..."
_CLAUSE_RE = re.compile(r"^(\d+)(?:\.(?!\d)|\s*-\s)\s*(.*)$")
_POINT_RE = re.compile(r"^([a-zđ])\)\s*(.*)$")
_APPENDIX_RE = re.compile(r"^(?:PHỤ LỤC|Phụ lục)(?:\s+(?:số\s+)?([IVXLC]+|\d+))?\b(.*)$")
# Hết phần thân: nơi nhận, khối chữ ký, câu thông qua của Quốc hội
_CLOSING_RE = re.compile(r"^(?:Nơi nhận\s*:|TM\.\s|KT\.\s|Luật này (?:đã )?được Quốc hội)")

_OPEN_QUOTE = ("“", '"')
# Dòng kết thúc trích dẫn: ... ” hoặc ...”. hoặc ...”;
_CLOSE_QUOTE_RE = re.compile(r"[”\"]\s*[.;,:]*\s*$")

# Thứ tự điểm theo bảng chữ cái tiếng Việt (không có f, j, w, z; có đ)
_POINT_ORDER = "abcdđeghiklmnopqrstuvxy"


def _is_blank(line: str) -> bool:
    return not line or set(line) <= set("_-–—=*.  ")


def _is_upper_title(line: str) -> bool:
    letters = [c for c in line if c.isalpha()]
    return bool(letters) and all(c.isupper() for c in letters)


def _base_number(number: str) -> Optional[int]:
    m = re.match(r"\d+", number or "")
    return int(m.group(0)) if m else None


# ------------------------------------------------------------
#  Cấu trúc dữ liệu
# ------------------------------------------------------------
@dataclass
class Unit:
    """Một đơn vị nội dung trong Điều: đoạn mở đầu, 1 Khoản hoặc 1 Điểm."""

    clause: Optional[str] = None
    point: Optional[str] = None
    lines: List[str] = field(default_factory=list)
    warning: Optional[str] = None

    @property
    def label(self) -> str:
        parts = []
        if self.clause:
            parts.append(f"Khoản {self.clause}")
        if self.point:
            parts.append(f"Điểm {self.point}")
        return " · ".join(parts) or "Mở đầu"

    @property
    def text(self) -> str:
        return "\n".join(self.lines).strip()


@dataclass
class Article:
    number: str
    title: str = ""
    section: Optional[str] = None
    units: List[Unit] = field(default_factory=list)

    @property
    def text(self) -> str:
        return "\n".join(u.text for u in self.units if u.text)


@dataclass
class Chapter:
    number: Optional[str] = None  # None = các Điều không nằm trong Chương nào
    title: str = ""
    part: Optional[str] = None
    articles: List[Article] = field(default_factory=list)


@dataclass
class Appendix:
    title: str
    lines: List[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return "\n".join(self.lines).strip()


@dataclass
class ParsedDocument:
    chapters: List[Chapter] = field(default_factory=list)
    preamble: List[str] = field(default_factory=list)
    closing: List[str] = field(default_factory=list)
    appendices: List[Appendix] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    @property
    def articles(self) -> List[Article]:
        return [a for c in self.chapters for a in c.articles]

    @property
    def parse_status(self) -> str:
        return "PARSED" if self.articles else "PARSE_FAILED"

    def to_content_json(self) -> dict:
        """Dạng JSON lưu vào `knowledge_document.content_json`."""
        return {
            "parse_status": self.parse_status,
            "preamble": "\n".join(self.preamble).strip(),
            "chapters": [
                {
                    "number": c.number,
                    "title": c.title,
                    "part": c.part,
                    "articles": [
                        {
                            "number": a.number,
                            "title": a.title,
                            "section": a.section,
                            "units": [
                                {
                                    "id": f"d{a.number}-{i}",
                                    "label": u.label,
                                    "clause": u.clause,
                                    "point": u.point,
                                    "text": u.text,
                                    "status": "WARNING" if u.warning else "AUTO",
                                    **({"warning": u.warning} if u.warning else {}),
                                }
                                for i, u in enumerate(a.units)
                            ],
                        }
                        for a in c.articles
                    ],
                }
                for c in self.chapters
            ],
            "closing": "\n".join(self.closing).strip(),
            "appendices": [{"title": ap.title, "text": ap.text} for ap in self.appendices],
            "warnings": list(self.warnings),
        }


# ------------------------------------------------------------
#  Parser
# ------------------------------------------------------------
class _Parser:
    def __init__(self) -> None:
        self.doc = ParsedDocument()
        self.phase = "preamble"  # preamble -> body -> closing
        self.part: Optional[str] = None
        self.section: Optional[str] = None
        self.chapter: Optional[Chapter] = None
        self.article: Optional[Article] = None
        self.unit: Optional[Unit] = None
        self.appendix: Optional[Appendix] = None
        self.in_quote = False
        # Tiêu đề Chương/Phần/Mục thường nằm ở dòng IN HOA kế tiếp
        self.awaiting_title: Optional[str] = None

    # --- helpers -------------------------------------------------
    def _ensure_chapter(self) -> Chapter:
        if self.chapter is None:
            self.chapter = Chapter(part=self.part)
            self.doc.chapters.append(self.chapter)
        return self.chapter

    def _append_text(self, line: str) -> None:
        if self.appendix is not None:
            self.appendix.lines.append(line)
        elif self.phase == "preamble":
            self.doc.preamble.append(line)
        elif self.phase == "closing":
            self.doc.closing.append(line)
        elif self.unit is not None:
            self.unit.lines.append(line)
        elif self.article is not None:
            self.unit = Unit()
            self.article.units.append(self.unit)
            self.unit.lines.append(line)
        elif self.chapter is not None and not self.chapter.articles:
            # Dòng lạ giữa tiêu đề Chương và Điều đầu tiên: coi là phần tiêu đề
            self.chapter.title = f"{self.chapter.title} {line}".strip()
        else:
            self.doc.preamble.append(line)

    def _start_article(self, number: str, title: str) -> None:
        chapter = self._ensure_chapter()
        prev = self.doc.articles[-1] if self.doc.articles else None
        if prev is not None:
            a, b = _base_number(prev.number), _base_number(number)
            same_base_suffix = a == b and number != prev.number  # Điều 3 -> Điều 3a
            if a is not None and b is not None and b != a + 1 and not same_base_suffix:
                self.doc.warnings.append(
                    f"Số Điều không liên tiếp: Điều {prev.number} -> Điều {number}"
                )
        self.article = Article(number=number, title=title.strip(), section=self.section)
        chapter.articles.append(self.article)
        self.unit = None

    def _start_clause(self, number: str, text: str) -> None:
        assert self.article is not None
        unit = Unit(clause=number, lines=[text] if text else [])
        clauses = [u.clause for u in self.article.units if u.clause and not u.point]
        expected = str(int(clauses[-1]) + 1) if clauses else "1"
        if number != expected:
            unit.warning = f"Khoản {number} đứng sau {'Khoản ' + clauses[-1] if clauses else 'đầu Điều'} (dự kiến Khoản {expected})"
        self.article.units.append(unit)
        self.unit = unit

    def _start_point(self, letter: str, text: str) -> None:
        assert self.article is not None
        clause = self.unit.clause if self.unit is not None else None
        unit = Unit(clause=clause, point=letter, lines=[text] if text else [])
        siblings = [u.point for u in self.article.units if u.point and u.clause == clause]
        if siblings and siblings[-1] in _POINT_ORDER and letter in _POINT_ORDER:
            if _POINT_ORDER.index(letter) != _POINT_ORDER.index(siblings[-1]) + 1:
                unit.warning = f"Điểm {letter}) đứng sau điểm {siblings[-1]})"
        elif not siblings and letter != "a":
            unit.warning = f"Điểm đầu tiên là {letter}) thay vì a)"
        self.article.units.append(unit)
        self.unit = unit

    # --- main loop -----------------------------------------------
    def feed(self, raw_line: str) -> None:
        line = raw_line.strip().replace(" ", " ")
        if _is_blank(line):
            return

        # Nội dung trích dẫn trong văn bản sửa đổi: không tách thành Điều/Khoản mới
        if self.in_quote:
            self._append_text(line)
            if _CLOSE_QUOTE_RE.search(line):
                self.in_quote = False
            return
        if self.phase == "body" and line.startswith(_OPEN_QUOTE):
            self._append_text(line)
            if not _CLOSE_QUOTE_RE.search(line[1:]):
                self.in_quote = True
            return

        if self.awaiting_title is not None:
            target = self.awaiting_title
            self.awaiting_title = None
            if _is_upper_title(line) and not (
                _ARTICLE_RE.match(line) or _CHAPTER_RE.match(line) or _SECTION_RE.match(line)
            ):
                if target == "chapter" and self.chapter is not None:
                    self.chapter.title = line
                elif target == "section":
                    self.section = f"{self.section} {line}".strip()
                elif target == "part":
                    self.part = f"{self.part} {line}".strip()
                return

        m = _APPENDIX_RE.match(line)
        if m and self.phase != "preamble" and (self.phase == "closing" or _is_upper_title(line[:7])):
            self.appendix = Appendix(title=line)
            self.doc.appendices.append(self.appendix)
            return
        if self.appendix is not None:
            self.appendix.lines.append(line)
            return

        if self.phase == "body" and _CLOSING_RE.match(line):
            self.phase = "closing"
            self.doc.closing.append(line)
            return
        if self.phase == "closing":
            self.doc.closing.append(line)
            return

        m = _PART_RE.match(line)
        if m and (self.phase == "body" or _is_upper_title(line[:4])):
            self.phase = "body"
            self.part = f"Phần {m.group(1)}" + (f" {m.group(2)}" if m.group(2) else "")
            self.chapter = None
            self.article = None
            self.unit = None
            self.awaiting_title = None if m.group(2) else "part"
            return

        m = _CHAPTER_RE.match(line)
        if m:
            self.phase = "body"
            self.section = None
            self.chapter = Chapter(number=m.group(1), title=m.group(2).strip(), part=self.part)
            self.doc.chapters.append(self.chapter)
            self.article = None
            self.unit = None
            self.awaiting_title = None if self.chapter.title else "chapter"
            return

        m = _SECTION_RE.match(line)
        if m and self.phase == "body":
            self.section = f"Mục {m.group(1)}" + (f" {m.group(2).strip()}" if m.group(2).strip() else "")
            self.article = None
            self.unit = None
            self.awaiting_title = None if m.group(2).strip() else "section"
            return

        m = _ARTICLE_RE.match(line)
        if m:
            self.phase = "body"
            self._start_article(m.group(1), m.group(2))
            return

        if self.article is not None:
            m = _CLAUSE_RE.match(line)
            if m:
                self._start_clause(m.group(1), m.group(2).strip())
                return
            m = _POINT_RE.match(line)
            if m:
                self._start_point(m.group(1), m.group(2).strip())
                return

        self._append_text(line)

    def finish(self) -> ParsedDocument:
        if self.in_quote:
            self.doc.warnings.append("Trích dẫn “...” không có dấu đóng - có thể đã nuốt nội dung phía sau")
        for article in self.doc.articles:
            if not article.title and not article.text:
                self.doc.warnings.append(f"Điều {article.number} không có nội dung")
        if not self.doc.articles:
            self.doc.warnings.append("Không tìm thấy Điều nào trong văn bản")
        return self.doc


def parse_legal_text(text: Optional[str]) -> ParsedDocument:
    """Tách cấu trúc một văn bản pháp luật từ toàn văn dạng text."""
    parser = _Parser()
    for line in (text or "").splitlines():
        # Bỏ header "# key: value" mà save_text_file ghi vào đầu file .txt
        if parser.phase == "preamble" and line.startswith("# "):
            continue
        parser.feed(line)
    return parser.finish()
