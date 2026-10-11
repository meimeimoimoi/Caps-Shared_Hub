"""
src/exporter.py
===============
Xuất mỗi văn bản thành 1 payload JSON khớp schema `knowledge` của
Caps-Shared_Hub (BE/ingestion/Entities: LegalSource, KnowledgeDocument, KbChunk).

    data/export/<loai_van_ban>/<so-hieu-slug>.json
    data/export/manifest.json      (tóm tắt mọi file đã xuất)

Đây chính là body sẽ POST lên API ingestion ở bước tích hợp sau.
"""

import hashlib
import json
import re
from datetime import datetime
from typing import List, Optional

from slugify import slugify

import config
from src.legal_parser import Article, ParsedDocument, Unit, parse_legal_text
from src.logger_setup import setup_logger
from src.normalize import has_document_number, parse_vn_date

logger = setup_logger(__name__, config.LOG_DIR)

SCHEMA_VERSION = 1


def get_export_dir():
    """Resolve lazily because DATA_DIR changes when a crawl run is activated."""
    return config.DATA_DIR / "export"


# Giá trị `knowledge_document.source` theo nguồn cào. Lưu ý: ràng buộc ck_kd_source
# trong BE/SHFT_PostgreSQL.sql hiện chỉ cho CRAWL_VBPL/MANUAL_UPLOAD -> cần thêm CRAWL_MOF.
SOURCE_CODES = {"vbpl": "CRAWL_VBPL", "mof": "CRAWL_MOF"}
# Khoản dài hơn ngưỡng này thì tách mỗi Điểm thành 1 chunk riêng
MAX_CLAUSE_CHARS = 1500


def _iso(value: Optional[str]) -> Optional[str]:
    d = parse_vn_date(value)
    return d.isoformat() if d else None


def _text_hash(text: str) -> str:
    """sha256 của toàn văn đã chuẩn hoá khoảng trắng (dùng cho file_hash / dedup)."""
    normalized = re.sub(r"\s+", " ", text or "").strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


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
                body = "\n".join(_numbered(u) for u in group if u.text) or article.title
                chunks.append({
                    "chunk_index": len(chunks),
                    "article": article.number,
                    "clause": clause,
                    "point": point,
                    "path": path,
                    "text": " — ".join(crumbs) + "\n" + body,
                    "effective_from": effective_from,
                    "effective_to": effective_to,
                })
    return chunks


def build_payload(rec: dict) -> dict:
    """Dựng payload ingestion cho 1 bản ghi metadata (đã qua normalize_record)."""
    text = rec.get("noi_dung_text") or ""
    source = rec.get("source") or "vbpl"
    parsed = parse_legal_text(text)
    content = parsed.to_content_json()
    chunks = build_chunks(rec, parsed) if parsed.parse_status == "PARSED" else []

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
            },
        },
        "knowledge_document": {
            "source": SOURCE_CODES.get(source, f"CRAWL_{source.upper()}"),
            "file_hash": _text_hash(text) if text else None,
            "issued_date": _iso(rec.get("ngay_ban_hanh")),
            "effective_from": _iso(rec.get("ngay_hieu_luc")),
            "effective_to": _iso(rec.get("ngay_het_hieu_luc")),
            "content_json": content,
            "metadata": {
                "tinh_trang_hieu_luc": rec.get("tinh_trang_hieu_luc"),
                "text_source": rec.get("text_source"),
                "ocr_required": rec.get("ocr_required", False),
                "scraped_at": rec.get("scraped_at"),
                "attachments": rec.get("attachments") or [],
            },
        },
        "chunks": chunks,
    }


def export_records(records: List[dict]) -> List[dict]:
    """Ghi payload cho từng bản ghi + manifest.json; trả về danh sách mục manifest."""
    export_dir = get_export_dir()
    manifest: List[dict] = []
    for rec in records:
        payload = build_payload(rec)
        folder = config.get_folder_name(rec.get("loai_van_ban") or "")
        slug = slugify(rec.get("so_hieu") or rec.get("doc_id") or "unknown", separator="-")
        if not has_document_number(rec.get("so_hieu")) and rec.get("doc_id"):
            slug = f"{slug}-{str(rec['doc_id'])[:8]}"
        dest = config.source_dir(export_dir, rec.get("source")) / folder / f"{slug}.json"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        content = payload["knowledge_document"]["content_json"]
        n_unit_warnings = sum(
            1 for c in content["chapters"] for a in c["articles"] for u in a["units"] if u["status"] == "WARNING"
        )
        entry = {
            "file": str(dest.relative_to(export_dir)).replace("\\", "/"),
            "document_number": payload["legal_source"]["document_number"],
            "source": rec.get("source") or "vbpl",
            "text_source": rec.get("text_source"),
            "doc_type": rec.get("loai_van_ban"),
            "parse_status": content["parse_status"],
            "articles": sum(len(c["articles"]) for c in content["chapters"]),
            "chunks": len(payload["chunks"]),
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
