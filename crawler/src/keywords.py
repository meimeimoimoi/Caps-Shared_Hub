"""
src/keywords.py
===============
Bộ từ khoá cho chế độ "cào hết" (`--keywords-file`).

Ô tìm kiếm của vbpl.vn và vbpq.mof.gov.vn khớp rất lỏng (khớp từng từ), nên
mỗi kết quả phải qua bộ lọc: chỉ giữ văn bản có TÊN (tiêu đề / trích yếu) chứa
nguyên cụm từ khoá hoặc alias của nhóm; riêng nhóm `seeds` giữ đúng số hiệu.

File TOML:
    doc_types = ["Luật", "Nghị định", ...]     # mặc định cho mọi nhóm

    [core]
    terms   = ["thuế thu nhập doanh nghiệp", ...]
    aliases = ["thuế TNDN"]                     # tên chứa alias cũng được giữ
    doc_types = [...]                           # (tuỳ chọn) ghi đè theo nhóm
    enabled = true                              # (tuỳ chọn) false = bỏ cả nhóm

    [seeds]
    so_hieu = ["80/2021/TT-BTC"]                # cào đúng số hiệu này
"""

import re
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

from src.normalize import doc_number_key
from src.rsc import fix_mojibake, is_mojibake

SEEDS_GROUP = "seeds"

# Ký hiệu trong số hiệu -> loại văn bản (để mỗi seed chỉ tìm đúng 1 loại)
_TYPE_BY_CODE = [
    ("VBHN", "Văn bản hợp nhất"),
    ("TTLT", "Thông tư liên tịch"),
    ("TT", "Thông tư"),
    ("NĐ", "Nghị định"),
    ("QĐ", "Quyết định"),
    ("NQ", "Nghị quyết"),
]


def _norm(text: Optional[str]) -> str:
    return re.sub(r"\s+", " ", text or "").strip().casefold()


def title_matches(title: Optional[str], accept_terms: Sequence[str]) -> Optional[bool]:
    """
    Tên văn bản có chứa một trong các cụm `accept_terms` không.

    None = không đọc được tên (rỗng hoặc hỏng encoding sau khi đã sửa) -> người
    gọi giữ lại và kiểm tra lại bằng tiêu đề trên trang chi tiết.
    """
    terms = [t for t in (_norm(x) for x in accept_terms) if t]
    if not terms:
        return True
    fixed = fix_mojibake(title or "")
    if not fixed.strip() or is_mojibake(fixed):
        return None
    name = _norm(fixed)
    return any(t in name for t in terms)


def infer_doc_type(so_hieu: str) -> Optional[str]:
    """'80/2021/TT-BTC' -> 'Thông tư', '14/2008/QH12' -> 'Luật'; None nếu không đoán được."""
    codes = re.split(r"[/-]", (so_hieu or "").upper())
    if any(c.startswith("QH") for c in codes[1:]):
        return "Luật"
    for code, doc_type in _TYPE_BY_CODE:
        if code in codes:
            return doc_type
    return None


@dataclass(frozen=True)
class KeywordSearch:
    """Một lượt tìm: từ khoá gửi lên ô tìm kiếm + cách lọc kết quả."""

    term: str
    group: str
    doc_types: Tuple[str, ...]
    accept_terms: Tuple[str, ...] = ()
    so_hieu: Optional[str] = None  # chỉ với nhóm seeds

    @property
    def label(self) -> str:
        return f"{self.group}: {self.term}"

    def matches(self, title: Optional[str], so_hieu: Optional[str]) -> Optional[bool]:
        """True giữ, False bỏ, None chưa chắc (tên hỏng encoding)."""
        if self.so_hieu:
            got = doc_number_key(so_hieu)
            if got is not None:
                return got == doc_number_key(self.so_hieu)
            # Số hiệu từ payload hỏng -> thử tìm trong tên
            return title_matches(title, [self.so_hieu])
        return title_matches(title, self.accept_terms)


@dataclass
class KeywordPlan:
    path: Path
    searches: List[KeywordSearch]

    @property
    def groups(self) -> List[str]:
        return list(dict.fromkeys(s.group for s in self.searches))


def load_keyword_plan(path, doc_types_override: Optional[Sequence[str]] = None) -> KeywordPlan:
    """Đọc file TOML -> danh sách lượt tìm (bỏ nhóm `enabled = false`, bỏ từ khoá trùng)."""
    path = Path(path)
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    default_types = list(doc_types_override or data.get("doc_types") or [])
    if not default_types:
        raise ValueError(f"{path}: thiếu `doc_types` (danh sách loại văn bản)")

    searches: List[KeywordSearch] = []
    seen_terms = set()
    for group, section in data.items():
        if not isinstance(section, dict) or not section.get("enabled", True):
            continue
        types = tuple(doc_types_override or section.get("doc_types") or default_types)

        if group == SEEDS_GROUP:
            for so_hieu in section.get("so_hieu") or []:
                key = doc_number_key(so_hieu)
                if not key or key in seen_terms:
                    continue
                seen_terms.add(key)
                inferred = infer_doc_type(so_hieu)
                searches.append(KeywordSearch(
                    term=so_hieu.strip(), group=group, so_hieu=so_hieu.strip(),
                    doc_types=(inferred,) if inferred and not doc_types_override else types,
                ))
            continue

        aliases = [a for a in section.get("aliases") or [] if a.strip()]
        for term in section.get("terms") or []:
            if not term.strip() or _norm(term) in seen_terms:
                continue
            seen_terms.add(_norm(term))
            searches.append(KeywordSearch(
                term=term.strip(), group=group, doc_types=types,
                accept_terms=tuple(dict.fromkeys([term.strip(), *aliases])),
            ))

    return KeywordPlan(path=path, searches=searches)
