import re
from typing import Any

MAX_CLAUSE_CHARS = 1500
MAX_CHUNK_CHARS = 2000
MIN_BODY_CHARS = 500


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


def _group_units_by_clause(units: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    """Group article units by clause; split clauses exceeding MAX_CLAUSE_CHARS into individual points."""
    groups: list[list[dict[str, Any]]] = []
    by_clause: dict[str, list[dict[str, Any]]] = {}

    for unit in units:
        key = str(unit.get("clause") or "")
        if key not in by_clause:
            by_clause[key] = []
            groups.append(by_clause[key])
        by_clause[key].append(unit)

    out: list[list[dict[str, Any]]] = []
    for group in groups:
        size = sum(len(str(u.get("text") or "")) for u in group)
        has_points = any(u.get("point") for u in group)
        if size <= MAX_CLAUSE_CHARS or not has_points:
            out.append(group)
            continue
        lead = [u for u in group if not u.get("point")]
        points = [u for u in group if u.get("point")]
        out.append(lead + points[:1])
        out.extend([p] for p in points[1:])
    return out


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
                    groups = _group_units_by_clause(units) if units else [[]]

                    for group in groups:
                        raw_clause = next((u.get("clause") for u in group if u.get("clause")), None)
                        points_in_group = [u.get("point") for u in group if u.get("point")]
                        raw_point = (
                            points_in_group[0]
                            if len(points_in_group) == 1 and all(u.get("point") for u in group)
                            else None
                        )
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

        return chunks
