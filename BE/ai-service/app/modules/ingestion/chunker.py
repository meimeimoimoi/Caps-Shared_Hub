import re
from typing import Any

from app.core.qdrant import to_rfc3339
from app.schemas.errors import ErrorChunkEmpty
from app.schemas.ingestion_dto import IngestDocRequest


class ChunkValidationError(ValueError):
    """Raised when an ingestion request has empty chunks or invalid effective dates."""

MAX_CLAUSE_CHARS = 1500
MAX_CHUNK_CHARS = 2000
MIN_BODY_CHARS = 500
MAX_SHARED_LEAD_CHARS = 600

_LEADING_CLAUSE_RE = re.compile(r"^\s*(?:khoản\s+)?(\d{1,2})\.\s+(.+)$", re.IGNORECASE | re.DOTALL)
_MULTILINE_CLAUSE_SPLIT_RE = re.compile(r"(?:^|\n)\s*(\d{1,2})\.\s+")
_LEADING_POINT_RE = re.compile(r"^\s*([a-zđ]\d*)\)\s+(.+)$", re.IGNORECASE | re.DOTALL)
_SUBPOINT_SPLIT_RE = re.compile(r"(?:^|\n|;\s*)\s*([a-zđ]\d+)\)\s+", re.IGNORECASE)
_PATH_CLAUSE_RE = re.compile(r"\bkhoản\s+(\d{1,2})\b", re.IGNORECASE)
_PATH_POINT_RE = re.compile(r"\bđiểm\s+([a-zđ]\d*)\b", re.IGNORECASE)


def _split_body(body: str, limit: int) -> list[str]:
    """Split a long chunk body into parts <= limit, preserving line and sentence boundaries."""
    if len(body) <= limit:
        return [body]

    pieces: list[str] = []
    for line in body.split("\n"):
        if len(line) <= limit:
            pieces.append(line)
            continue
        for sentence in re.split(r"(?<=[.;:])\s+", line):
            while len(sentence) > limit:
                cut = sentence.rfind(" ", 0, limit)
                cut = cut if cut > limit // 2 else limit
                pieces.append(sentence[:cut].rstrip())
                sentence = sentence[cut:].lstrip()
            if sentence:
                pieces.append(sentence)

    parts: list[str] = []
    current = ""
    for piece in pieces:
        candidate = f"{current}\n{piece}" if current else piece
        if len(candidate) <= limit:
            current = candidate
        else:
            if current:
                parts.append(current)
            current = piece
    if current:
        parts.append(current)
    return parts or [body]


def _format_prefix(prefix: str, value: str | None) -> str | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text if text.lower().startswith(prefix.lower()) else f"{prefix} {text}"


def _extract_unit_point(unit: dict[str, Any]) -> str | None:
    raw_sub = str(unit.get("subpoint") or "").strip()
    raw_pt = str(unit.get("point") or "").strip()
    if raw_sub:
        if raw_pt and not raw_sub.lower().startswith(raw_pt.lower()):
            return f"{raw_pt}{raw_sub}"
        return raw_sub
    return raw_pt or None


def _expand_inline_subpoints(unit: dict[str, Any]) -> list[dict[str, Any]]:
    """Split inline sub-points such as đ1), đ2) inside a point body into distinct sub-point units."""
    text = str(unit.get("text") or "").strip()
    matches = list(_SUBPOINT_SPLIT_RE.finditer(text))
    if not matches:
        return [unit]

    lead_prefix = text[: matches[0].start()].strip(" :;-")
    expanded: list[dict[str, Any]] = []
    for idx, match in enumerate(matches):
        sub_label = match.group(1).strip()
        seg_start = match.end()
        seg_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        seg_body = text[seg_start:seg_end].strip()
        if not seg_body:
            continue
        combined_text = f"{lead_prefix}\n{seg_body}" if lead_prefix else seg_body
        child = dict(unit)
        child["point"] = sub_label
        child.pop("subpoint", None)
        child["text"] = combined_text
        expanded.append(child)
    return expanded or [unit]


def _normalize_article_units(units: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Infer missing clause/point labels (e.g. in amending laws) and split inline clauses/sub-points."""
    normalized: list[dict[str, Any]] = []
    active_clause: str | None = None

    for raw_unit in units:
        unit = dict(raw_unit)
        raw_clause = str(unit.get("clause") or unit.get("clause_number") or "").strip() or None
        raw_point = _extract_unit_point(unit)
        text = str(unit.get("text") or "").strip()

        # Split multi-clause blocks in amending articles ("1. Sửa đổi...\n2. Bổ sung...") when clause is absent.
        if not raw_clause and not raw_point and text:
            clause_matches = list(_MULTILINE_CLAUSE_SPLIT_RE.finditer(text))
            if len(clause_matches) >= 2 and clause_matches[0].start() == 0:
                for idx, cm in enumerate(clause_matches):
                    c_num = cm.group(1)
                    c_start = cm.end()
                    c_end = (
                        clause_matches[idx + 1].start()
                        if idx + 1 < len(clause_matches)
                        else len(text)
                    )
                    c_body = text[c_start:c_end].strip()
                    if c_body:
                        normalized.extend(
                            _expand_inline_subpoints(
                                {"clause": c_num, "point": None, "text": c_body}
                            )
                        )
                active_clause = clause_matches[-1].group(1)
                continue

            if m_clause := _LEADING_CLAUSE_RE.match(text):
                raw_clause = m_clause.group(1)
                text = m_clause.group(2).strip()
            elif m_point := _LEADING_POINT_RE.match(text):
                raw_point = m_point.group(1)
                text = m_point.group(2).strip()

        if raw_clause:
            active_clause = raw_clause
        elif raw_point and active_clause:
            raw_clause = active_clause

        unit["clause"] = raw_clause
        unit["point"] = raw_point
        unit["text"] = text
        normalized.extend(_expand_inline_subpoints(unit))

    return normalized


def _group_units_by_clause(units: list[dict[str, Any]]) -> list[tuple[str | None, str | None, list[dict[str, Any]]]]:
    """Group units by clause and emit one chunk per point so point metadata (a, đ, đ1, đ2) is preserved."""
    groups: list[list[dict[str, Any]]] = []
    by_clause: dict[str, list[dict[str, Any]]] = {}

    for unit in _normalize_article_units(units):
        key = str(unit.get("clause") or "")
        if key not in by_clause:
            by_clause[key] = []
            groups.append(by_clause[key])
        by_clause[key].append(unit)

    out: list[tuple[str | None, str | None, list[dict[str, Any]]]] = []
    for group in groups:
        raw_clause = next((u.get("clause") for u in group if u.get("clause")), None)
        lead = [u for u in group if not u.get("point")]
        points = [u for u in group if u.get("point")]

        if not points:
            out.append((raw_clause, None, group))
            continue

        lead_len = sum(len(str(u.get("text") or "")) for u in lead)
        if lead and lead_len > MAX_SHARED_LEAD_CHARS:
            out.append((raw_clause, None, lead))
            for pt in points:
                out.append((raw_clause, str(pt.get("point")), [pt]))
        else:
            for pt in points:
                out.append((raw_clause, str(pt.get("point")), lead + [pt]))
    return out


def infer_missing_clause_and_point(
    clause: str | None,
    point: str | None,
    text: str | None,
    path: str | None = None,
) -> tuple[str | None, str | None]:
    """Backfill missing clause/point labels from breadcrumb path or leading numbering on pre-built chunks."""
    resolved_clause = str(clause).strip() if clause and str(clause).strip() else None
    resolved_point = str(point).strip() if point and str(point).strip() else None
    raw_path = str(path or "")
    raw_text = str(text or "").strip()

    # Strip "Nội dung:" header prefix if already formatted.
    body_only = raw_text.split("Nội dung:", 1)[-1].strip() if "Nội dung:" in raw_text else raw_text

    if not resolved_clause:
        if m := _PATH_CLAUSE_RE.search(raw_path) or _PATH_CLAUSE_RE.search(raw_text):
            resolved_clause = f"Khoản {m.group(1)}"
        elif m := _LEADING_CLAUSE_RE.match(body_only):
            resolved_clause = f"Khoản {m.group(1)}"

    if not resolved_point:
        if m := _PATH_POINT_RE.search(raw_path):
            resolved_point = f"Điểm {m.group(1)}"
        elif m := _LEADING_POINT_RE.match(body_only):
            resolved_point = f"Điểm {m.group(1)}"

    return (
        _format_prefix("Khoản", resolved_clause),
        _format_prefix("Điểm", resolved_point),
    )


def _numbered_unit_text(unit: dict[str, Any]) -> str:
    text = str(unit.get("text") or "").strip()
    if not text:
        return ""
    if unit.get("point"):
        return f"{unit['point']}) {text}"
    if unit.get("clause"):
        return f"{unit['clause']}. {text}"
    return text


class LegalChunker:
    @staticmethod
    def prepare_ingest_chunks(req: IngestDocRequest) -> list[dict[str, Any]]:
        """Build normalized chunks from pre-split items or content_json and validate effective dates."""
        chunks_to_index: list[dict[str, Any]] = []
        if req.chunks and len(req.chunks) > 0:
            default_eff_from = req.effective_from or req.vbhn_effective_from
            for c in req.chunks:
                clause_label, point_label = infer_missing_clause_and_point(
                    c.clause, c.point, c.text, c.path
                )
                chunks_to_index.append(
                    {
                        "doc_id": req.knowledge_document_id,
                        "source_id": req.legal_source_id,
                        "doc_number": req.document_number,
                        "doc_title": req.title,
                        "article": _format_prefix("Điều", c.article),
                        "clause": clause_label,
                        "point": point_label,
                        "effective_from": c.effective_from or default_eff_from,
                        "effective_to": c.effective_to or req.effective_to,
                        "text": c.text,
                    }
                )
        else:
            if not req.content_json:
                raise ChunkValidationError(ErrorChunkEmpty.EMPTY_CHUNK)
            chunks_to_index = LegalChunker.chunk_document(req.model_dump())

        if not chunks_to_index:
            raise ChunkValidationError(ErrorChunkEmpty.EMPTY_CHUNK)

        for chunk in chunks_to_index:
            eff_from = chunk.get("effective_from")
            if not eff_from or not str(eff_from).strip():
                raise ChunkValidationError("effective_from is required for indexing legal chunks.")
            try:
                to_rfc3339(str(eff_from), is_end=False)
                if chunk.get("effective_to"):
                    to_rfc3339(str(chunk["effective_to"]), is_end=True)
            except ValueError as e:
                raise ChunkValidationError("Invalid effective date format (expected YYYY-MM-DD).") from e

        return chunks_to_index

    @staticmethod
    def chunk_document(data: dict[str, Any]) -> list[dict[str, Any]]:
        chunks: list[dict[str, Any]] = []
        doc_num = data["document_number"]
        doc_title = data.get("title") or ""
        doc_id = data["knowledge_document_id"]
        source_id = data["legal_source_id"]
        eff_from = data.get("effective_from") or data.get("vbhn_effective_from")
        eff_to = data.get("effective_to")
        content_json = data.get("content_json") or {}

        doc_header = f"Văn bản: {doc_num} - {doc_title}" if doc_title else f"Văn bản: {doc_num}"

        def append_chunk_parts(
            header: str,
            body: str,
            article_label: str | None,
            clause_label: str | None,
            point_label: str | None,
        ) -> None:
            clean_body = (body or "").strip()
            if not clean_body:
                return
            limit = max(MAX_CHUNK_CHARS - len(header) - 10, MIN_BODY_CHARS)
            for part in _split_body(clean_body, limit):
                text = f"{header}\nNội dung: {part}".strip()
                chunks.append(
                    {
                        "doc_id": doc_id,
                        "source_id": source_id,
                        "doc_number": doc_num,
                        "doc_title": doc_title,
                        "article": article_label,
                        "clause": clause_label,
                        "point": point_label,
                        "effective_from": eff_from,
                        "effective_to": eff_to,
                        "text": text,
                    }
                )

        def append_appendices() -> None:
            # Appendices (form catalogues, tables) are cited by their title, e.g. "Phụ lục I".
            for appendix in content_json.get("appendices") or []:
                title = str(appendix.get("title") or "").strip() or "Phụ lục"
                append_chunk_parts(f"{doc_header}\n{title}", str(appendix.get("text") or ""), title, None, None)

        # 1. Crawler schema: chapters[] -> articles[] -> units[]
        chapters = content_json.get("chapters") or []
        if chapters:
            for chapter in chapters:
                ch_num = chapter.get("number")
                ch_title = chapter.get("title") or ""
                ch_header = (
                    f"Chương {ch_num}. {ch_title}".strip(". ")
                    if ch_num
                    else None
                )
                for art in chapter.get("articles") or []:
                    art_num = str(art.get("number") or "").strip()
                    art_name = str(art.get("title") or "").strip()
                    art_label = _format_prefix("Điều", art_num) or art_name or None
                    art_heading = (
                        f"{art_label}. {art_name}"
                        if art_label and art_name and not art_label.endswith(art_name)
                        else (art_label or art_name)
                    )
                    units = art.get("units") or []
                    grouped = _group_units_by_clause(units) if units else [(None, None, [])]

                    for raw_clause, raw_point, group in grouped:
                        clause_label = _format_prefix("Khoản", raw_clause)
                        point_label = _format_prefix("Điểm", raw_point)

                        crumbs = [
                            p
                            for p in (doc_header, ch_header, art_heading, clause_label, point_label)
                            if p
                        ]
                        header = "\n".join([crumbs[0], " -> ".join(crumbs[1:])]) if len(crumbs) > 1 else crumbs[0]
                        body = "\n".join(filter(None, (_numbered_unit_text(u) for u in group))) or art_name
                        append_chunk_parts(header, body, art_label, clause_label, point_label)

            append_appendices()
            return chunks

        # 2. Legacy schema fallback: articles[] -> clauses[] -> points[]
        articles = content_json.get("articles") or []
        for art in articles:
            art_title = _format_prefix("Điều", art.get("title") or art.get("number"))
            clauses = art.get("clauses") or []

            if not clauses:
                header = f"{doc_header}\n{art_title}" if art_title else doc_header
                append_chunk_parts(header, art.get("content", ""), art_title, None, None)
                continue

            for cl in clauses:
                cl_title = _format_prefix("Khoản", cl.get("title") or cl.get("number"))
                points = cl.get("points") or []

                if points:
                    for pt in points:
                        pt_title = _format_prefix("Điểm", pt.get("title") or pt.get("number"))
                        trail = " -> ".join(p for p in (art_title, cl_title, pt_title) if p)
                        header = f"{doc_header}\n{trail}" if trail else doc_header
                        append_chunk_parts(header, pt.get("content", ""), art_title, cl_title, pt_title)
                else:
                    trail = " -> ".join(p for p in (art_title, cl_title) if p)
                    header = f"{doc_header}\n{trail}" if trail else doc_header
                    append_chunk_parts(header, cl.get("content", ""), art_title, cl_title, None)

        append_appendices()
        return chunks
