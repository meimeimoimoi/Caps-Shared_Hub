"""
src/appendix.py
===============
Appendices that vbpl.vn ships as separate attachments instead of inside the page text,
e.g. the tax forms of TT 89/2026 (03/TNDN...): a .docx, a .zip of .docx saved under a
.docx name, or a .rar of .docx.

    attachment_appendices(rec, existing) -> [{"title", "text"}]

.rar/.7z need `bsdtar` (Debian: libarchive-tools); when it is missing the archive is skipped with a warning.
"""

import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import List, Optional
from xml.etree import ElementTree

import config
from src.logger_setup import setup_logger

logger = setup_logger(__name__, config.LOG_DIR)

_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
# Text boxes are stored twice (mc:Choice + VML mc:Fallback); reading both duplicates the text
_FALLBACK = "{http://schemas.openxmlformats.org/markup-compatibility/2006}Fallback"
_ARCHIVE_SUFFIXES = (".zip", ".rar", ".7z")


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
                cells = [" ".join(filter(None, map(_para, _walk(tc, f"{_W}p")))) for tc in row.findall(f"{_W}tc")]
                lines.append(" | ".join(c for c in cells if c))
        elif el.tag == f"{_W}sdt":
            content = el.find(f"{_W}sdtContent")
            if content is not None:
                _blocks(content, lines)


def docx_text(path) -> str:
    with zipfile.ZipFile(path) as z:
        root = ElementTree.fromstring(z.read("word/document.xml"))
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
        logger.warning(f"  Skip appendix archive {archive.name}: bsdtar (libarchive-tools) is not installed")
        return False
    # bsdtar refuses absolute paths and ".." members unless -P is given
    result = subprocess.run([bsdtar, "-xf", str(archive), "-C", str(dest)], capture_output=True, text=True)
    if result.returncode != 0:
        logger.warning(f"  Extracting {archive.name} failed: {result.stderr.strip()[:300]}")
    return True


def _from_archive(archive: Path, title: str) -> List[dict]:
    out: List[dict] = []
    with tempfile.TemporaryDirectory() as tmp:
        if not _extract(archive, Path(tmp)):
            return out
        files = sorted((p for p in Path(tmp).rglob("*") if p.is_file()), key=_natural)
        skipped = sum(1 for p in files if p.suffix.lower() == ".doc")
        if skipped:
            # shortcut: Word 97-2003 .doc forms are skipped, add a .doc reader (antiword) when those forms are needed
            logger.warning(f"  {archive.name}: skipped {skipped} .doc file(s) (Word 97-2003 is not supported)")
        for path in files:
            if path.suffix.lower() != ".docx" or not _is_docx(path):
                continue
            text = docx_text(path)
            if text:
                # Archives often nest folders named like the appendix itself; keep each name once
                parts = [_clean(p) for p in path.relative_to(tmp).with_suffix("").parts]
                parts = [p for p in parts if p.casefold() != title.casefold()]
                out.append({"title": " / ".join([title] + parts), "text": text})
    return out


def _resolve(local_path: str) -> Optional[Path]:
    """Records crawled in Docker keep /app/data/...; map them onto this machine's data dir."""
    if not local_path:
        return None
    path = Path(local_path)
    if path.is_file():
        return path
    tail = local_path.replace("\\", "/").split("/data/", 1)
    candidate = config.DATA_ROOT / tail[1] if len(tail) == 2 else None
    return candidate if candidate and candidate.is_file() else None


def _clean(title: str) -> str:
    return re.sub(r"\s+", " ", title).strip(" .")


def attachment_appendices(rec: dict, existing: List[dict]) -> List[dict]:
    """Attachments whose name contains "Phụ lục"; titles already in the page text are not added twice."""
    seen = {a["title"].casefold() for a in existing}
    out: List[dict] = []
    for att in rec.get("attachments") or []:
        name = att.get("file_name") or ""
        start = name.casefold().find("phụ lục")
        path = _resolve(att.get("local_path") or "") if start >= 0 else None
        if path is None:
            continue
        title = _clean(Path(name[start:]).stem)
        if title.casefold() in seen:
            continue
        try:
            if _is_docx(path):
                text = docx_text(path)
                found = [{"title": title, "text": text}] if text else []
            elif zipfile.is_zipfile(path) or path.suffix.lower() in _ARCHIVE_SUFFIXES:
                # vbpl also ships zip archives of forms under a .docx name
                found = _from_archive(path, title)
            else:
                logger.warning(f"[{rec.get('so_hieu')}] cannot read appendix {name}: not a docx or archive")
                continue
        except (zipfile.BadZipFile, KeyError, ElementTree.ParseError, OSError) as e:
            logger.warning(f"[{rec.get('so_hieu')}] cannot read appendix {name}: {e}")
            continue
        seen.add(title.casefold())
        out.extend(found)
    return out
