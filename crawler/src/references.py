"""
src/references.py
=================
Cross-references in provision text: "khoản 2 Điều 24 của Luật này",
"khoản 2 Điều 6 Nghị định số 326/2026/NĐ-CP", "điểm a khoản này".

Only explicit targets are kept: a bare "khoản N Điều M" is ambiguous (in an amending
document it usually means the amended one) and a name without a number cannot be linked.
"""

import re
from typing import List, Optional

from src.normalize import _DOC_NUM_RE

_SEP = r"\s*(?:,|và|hoặc)\s*"
_POINTS = rf"[Đđ]iểm\s+(?P<points>[a-zđ](?:{_SEP}(?:điểm\s+)?[a-zđ])*)\s+"
_CLAUSES = rf"[Kk]hoản\s+(?P<clauses>\d+[a-zđ]?(?:{_SEP}(?:khoản\s+)?\d+[a-zđ]?)*)\s+"
_TYPES = r"(?:Bộ luật|Luật|Pháp lệnh|Nghị quyết|Nghị định|Quyết định|Thông tư liên tịch|Thông tư)"
_REF_RE = re.compile(
    rf"(?:{_POINTS})?(?:{_CLAUSES})?"
    rf"(?:(?P<this_article>Điều\s+này)"
    rf"|(?:các\s+)?Điều\s+(?P<articles>\d+[a-zđ]?(?:{_SEP}(?:Điều\s+)?\d+[a-zđ]?)*)\s+(?:của\s+)?{_TYPES}\s+"
    rf"(?:(?P<self>này)|(?:số\s+)?(?P<number>{_DOC_NUM_RE.pattern})))"
)
_THIS_CLAUSE_RE = re.compile(rf"[Đđ]iểm\s+(?P<points>[a-zđ](?:{_SEP}(?:điểm\s+)?[a-zđ])*)\s+[Kk]hoản\s+này")
# Quoted text of an amending document speaks for the amended one ("Thông tư này" there is not us)
_QUOTED_RE = re.compile(r"“[^”]*”")
_LETTER_RE = re.compile(r"\b[a-zđ]\b")
_NUMBER_RE = re.compile(r"\d+[a-zđ]?")


def _list(group: Optional[str], pattern: re.Pattern) -> List[Optional[str]]:
    return pattern.findall(group) if group else [None]


def find_references(text: str, article: str, clause: Optional[str] = None) -> List[dict]:
    """References made by one unit (in `article`, `clause`): [{doc, article, clause, point}]."""
    text = _QUOTED_RE.sub(" ", text or "")
    found = []
    for m in _REF_RE.finditer(text):
        if m.group("this_article"):
            doc, articles = "self", [article]
        else:
            doc = "self" if m.group("self") else m.group("number")
            articles = _list(m.group("articles"), _NUMBER_RE)
        for art in articles:
            for cl in _list(m.group("clauses"), _NUMBER_RE):
                for pt in _list(m.group("points"), _LETTER_RE):
                    found.append({"doc": doc, "article": art, "clause": cl, "point": pt})
    for m in _THIS_CLAUSE_RE.finditer(text):
        for pt in _LETTER_RE.findall(m.group("points")):
            found.append({"doc": "self", "article": article, "clause": clause, "point": pt})

    own = {"doc": "self", "article": article, "clause": clause, "point": None}
    unique = []
    for ref in found:
        if ref != own and ref not in unique:
            unique.append(ref)
    return unique


# Code after the year in a document number -> type name used by the vbpl search filter
_TYPE_BY_CODE = {
    "TT": "Thông tư", "TTLT": "Thông tư liên tịch", "ND": "Nghị định", "QD": "Quyết định",
    "NQ": "Nghị quyết", "CT": "Chỉ thị", "QH": "Luật",
}


def doc_type_for_number(number: str) -> Optional[str]:
    """"58/2020/TT-BTC" -> "Thông tư", "38/2019/QH14" -> "Luật"; None for an unknown code."""
    code = (number or "").split("/")[-1].split("-")[0].upper().replace("Đ", "D")
    return _TYPE_BY_CODE.get(re.sub(r"\d+$", "", code))
