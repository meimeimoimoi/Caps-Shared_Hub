"""
src/appendix.py
===============
Text of appendix attachments (tax forms such as 03/TNDN) that vbpl.vn ships as
separate .docx files or as .rar/.zip archives of .docx, outside the detail page text.

    attachment_appendices(rec) -> [{"title", "text", "file"}]

.rar/.7z need `bsdtar` (Debian: libarchive-tools); missing -> logged and skipped.
"""

import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import List, Optional
from xml.etree import ElementTree as ET

from slugify import slugify

import config
from src.logger_setup import setup_logger

logger = setup_logger(__name__, config.LOG_DIR)

_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
ARCHIVE_TYPES = ("rar", "zip", "7z")
# Text boxes are stored twice (mc:Choice + VML mc:Fallback); reading both duplicates the text
_FALLBACK = "{http://schemas.openxmlformats.org/markup-compatibility/2006}Fallback"


def _walk(el, tag=None):
    if el.tag == _FALLBACK:
        return
    if tag is None or el.tag == tag:
        yield el
    for child in el:
        yield from _walk(child, tag)


def _para(p) -> str:
    parts = []
    for el in _walk(p):
        if el.tag == f"{_W}t":
            parts.append(el.text or "")
        elif el.tag in (f"{_W}tab", f"{_W}br"):
            parts.append(" ")
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def _blocks(parent, lines: List[str]) -> None:
    for el in parent:
        if el.tag == f"{_W}p":
            lines.append(_para(el))
        elif el.tag == f"{_W}tbl":
            # One line per table row so a form indicator stays next to its code and value columns
            for row in _walk(el, f"{_W}tr"):
                cells = [" ".join(filter(None, (_para(p) for p in _walk(tc, f"{_W}p")))) for tc in row.findall(f"{_W}tc")]
                lines.append(" | ".join(c for c in cells if c))
        elif el.tag == f"{_W}sdt":
            content = el.find(f"{_W}sdtContent")
            if content is not None:
                _blocks(content, lines)


def docx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    lines: List[str] = []
    _blocks(root.find(f"{_W}body"), lines)
    return "\n".join(line for line in lines if line)


def _is_docx(path: Path) -> bool:
    try:
        with zipfile.ZipFile(path) as z:
            return "word/document.xml" in z.namelist()
    except zipfile.BadZipFile:
        return False


def _natural(path: Path) -> list:
    """'2. 03.TNDN' before '10. 03-8.TNDN', the order the forms are numbered in."""
    return [int(s) if s.isdigit() else s.lower() for s in re.split(r"(\d+)", str(path))]


def _extract(archive: Path, dest: Path) -> bool:
    if zipfile.is_zipfile(archive):
        with zipfile.ZipFile(archive) as z:
            z.extractall(dest)  # zipfile drops absolute paths and ".." from member names
        return True
    bsdtar = shutil.which("bsdtar")
    if not bsdtar:
        logger.warning(f"  Bỏ qua phụ lục nén {archive.name}: chưa cài bsdtar (libarchive-tools)")
        return False
    # bsdtar refuses absolute paths and ".." members unless -P is given
    result = subprocess.run([bsdtar, "-xf", str(archive), "-C", str(dest)], capture_output=True, text=True)
    if result.returncode != 0:
        logger.warning(f"  Giải nén {archive.name} lỗi: {result.stderr.strip()[:300]}")
    return True


def _title(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip()


def _from_archive(archive: Path, label: str) -> List[dict]:
    out: List[dict] = []
    with tempfile.TemporaryDirectory() as tmp:
        if not _extract(archive, Path(tmp)):
            return out
        files = sorted((p for p in Path(tmp).rglob("*") if p.is_file()), key=_natural)
        skipped = [p.name for p in files if p.suffix.lower() == ".doc"]
        if skipped:
            # shortcut: old binary .doc forms are skipped, add antiword if those forms are needed
            logger.warning(f"  {archive.name}: bỏ qua {len(skipped)} file .doc (chưa đọc được Word 97-2003)")
        for path in files:
            if path.suffix.lower() != ".docx" or not _is_docx(path):
                continue
            member = " / ".join(part for part in path.relative_to(tmp).with_suffix("").parts)
            text = docx_text(path)
            if text:
                out.append({"title": _title(f"{label} / {member}"), "text": text, "file": archive.name})
    return out


def _resolve(local_path: Optional[str]) -> Optional[Path]:
    """Records crawled in Docker keep /app/data/...; map them onto this machine's data dir."""
    if not local_path:
        return None
    path = Path(local_path)
    if path.is_file():
        return path
    tail = local_path.replace("\\", "/").split("/data/", 1)
    candidate = config.DATA_ROOT / tail[1] if len(tail) == 2 else None
    return candidate if candidate and candidate.is_file() else None


def is_appendix(att: dict) -> bool:
    """Archives always hold forms; a .docx counts only when its name says "Phụ lục" (the main text is in the page)."""
    if not att.get("downloaded"):
        return False
    kind = (att.get("file_type") or "").lower()
    return kind in ARCHIVE_TYPES or (kind == "docx" and "phu-luc" in slugify(att.get("file_name") or ""))


def attachment_appendices(rec: dict) -> List[dict]:
    out: List[dict] = []
    for att in rec.get("attachments") or []:
        if not is_appendix(att):
            continue
        path = _resolve(att.get("local_path"))
        if path is None:
            logger.warning(f"[{rec.get('so_hieu')}] Không thấy file phụ lục {att.get('file_name')} trên đĩa")
            continue
        label = Path(att.get("file_name") or path.name).stem
        # "89-2026-tt-btc__Phụ lục I" -> "Phụ lục I", so it matches the same appendix in the page text
        label = label[max(label.casefold().find("phụ lục"), 0):].strip(" .")
        try:
            if _is_docx(path):
                text = docx_text(path)
                if text:
                    out.append({"title": _title(label), "text": text, "file": att.get("file_name")})
            else:
                # vbpl also ships zip archives of forms under a .docx name
                out.extend(_from_archive(path, label))
        except Exception as e:
            logger.error(f"[{rec.get('so_hieu')}] Lỗi đọc phụ lục {att.get('file_name')}: {e}")
    return out
