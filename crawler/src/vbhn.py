"""
src/vbhn.py
===========
Consolidated documents (văn bản hợp nhất, VBHN).

A VBHN marks every provision changed since the base document with a footnote marker
("3.[3]", "Điều 7. Điều khoản thi hành[4]") and lists the notes after the signature block:

    [3]
    Khoản này được sửa đổi, bổ sung theo quy định tại khoản 5 Điều 1 Thông tư số
    71/2025/TT-BTC
    , có hiệu lực thi hành từ ngày 01 tháng 7 năm 2025.
"""

import re
from datetime import date
from typing import Dict, List, Optional, Tuple

from src.normalize import _DOC_NUM_RE

DOC_TYPE = "Văn bản hợp nhất"

MARKER_RE = re.compile(r"\[(\d+)\]")
_NOTE_START_RE = re.compile(r"^\[(\d+)\]\s*(.*)$")
_TYPE_RE = re.compile(r"được\s+(sửa đổi, bổ sung|sửa đổi|bổ sung|bãi bỏ|thay thế|đình chỉ)", re.IGNORECASE)
_DATE_RE = re.compile(
    r"hiệu lực(?:\s+thi hành)?(?:\s+kể)?\s+từ\s+ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})",
    re.IGNORECASE,
)


def split_footnotes(closing: List[str]) -> Tuple[List[str], Dict[int, str]]:
    """
    Cut the footnote list off the closing lines. It starts at the last "[1]" line, since
    the body may carry a "[1]" marker of its own (e.g. on the document title).
    """
    starts = [i for i, line in enumerate(closing) if _NOTE_START_RE.match(line.strip())
              and _NOTE_START_RE.match(line.strip()).group(1) == "1"]
    if not starts:
        return closing, {}
    notes: Dict[int, List[str]] = {}
    current: Optional[int] = None
    for line in closing[starts[-1]:]:
        m = _NOTE_START_RE.match(line.strip())
        if m:
            current = int(m.group(1))
            notes[current] = [m.group(2)] if m.group(2) else []
        elif current is not None:
            notes[current].append(line.strip())
    # Lines were split around links ("Thông tư số" / "71/2025/TT-BTC" / ", có hiệu lực ...")
    joined = {n: re.sub(r"\s+([,.;:])", r"\1", " ".join(parts)).strip() for n, parts in notes.items()}
    return closing[:starts[-1]], joined


def _note_date(text: str) -> Optional[str]:
    m = _DATE_RE.search(text)
    if not m:
        return None
    try:
        return date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
    except ValueError:
        return None


def parse_footnote(note: int, text: str) -> dict:
    """Structured view of one footnote; `text` is always kept since the wording varies."""
    # The effect is stated in the first sentence; what follows may quote other provisions
    head = re.split(r"[.:](?:\s|$)", text, maxsplit=1)[0]
    type_m = _TYPE_RE.search(head)
    number_m = _DOC_NUM_RE.search(head)
    return {
        "note": note,
        "type": type_m.group(1).lower() if type_m else None,
        "source_number": number_m.group(0) if number_m else None,
        "effective_from": _note_date(text),
        "text": text,
    }


def latest_effective_date(footnotes: Dict[int, str]) -> Optional[str]:
    """Newest "có hiệu lực từ ngày ..." in the notes: from then on the VBHN text applies."""
    dates = [d for d in map(_note_date, footnotes.values()) if d]
    return max(dates, default=None)


def latest_base_vbhn(doc_id: Optional[str], vbhn_list: Optional[List[dict]]) -> Optional[dict]:
    """
    Newest VBHN whose base document is `doc_id`. The base is the earliest issued merged
    document: an omnibus amending law is merged into the VBHN of every law it amends.
    """
    def is_base(vbhn: dict) -> bool:
        merged = [m for m in vbhn.get("merged") or [] if m.get("issue_date")]
        return bool(merged) and min(merged, key=lambda m: m["issue_date"])["id"] == doc_id

    own = [v for v in vbhn_list or [] if is_base(v)]
    return max(own, key=lambda v: v.get("issue_date") or "", default=None)


def resolve_vbhn_id(vbhn: dict, relations: Optional[List[dict]]) -> str:
    """
    The VBHN list can point to a record whose page is empty; the "Lược đồ" entry with
    code 7 (hop_nhat) carries the published id. Match it by the VBHN number in its title.
    """
    for rel in relations or []:
        if rel.get("code") == "7" and vbhn.get("doc_num") and vbhn["doc_num"] in (rel.get("title") or ""):
            return rel["doc_id"]
    return vbhn["id"]


def vbhn_status(doc_id: Optional[str], relations: Optional[List[dict]], vbhn_list: Optional[List[dict]]) -> dict:
    """
    Newest VBHN of a base document and the amending documents (code 10, incoming) it does
    not merge yet: until a new VBHN is issued their own text must be read alongside.
    Code 12 (replaced as a whole) is left out: a replacement is never merged into a VBHN.
    """
    latest = latest_base_vbhn(doc_id, vbhn_list)
    if latest:
        latest = {**latest, "page_id": resolve_vbhn_id(latest, relations)}
    merged = {m["id"] for m in (latest or {}).get("merged") or []}
    missing = [
        {"doc_id": r["doc_id"], "title": r.get("title")}
        for r in relations or []
        if r.get("code") == "10" and r.get("direction") == "in" and r.get("doc_id") not in merged
    ]
    return {"vbhn_latest": latest, "vbhn_outdated": bool(missing), "vbhn_missing": missing}

