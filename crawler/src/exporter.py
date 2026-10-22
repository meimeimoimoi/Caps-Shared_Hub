"""
src/exporter.py
===============
Xuất mỗi văn bản thành 1 payload JSON khớp schema `knowledge` của
Caps-Shared_Hub (BE/ingestion/Entities: LegalSource, KnowledgeDocument, KbChunk).

    data/export/<loai_van_ban>/<so-hieu-slug>.json
    data/export/manifest.json      (tóm tắt mọi file đã xuất)

Đây chính là body sẽ POST lên API ingestion ở bước tích hợp sau.

schema_version 2:
  - chunk có thêm `part` / `total_parts` / `char_count`; mỗi chunk <= MAX_CHUNK_CHARS
    (thân quá dài được tách thành nhiều phần, mỗi phần lặp lại header ngữ cảnh).
  - `knowledge_document.file_hash` luôn có giá trị; `file_hash_basis` = "text" | "source_id".
  - `knowledge_document.ingest` = {"suggested_status": "APPROVED"|"PENDING", "pending_reasons": [...]}
    để BE quyết định tự duyệt hay chờ admin.
"""

import hashlib
import json
import re
from datetime import datetime
from typing import List, Optional

from slugify import slugify

import config
from src.legal_parser import Article, ParsedDocument, Unit, parse_legal_text
from src import vbhn
from src.logger_setup import setup_logger
from src.normalize import has_document_number, parse_vn_date

logger = setup_logger(__name__, config.LOG_DIR)

SCHEMA_VERSION = 2


def get_export_dir():
    """Resolve lazily because DATA_DIR changes when a crawl run is activated."""
    return config.DATA_DIR / "export"


# Giá trị `knowledge_document.source` theo nguồn cào. Lưu ý: ràng buộc ck_kd_source
# trong BE/SHFT_PostgreSQL.sql hiện chỉ cho CRAWL_VBPL/MANUAL_UPLOAD -> cần thêm CRAWL_MOF.
SOURCE_CODES = {"vbpl": "CRAWL_VBPL", "mof": "CRAWL_MOF"}
# Khoản dài hơn ngưỡng này thì tách mỗi Điểm thành 1 chunk riêng
MAX_CLAUSE_CHARS = 1500
# Trần độ dài toàn bộ `text` của 1 chunk (header + thân) để embedding không bị cắt cụt
MAX_CHUNK_CHARS = 2000
# Thân chunk tối thiểu khi header quá dài, tránh tách thành các mẩu vụn
MIN_BODY_CHARS = 500


def _iso(value: Optional[str]) -> Optional[str]:
    d = parse_vn_date(value)
    return d.isoformat() if d else None


def _text_hash(text: str) -> str:
    """sha256 của toàn văn đã chuẩn hoá khoảng trắng (dùng cho file_hash / dedup)."""
    normalized = re.sub(r"\s+", " ", text or "").strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _file_hash(rec: dict, text: str) -> tuple:
    """(hash, basis): hash toàn văn nếu có; không có text thì hash định danh nguồn để BE vẫn dedup được."""
    if text.strip():
        return _text_hash(text), "text"
    attachments = rec.get("attachments") or []
    first_url = next((a.get("url") for a in attachments if a.get("url")), "")
    key = f"{rec.get('source') or 'vbpl'}:{rec.get('doc_id') or rec.get('detail_url') or ''}:{first_url}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest(), "source_id"


def _split_body(body: str, limit: int) -> List[str]:
    """Tách thân chunk thành các phần <= limit: ưu tiên theo dòng, rồi theo câu, cuối cùng cắt cứng."""
    if len(body) <= limit:
        return [body]
    pieces: List[str] = []
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

    parts: List[str] = []
    current = ""
    for piece in pieces:
        candidate = f"{current}\n{piece}" if current else piece
        if len(candidate) <= limit:
            current = candidate
        else:
            parts.append(current)
            current = piece
    if current:
        parts.append(current)
    return parts


def _ingest_hint(rec: dict, text: str, parsed: ParsedDocument, chunks: List[dict]) -> dict:
    """Gợi ý cho BE: văn bản nào đủ sạch để tự duyệt, văn bản nào phải chờ admin."""
    reasons: List[str] = []
    if not text.strip():
        reasons.append("NO_TEXT")
    elif parsed.parse_status != "PARSED":
        reasons.append(parsed.parse_status)
    if rec.get("ocr_required") or rec.get("text_source") == "pdf_ocr":
        reasons.append("OCR_TEXT")
    if text.strip() and parsed.parse_status == "PARSED" and not chunks:
        reasons.append("NO_CHUNKS")
    return {"suggested_status": "PENDING" if reasons else "APPROVED", "pending_reasons": reasons}


def _document_number(rec: dict) -> str:
    """`legal_source.document_number` là UNIQUE; văn bản "Không số" cần khoá thay thế."""
    so_hieu = (rec.get("so_hieu") or "").strip()
    if has_document_number(so_hieu):
        return so_hieu
    return f"{rec.get('loai_van_ban')} không số ({rec.get('ngay_ban_hanh') or 'n/a'}, vbpl:{rec.get('doc_id')})"


def _doc_label(rec: dict) -> str:
    so_hieu = rec.get("so_hieu") or ""
    if has_document_number(so_hieu):
        return f"{rec.get('loai_van_ban')} {so_hieu}"
    return rec.get("tieu_de") or rec.get("loai_van_ban") or "Văn bản"


def _chunk_groups(article: Article) -> List[List[Unit]]:
    """
    Gom unit thành nhóm chunk: mỗi Khoản (kèm các Điểm) là 1 chunk; Khoản quá
    dài thì mỗi Điểm 1 chunk (phần dẫn của Khoản đi chung chunk đầu tiên).
    Đoạn mở đầu của Điều (trước Khoản 1) là 1 chunk riêng.
    """
    groups: List[List[Unit]] = []
    by_clause: dict = {}
    for unit in article.units:
        key = unit.clause or ""
        if key not in by_clause:
            by_clause[key] = []
            groups.append(by_clause[key])
        by_clause[key].append(unit)

    out: List[List[Unit]] = []
    for group in groups:
        size = sum(len(u.text) for u in group)
        has_points = any(u.point for u in group)
        if size <= MAX_CLAUSE_CHARS or not has_points:
            out.append(group)
            continue
        lead = [u for u in group if not u.point]
        points = [u for u in group if u.point]
        out.append(lead + points[:1])
        out.extend([p] for p in points[1:])
    return out


def _numbered(unit: Unit) -> str:
    """Giữ lại ký hiệu "1." / "a)" mà parser đã tách khỏi nội dung, để chunk đọc như bản gốc."""
    if unit.point:
        return f"{unit.point}) {unit.text}"
    if unit.clause:
        return f"{unit.clause}. {unit.text}"
    return unit.text


def build_chunks(rec: dict, parsed: ParsedDocument) -> List[dict]:
    label = _doc_label(rec)
    effective_from = _iso(rec.get("ngay_hieu_luc"))
    effective_to = _iso(rec.get("ngay_het_hieu_luc"))
    chunks: List[dict] = []

    for chapter in parsed.chapters:
        for article in chapter.articles:
            heading = f"Điều {article.number}" + (f". {article.title}" if article.title else "")
            groups = _chunk_groups(article) or [[]]
            for group in groups:
                clause = next((u.clause for u in group if u.clause), None)
                points = [u.point for u in group if u.point]
                # Chunk tách theo Điểm thì ghi Điểm; chunk cả Khoản thì để trống
                point = points[0] if len(points) == 1 and all(u.point for u in group) else None
                path = " · ".join(
                    p for p in (
                        f"Điều {article.number}",
                        f"Khoản {clause}" if clause else None,
                        f"Điểm {point}" if point else None,
                    ) if p
                )
                crumbs = [label]
                if chapter.number:
                    crumbs.append(f"Chương {chapter.number}" + (f". {chapter.title}" if chapter.title else ""))
                crumbs.append(heading)
                if clause:
                    crumbs.append(f"Khoản {clause}")
                header = " — ".join(crumbs)
                body = "\n".join(_numbered(u) for u in group if u.text) or article.title or ""
                limit = max(MAX_CHUNK_CHARS - len(header) - 1, MIN_BODY_CHARS)
                parts = _split_body(body, limit)
                for part_no, part in enumerate(parts, start=1):
                    text = header + "\n" + part
                    chunks.append({
                        "chunk_index": len(chunks),
                        "article": article.number,
                        "clause": clause,
                        "point": point,
                        "path": path,
                        "part": part_no,
                        "total_parts": len(parts),
                        "char_count": len(text),
                        "text": text,
                        "effective_from": effective_from,
                        "effective_to": effective_to,
                    })
    return chunks


def build_payload(rec: dict) -> dict:
    """Dựng payload ingestion cho 1 bản ghi metadata (đã qua normalize_record)."""
    text = rec.get("noi_dung_text") or ""
    source = rec.get("source") or "vbpl"
    parsed = parse_legal_text(text, consolidated=rec.get("loai_van_ban") == vbhn.DOC_TYPE)
    content = parsed.to_content_json()
    chunks = build_chunks(rec, parsed) if parsed.parse_status == "PARSED" else []
    file_hash, file_hash_basis = _file_hash(rec, text)

    return {
        "schema_version": SCHEMA_VERSION,
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "legal_source": {
            "document_number": _document_number(rec),
            "doc_type": rec.get("loai_van_ban"),
            "issuing_authority": rec.get("co_quan_ban_hanh"),
            "title": rec.get("tieu_de"),
            "metadata": {
                "source": source,
                "source_doc_id": rec.get("doc_id"),
                "detail_url": rec.get("detail_url"),
                "has_document_number": has_document_number(rec.get("so_hieu")),
                # Vì sao văn bản được lấy (chế độ --keywords-file) - giúp người duyệt lọc nhanh
                "matched_keywords": rec.get("matched_keywords") or [],
                "keyword_groups": rec.get("keyword_groups") or [],
                # Set when fetched only via a "Lược đồ" relation; the full list stays in metadata.json
                "related_from": rec.get("related_from"),
                # VBHN that merged this document; vbhn_outdated = amendments it does not merge yet
                "vbhn": rec.get("vbhn") or [],
                **vbhn.vbhn_status(rec.get("doc_id"), rec.get("relations"), rec.get("vbhn")),
            },
        },
        "knowledge_document": {
            "source": SOURCE_CODES.get(source, f"CRAWL_{source.upper()}"),
            "file_hash": file_hash,
            "file_hash_basis": file_hash_basis,
            "issued_date": _iso(rec.get("ngay_ban_hanh")),
            "effective_from": _iso(rec.get("ngay_hieu_luc")),
            "effective_to": _iso(rec.get("ngay_het_hieu_luc")),
            "content_json": content,
            "ingest": _ingest_hint(rec, text, parsed, chunks),
            "metadata": {
                "tinh_trang_hieu_luc": rec.get("tinh_trang_hieu_luc"),
                "text_source": rec.get("text_source"),
                "ocr_required": rec.get("ocr_required", False),
                "scraped_at": rec.get("scraped_at"),
                "attachments": rec.get("attachments") or [],
                # VBHN: vbpl gives no effective date; the text applies from its latest merged amendment
                **({"vbhn_effective_from": vbhn.latest_effective_date(parsed.footnotes)}
                   if parsed.consolidated else {}),
            },
        },
        "chunks": chunks,
    }


def _md_paragraphs(text: str) -> str:
    """Markdown gộp các dòng liền nhau thành 1 đoạn -> mỗi dòng gốc thành 1 đoạn riêng."""
    return "\n\n".join(line.strip() for line in (text or "").splitlines() if line.strip())


def _md_title(number: str, title: str) -> str:
    title = (title or "").strip().lstrip(":.-– ").strip()
    return f"{number}. {title}" if title else number


def _md_unit(unit: dict) -> str:
    text = _md_paragraphs(unit["text"])
    if unit["point"]:
        return f"{unit['point']}) {text}"
    if unit["clause"]:
        return f"**{unit['clause']}.** {text}"
    return text


def render_markdown(rec: dict, payload: dict) -> str:
    """
    Bản đọc cho người (review, đưa vào NotebookLM...): metadata ở đầu, rồi Chương/Điều/Khoản
    theo `content_json`. Văn bản không tách được Điều thì in nguyên toàn văn.
    """
    src = payload["legal_source"]
    kd = payload["knowledge_document"]
    content = kd["content_json"]
    title = src.get("title") or src["document_number"]

    meta_rows = [
        ("Số hiệu", src["document_number"]),
        ("Loại văn bản", src.get("doc_type")),
        ("Cơ quan ban hành", src.get("issuing_authority")),
        ("Ngày ban hành", kd.get("issued_date")),
        ("Hiệu lực từ", kd.get("effective_from")),
        ("Hết hiệu lực", kd.get("effective_to")),
        ("Tình trạng", kd["metadata"].get("tinh_trang_hieu_luc")),
        ("Nguồn", src["metadata"].get("detail_url") or src["metadata"].get("source")),
    ]
    lines = [f"# {title}", "", "| Trường | Giá trị |", "| --- | --- |"]
    lines += [f"| {k} | {str(v).replace('|', '/')} |" for k, v in meta_rows if v]
    lines.append("")

    if content["parse_status"] != "PARSED":
        lines += ["> Chưa tách được Điều/Khoản — dưới đây là toàn văn.", "", _md_paragraphs(rec.get("noi_dung_text"))]
        return "\n".join(lines).rstrip() + "\n"

    if content["preamble"]:
        lines += [_md_paragraphs(content["preamble"]), ""]

    current_part = None
    for chapter in content["chapters"]:
        if chapter["part"] and chapter["part"] != current_part:
            current_part = chapter["part"]
            lines += [f"## Phần {current_part}", ""]
        if chapter["number"]:
            lines += [f"## {_md_title('Chương ' + chapter['number'], chapter['title'])}", ""]
        current_section = None
        for article in chapter["articles"]:
            if article["section"] and article["section"] != current_section:
                current_section = article["section"]
                lines += [f"#### Mục {current_section}", ""]
            lines += [f"### {_md_title('Điều ' + article['number'], article['title'])}", ""]
            for unit in article["units"]:
                if unit["text"]:
                    lines += [_md_unit(unit), ""]

    if content["closing"]:
        lines += ["---", "", _md_paragraphs(content["closing"]), ""]
    for appendix in content["appendices"]:
        lines += [f"## {appendix['title']}", "", _md_paragraphs(appendix["text"]), ""]
    return "\n".join(lines).rstrip() + "\n"


EXPORT_FORMATS = ("json", "md")


def parse_export_format(value: str) -> tuple:
    """'json' | 'md' | 'both' (hoặc 'json,md') -> tuple định dạng cần xuất."""
    value = (value or "json").strip().lower()
    if value == "both":
        return EXPORT_FORMATS
    formats = tuple(f.strip() for f in value.split(",") if f.strip())
    unknown = [f for f in formats if f not in EXPORT_FORMATS]
    if unknown or not formats:
        raise ValueError(f"Định dạng export không hợp lệ: {value!r} (chọn json, md hoặc both)")
    return formats


def export_records(records: List[dict], formats: tuple = ("json",)) -> List[dict]:
    """Ghi payload JSON và/hoặc bản Markdown cho từng bản ghi + manifest.json; trả về danh sách mục manifest."""
    export_dir = get_export_dir()
    manifest: List[dict] = []
    for rec in records:
        payload = build_payload(rec)
        folder = config.get_folder_name(rec.get("loai_van_ban") or "")
        slug = slugify(rec.get("so_hieu") or rec.get("doc_id") or "unknown", separator="-")
        if not has_document_number(rec.get("so_hieu")) and rec.get("doc_id"):
            slug = f"{slug}-{str(rec['doc_id'])[:8]}"
        base = config.source_dir(export_dir, rec.get("source")) / folder / slug
        base.parent.mkdir(parents=True, exist_ok=True)
        written = {}
        if "json" in formats:
            dest = base.with_suffix(".json")
            dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            written["file"] = dest
        if "md" in formats:
            dest = base.with_suffix(".md")
            dest.write_text(render_markdown(rec, payload), encoding="utf-8")
            written["md_file"] = dest
        dest = written.get("file") or written["md_file"]

        content = payload["knowledge_document"]["content_json"]
        n_unit_warnings = sum(
            1 for c in content["chapters"] for a in c["articles"] for u in a["units"] if u["status"] == "WARNING"
        )
        entry = {
            **{k: str(p.relative_to(export_dir)).replace("\\", "/") for k, p in written.items()},
            "document_number": payload["legal_source"]["document_number"],
            "source": rec.get("source") or "vbpl",
            "text_source": rec.get("text_source"),
            "doc_type": rec.get("loai_van_ban"),
            "parse_status": content["parse_status"],
            "articles": sum(len(c["articles"]) for c in content["chapters"]),
            "chunks": len(payload["chunks"]),
            "suggested_status": payload["knowledge_document"]["ingest"]["suggested_status"],
            "warnings": content["warnings"],
            "unit_warnings": n_unit_warnings,
        }
        manifest.append(entry)
        log = logger.warning if entry["parse_status"] != "PARSED" else logger.info
        log(
            f"[{entry['document_number']}] {entry['parse_status']}: "
            f"{entry['articles']} Điều, {entry['chunks']} chunk -> {dest}"
        )

    export_dir.mkdir(parents=True, exist_ok=True)
    (export_dir / "manifest.json").write_text(
        json.dumps(
            {"schema_version": SCHEMA_VERSION, "generated_at": datetime.now().isoformat(timespec="seconds"),
             "documents": manifest},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return manifest
