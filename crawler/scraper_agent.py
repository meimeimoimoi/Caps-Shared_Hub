#!/usr/bin/env python3
"""
scraper_agent.py
=================
ĐIỂM VÀO CHÍNH (CLI) của VBPL Scraper Agent.

Chạy toàn bộ pipeline: Search + Download (tích hợp) -> Detail -> Download -> Extract Text -> Save Metadata

CÁCH DÙNG:
    python scraper_agent.py \
        --keyword "thuế thu nhập doanh nghiệp" \
        --doc-types "Nghị định,Thông tư,Luật,Quyết định" \
        --top-n 3 \
        --headless true

    # Chạy nhanh thử nghiệm với 1 loại, 1 văn bản trước khi chạy full:
    python scraper_agent.py --doc-types "Thông tư" --top-n 1 --headless false

XEM THÊM: PLAN.md để hiểu chi tiết pipeline và cách xử lý khi selector lỗi thời.
"""

import argparse
import json
import sys
from typing import Dict, List, Optional, Set

from tqdm import tqdm

import config
from src.search_client import search_and_download_all_types
from src.detail_scraper import scrape_document_detail
from src.exporter import export_records, get_export_dir, parse_export_format
from src.keywords import KeywordPlan, KeywordSearch, load_keyword_plan
from src.models import LegalDocument
from src.mof_client import collect_mof_documents
from src.normalize import doc_number_key
from src.storage import (
    ensure_document_text,
    load_all_runs_records,
    load_existing_metadata,
    purge_invalid_metadata,
    save_metadata,
    save_text_file,
    write_metadata_records,
)
from src.logger_setup import setup_logger

logger = setup_logger("scraper_agent", config.LOG_DIR)


def parse_args():
    parser = argparse.ArgumentParser(
        description="VBPL Scraper Agent - Cào văn bản pháp luật về Thuế TNDN từ vbpl.vn"
    )
    parser.add_argument(
        "--keyword",
        type=str,
        default=config.KEYWORD,
        help=f"Từ khóa tìm kiếm (mặc định: '{config.KEYWORD}')",
    )
    parser.add_argument(
        "--doc-types",
        type=str,
        default=None,
        help=(
            "Danh sách loại văn bản cần lấy, cách nhau bởi dấu phẩy. "
            f"Mặc định: '{','.join(config.DOCUMENT_TYPES)}' "
            "(với --keywords-file: lấy theo file từ khoá)"
        ),
    )
    parser.add_argument(
        "--keywords-file",
        type=str,
        default=None,
        help=(
            "Cào theo bộ từ khoá TOML (vd keywords/thue_tndn.toml): mỗi từ khoá cào HẾT "
            "kết quả, chỉ giữ văn bản có tên khớp; thay cho --keyword/--top-n."
        ),
    )
    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Với --keywords-file: cào lại cả văn bản đã có ở các lượt trước (mặc định bỏ qua)",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=config.TOP_N,
        help=f"Số văn bản gần nhất mỗi loại (mặc định: {config.TOP_N})",
    )
    parser.add_argument(
        "--all",
        dest="crawl_all",
        action="store_true",
        help="Cào toàn bộ kết quả liên quan, đi đến trang cuối (dùng để khởi tạo kho dữ liệu).",
    )
    parser.add_argument(
        "--count-only",
        action="store_true",
        help=(
            "Chỉ đếm toàn bộ kết quả và tài liệu trùng giữa các nguồn; "
            "không tải hoặc lưu dữ liệu crawler."
        ),
    )
    parser.add_argument(
        "--headless",
        type=str,
        default=str(config.HEADLESS).lower(),
        choices=["true", "false"],
        help="Chạy trình duyệt ẩn (true) hay hiện cửa sổ để debug (false)",
    )
    parser.add_argument(
        "--purge-invalid",
        action="store_true",
        help=(
            "Xoá các bản ghi cũ trong metadata.json không có doc_id/URL/text/file "
            "(bản ghi 'URL_NOT_FOUND' từ các lần chạy trước) rồi dừng chương trình."
        ),
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Chỉ lấy metadata + text HTML, KHÔNG tải file PDF/DOC (chạy nhanh hơn để test)",
    )
    parser.add_argument(
        "--export-only",
        action="store_true",
        help=(
            "Không cào: chuẩn hoá lại metadata.json hiện có (số hiệu, file đính kèm), "
            "tách Điều/Khoản và tạo chunk vào data/export/ cho toàn bộ văn bản."
        ),
    )
    parser.add_argument(
        "--reparse-only",
        action="store_true",
        help="Giống --export-only (tên cũ, giữ để tương thích)",
    )
    parser.add_argument(
        "--export",
        action="store_true",
        help="Cào xong thì tách Điều/Khoản + tạo chunk luôn (mặc định chỉ cào)",
    )
    parser.add_argument(
        "--export-format",
        type=str,
        default="json",
        help=(
            "Định dạng cho --export/--export-only: json (payload cho BE ingestion), "
            "md (bản Markdown để đọc/review) hoặc both. Mặc định: json"
        ),
    )
    parser.add_argument(
        "--sources",
        type=str,
        default=",".join(config.DEFAULT_SOURCES),
        help=(
            "Nguồn cào, cách nhau bởi dấu phẩy: vbpl (vbpl.vn), mof (vbpq.mof.gov.vn - "
            f"Bộ Tài chính). Mặc định: '{','.join(config.DEFAULT_SOURCES)}'"
        ),
    )
    parser.add_argument(
        "--no-ocr",
        action="store_true",
        help="Không OCR PDF scan (chỉ đánh dấu ocr_required) - chạy nhanh hơn",
    )
    parser.add_argument(
        "--run-dir",
        type=str,
        default=None,
        help="Thư mục lượt cào cũ cho --export-only/--purge-invalid; mặc định chọn lượt mới nhất.",
    )
    return parser.parse_args()


def run_export_only(formats=("json",)):
    records = load_existing_metadata()
    if not records:
        logger.error(f"Không có dữ liệu trong {config.METADATA_FILE}. Hãy cào trước.")
        return
    normalized = write_metadata_records(list(records.values()))
    logger.info(f"Đã chuẩn hoá {len(normalized)} bản ghi trong {config.METADATA_FILE}")
    manifest = export_records(normalized, formats)
    _log_export_summary(manifest)


def _log_export_summary(manifest):
    failed = [m for m in manifest if m["parse_status"] != "PARSED"]
    logger.info(
        f"Đã xuất {len(manifest)} văn bản ({sum(m['chunks'] for m in manifest)} chunk) "
        f"vào {get_export_dir()}; {len(failed)} văn bản không tách được Điều."
    )
    for m in manifest:
        if m["warnings"] or m["unit_warnings"]:
            logger.warning(
                f"  [{m['document_number']}] {len(m['warnings'])} cảnh báo văn bản, "
                f"{m['unit_warnings']} đơn vị cần duyệt lại"
            )


def build_count_report(vbpl_docs: List[LegalDocument], mof_docs: List[LegalDocument]) -> dict:
    """Count cross-source duplicates by normalized document number, not full text."""
    vbpl_numbers = {doc_number_key(doc.so_hieu) for doc in vbpl_docs}
    vbpl_numbers.discard(None)
    duplicates = [
        doc for doc in mof_docs
        if doc_number_key(doc.so_hieu) in vbpl_numbers
    ]
    duplicate_numbers = sorted({doc.so_hieu for doc in duplicates})
    return {
        "vbpl": len(vbpl_docs),
        "mof": len(mof_docs),
        "mof_duplicates": len(duplicates),
        "duplicate_numbers": duplicate_numbers,
        "metadata_total": len(vbpl_docs) + len(mof_docs) - len(duplicates),
    }


def run_count_only(keyword: str, doc_types: List[str], headless: bool, sources: List[str]) -> dict:
    """Inventory all matching listings without visiting details or writing crawl artifacts."""
    vbpl_docs: List[LegalDocument] = []
    mof_docs: List[LegalDocument] = []

    if "vbpl" in sources:
        items = search_and_download_all_types(
            keyword=keyword,
            doc_types=doc_types,
            top_n=None,
            headless=headless,
            skip_download=True,
            listing_only=True,
            save_debug=False,
        )
        vbpl_docs = [scrape_document_detail(item) for item in items]

    if "mof" in sources:
        mof_docs = collect_mof_documents(
            keyword,
            doc_types,
            top_n=None,
            skip_download=True,
            known_numbers=set(),
        )

    report = build_count_report(vbpl_docs, mof_docs)
    print("\n" + "=" * 70)
    print("THỐNG KÊ TOÀN BỘ DỮ LIỆU LIÊN QUAN")
    print("=" * 70)
    print(f"Nguồn VBPL                         : {report['vbpl']} tài liệu")
    print(f"Nguồn MOF                          : {report['mof']} tài liệu")
    print(f"MOF trùng với VBPL                 : {report['mof_duplicates']} tài liệu")
    print("Tiêu chí trùng                     : cùng số hiệu văn bản sau chuẩn hóa")
    print("Không so trùng                     : nội dung toàn văn / tiêu đề / file hash")
    print(f"Dự kiến lưu vào metadata           : {report['metadata_total']} tài liệu")
    if report["duplicate_numbers"]:
        print("Các số hiệu trùng:")
        for number in report["duplicate_numbers"]:
            print(f"  - {number}")
    print("\nChế độ đếm: không tạo metadata, raw_html, PDF, text hoặc export.")
    return report


def _new_stats() -> dict:
    return {"listed": 0, "matched": 0, "skipped_ids": []}


def _previous_state(skip_existing: bool):
    """doc_id đã cào theo nguồn + số hiệu vbpl đã có, gom từ MỌI lượt cào trước."""
    done_ids: Dict[str, Set[str]] = {"vbpl": set(), "mof": set()}
    vbpl_numbers: Set[str] = set()
    if not skip_existing:
        return done_ids, vbpl_numbers
    for rec in load_all_runs_records().values():
        source = rec.get("source") or "vbpl"
        if rec.get("doc_id"):
            done_ids.setdefault(source, set()).add(str(rec["doc_id"]))
        if source == "vbpl":
            key = doc_number_key(rec.get("so_hieu"))
            if key:
                vbpl_numbers.add(key)
    return done_ids, vbpl_numbers


def _retag(collected: Dict[str, LegalDocument], source: str, ids: List[str],
           search: KeywordSearch) -> List[LegalDocument]:
    """Văn bản đã lấy ở từ khoá trước trong lượt này -> ghi thêm từ khoá vừa khớp."""
    touched = []
    for doc in collected.values():
        if doc.source == source and doc.doc_id in ids:
            doc.add_keyword(search.term, search.group)
            touched.append(doc)
    return touched


def run_keyword_pipeline(
    plan: KeywordPlan,
    sources: List[str],
    headless: bool,
    skip_download: bool = False,
    export: bool = False,
    skip_existing: bool = True,
    count_only: bool = False,
    export_formats: tuple = ("json",),
) -> List[dict]:
    """
    Cào theo bộ từ khoá: mỗi từ khoá đi hết các trang kết quả của từng nguồn, chỉ giữ
    văn bản có tên khớp, bỏ văn bản đã có (lượt này + lượt trước) và lưu metadata.json
    sau MỖI từ khoá để bị ngắt giữa chừng thì chạy lại là tiếp tục được.
    """
    done_ids, vbpl_numbers = _previous_state(skip_existing and not count_only)
    n_previous = sum(len(v) for v in done_ids.values())
    collected: Dict[str, LegalDocument] = {}
    report: List[dict] = []

    logger.info("=" * 70)
    logger.info(f"CAO THEO BO TU KHOA: {plan.path} ({len(plan.searches)} luot tim, nhom {plan.groups})")
    logger.info(f"Nguon: {sources} | Bo qua {n_previous} van ban da co | Dem: {count_only}")
    logger.info("=" * 70)

    for i, search in enumerate(plan.searches, 1):
        logger.info(f"\n### [{i}/{len(plan.searches)}] {search.label} | {', '.join(search.doc_types)} ###\n")
        row = {"keyword": search.term, "group": search.group}
        fresh: List[LegalDocument] = []
        touched: List[LegalDocument] = []

        if "vbpl" in sources:
            st = _new_stats()
            items = search_and_download_all_types(
                keyword=search.term,
                doc_types=list(search.doc_types),
                top_n=None,
                headless=headless,
                skip_download=skip_download or count_only,
                listing_only=count_only,
                save_debug=False,
                item_filter=search.matches,
                skip_ids=done_ids["vbpl"],
                stats=st,
            )
            n_new = 0
            for item in items:
                doc = scrape_document_detail(item)
                # Tên trong payload hỏng encoding -> kiểm lại bằng tiêu đề trang chi tiết
                if (item.api_item or {}).get("_title_uncertain") and search.matches(doc.tieu_de, doc.so_hieu) is False:
                    logger.info(f"  [LOC] Bo {doc.so_hieu}: tieu de khong khop '{search.term}'")
                    continue
                if not count_only:
                    ensure_document_text(doc)
                doc.add_keyword(search.term, search.group)
                collected[doc.unique_key] = doc
                done_ids["vbpl"].add(doc.doc_id)
                key = doc_number_key(doc.so_hieu)
                if key:
                    vbpl_numbers.add(key)
                fresh.append(doc)
                n_new += 1
            touched += _retag(collected, "vbpl", st["skipped_ids"], search)
            row["vbpl"] = {"listed": st["listed"], "matched": st["matched"],
                           "new": n_new, "already": len(st["skipped_ids"])}

        if "mof" in sources:
            st = _new_stats()
            docs = collect_mof_documents(
                search.term,
                list(search.doc_types),
                top_n=None,
                skip_download=skip_download or count_only,
                known_numbers=set(vbpl_numbers),
                item_filter=search.matches,
                skip_ids=done_ids["mof"],
                stats=st,
            )
            for doc in docs:
                if not count_only:
                    ensure_document_text(doc)
                doc.add_keyword(search.term, search.group)
                collected[doc.unique_key] = doc
                done_ids["mof"].add(doc.doc_id)
                fresh.append(doc)
            touched += _retag(collected, "mof", st["skipped_ids"], search)
            row["mof"] = {"listed": st["listed"], "matched": st["matched"],
                          "new": len(docs), "already": len(st["skipped_ids"])}

        # Checkpoint sau mỗi từ khoá
        if not count_only and (fresh or touched):
            for doc in fresh:
                save_text_file(doc)
            save_metadata(fresh + [d for d in touched if d not in fresh])
        report.append(row)

    _log_keyword_report(report, count_only)
    if count_only:
        return report

    (config.DATA_DIR / "keyword_report.json").write_text(
        json.dumps({"keywords_file": str(plan.path), "sources": sources, "searches": report},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    logger.info(f"Bao cao tu khoa: {config.DATA_DIR / 'keyword_report.json'}")
    logger.info(f"Metadata luu tai: {config.METADATA_FILE} ({len(collected)} van ban moi)")

    if export and collected:
        saved = load_existing_metadata()
        manifest = export_records([rec for key, rec in saved.items() if key in collected], export_formats)
        _log_export_summary(manifest)
    elif collected:
        logger.info('Chạy "python scraper_agent.py --export-only" để tách Điều/Khoản và tạo chunk.')
    return report


def _log_keyword_report(report: List[dict], count_only: bool) -> None:
    lines = ["", "=" * 70, "KET QUA THEO TU KHOA (listed = ket qua dung loai, matched = ten khop)", "=" * 70]
    for row in report:
        parts = []
        for source in ("vbpl", "mof"):
            s = row.get(source)
            if s:
                parts.append(f"{source}: {s['listed']} listed / {s['matched']} matched / "
                             f"{s['new']} {'tim thay' if count_only else 'moi'} / {s['already']} da co")
        lines.append(f"[{row['group']}] {row['keyword']}: " + " | ".join(parts))
    total_new = sum(row.get(s, {}).get("new", 0) for row in report for s in ("vbpl", "mof"))
    lines.append(f"TONG: {total_new} van ban {'khop (chua tru trung giua cac tu khoa)' if count_only else 'moi'}")
    for line in lines:
        logger.info(line)


def collect_vbpl_documents(
    keyword: str, doc_types: List[str], top_n: Optional[int], headless: bool, skip_download: bool
) -> List[LegalDocument]:
    # --- TIM KIEM + VAO TRANG CHI TIET + TAI FILE (1 browser session) ---
    # Với mỗi kết quả: bắt payload server action -> lấy doc_id -> dựng URL
    #                   -> page.goto(URL) -> đọc toàn văn -> tải file ở tab "Tải về"
    logger.info("\n### [vbpl.vn] TIM KIEM + TAI FILE (TICH HOP) ###\n")
    search_results = search_and_download_all_types(
        keyword    = keyword,
        doc_types  = doc_types,
        top_n      = top_n,
        headless   = headless,
        skip_download = skip_download,
    )

    if not search_results:
        logger.error(
            "[vbpl.vn] KHONG tim thay van ban nao. "
            "Chay `python inspect_site.py` de kiem tra lai selector."
        )
        return []

    # --- DUNG METADATA CHI TIET (tu du lieu da bat san trong browser) ---
    # Không gọi lại mạng: search_client đã bắt sẵn api_item / api_detail / full_text /
    # danh sách file đã tải. Ở đây chỉ map + bổ sung text từ PDF nếu cần.
    logger.info(f"\n### [vbpl.vn] DUNG METADATA CHI TIET {len(search_results)} VAN BAN ###\n")
    documents = []
    for item in tqdm(search_results, desc="Dung metadata chi tiet"):
        doc = scrape_document_detail(item)

        # Bảo đảm có text: ưu tiên text từ trang web, nếu không có thì trích từ PDF
        doc = ensure_document_text(doc)

        documents.append(doc)
    return documents


def vbpl_document_numbers(vbpl_docs: List[LegalDocument]) -> Set[str]:
    """Số hiệu (đã chuẩn hoá) của văn bản vbpl.vn: lần chạy này + đã có trong metadata.json."""
    so_hieu_list = [d.so_hieu for d in vbpl_docs]
    so_hieu_list += [
        rec.get("so_hieu") for rec in load_existing_metadata().values()
        if (rec.get("source") or "vbpl") == "vbpl"
    ]
    return {k for k in map(doc_number_key, so_hieu_list) if k}


def collect_mof(
    keyword: str, doc_types: List[str], top_n: Optional[int], skip_download: bool,
    known_numbers: Set[str] = None,
) -> List[LegalDocument]:
    # API JSON của vbpq.mof.gov.vn; toàn văn chỉ có trong PDF (thường là bản scan -> OCR)
    logger.info("\n### [vbpq.mof.gov.vn] TIM KIEM + TAI FILE ###\n")
    if known_numbers:
        logger.info(f"Bo qua van ban mof trung so hieu voi {len(known_numbers)} van ban vbpl.vn")
    documents = collect_mof_documents(
        keyword, doc_types, top_n, skip_download=skip_download, known_numbers=known_numbers
    )
    for doc in tqdm(documents, desc="Trich text / OCR"):
        ensure_document_text(doc)
    return documents


def run_pipeline(
    keyword: str,
    doc_types: List[str],
    top_n: Optional[int],
    headless: bool,
    skip_download: bool = False,
    export: bool = False,
    sources: List[str] = None,
    export_formats: tuple = ("json",),
):
    sources = sources or list(config.DEFAULT_SOURCES)
    logger.info("=" * 70)
    logger.info("BAT DAU VBPL SCRAPER AGENT")
    logger.info(f"Nguon         : {sources}")
    logger.info(f"Tu khoa       : {keyword}")
    logger.info(f"Loai van ban  : {doc_types}")
    logger.info(f"Pham vi       : {'toan bo ket qua' if top_n is None else f'top {top_n} moi loai'}")
    logger.info(f"Headless mode : {headless}")
    logger.info(f"OCR           : {config.OCR_ENABLED}")
    logger.info("=" * 70)

    # Thứ tự cố định: vbpl.vn trước -> mof bỏ các văn bản trùng số hiệu với vbpl -> mới ghi metadata
    documents: List[LegalDocument] = []
    if "vbpl" in sources:
        documents += collect_vbpl_documents(keyword, doc_types, top_n, headless, skip_download)
    if "mof" in sources:
        known = vbpl_document_numbers(documents)
        documents += collect_mof(keyword, doc_types, top_n, skip_download, known_numbers=known)

    if not documents:
        logger.error("KHONG co van ban nao tu cac nguon da chon. Dung pipeline.")
        return

    # --- LUU METADATA ---
    logger.info(f"\n### GIAI DOAN 3/3: LUU METADATA ###\n")
    for doc in tqdm(documents, desc="Luu text + metadata"):
        save_text_file(doc)

    save_metadata(documents)

    # --- TACH DIEU/KHOAN + XUAT PAYLOAD CHO CAPS-SHARED_HUB ---
    if export:
        # Đọc lại từ metadata.json để dùng bản đã chuẩn hoá (số hiệu, file đính kèm)
        saved = load_existing_metadata()
        keys = {doc.unique_key for doc in documents}
        manifest = export_records([rec for key, rec in saved.items() if key in keys], export_formats)
        _log_export_summary(manifest)
    else:
        logger.info(
            'Chưa tách Điều/Khoản. Chạy "python scraper_agent.py --export-only" '
            "để tạo chunk vào data/export/"
        )

    # --- TOM TAT KET QUA ---
    logger.info("\n" + "=" * 70)
    logger.info("TOM TAT KET QUA")
    logger.info("=" * 70)

    by_type = {}
    for doc in documents:
        by_type.setdefault(doc.loai_van_ban, []).append(doc)

    for doc_type, docs in by_type.items():
        logger.info(f"\n[{doc_type}] - {len(docs)} van ban:")
        for doc in docs:
            n_dl = sum(1 for a in doc.attachments if a.downloaded)
            n_txt = len(doc.noi_dung_text or "")
            status = [f"{n_dl}/{len(doc.attachments)} file", f"text {n_txt:,} chu"]
            if n_dl == 0:
                status.append("CHUA CO FILE")
            if doc.ocr_required:
                status.append("CAN OCR")
            if doc.error:
                status.append(f"loi: {doc.error}")
            if doc.text_source == "pdf_ocr":
                status.append("OCR")
            logger.info(f"  - [{doc.source}] {doc.so_hieu} | {' | '.join(status)} | {doc.tieu_de[:60]}")
            # In rõ URL đã lưu để đối chiếu với yêu cầu "URL tool đã nhập"
            logger.info(f"      doc_id : {doc.doc_id} ({doc.doc_id_type})")
            logger.info(f"      URL    : {doc.detail_url}")

    n_docs = len(documents)
    n_with_url = sum(1 for d in documents if d.detail_url and "URL_NOT_FOUND" not in d.detail_url)
    n_with_id = sum(1 for d in documents if d.doc_id)
    n_files = sum(1 for d in documents for a in d.attachments if a.downloaded)

    logger.info("\n" + "=" * 70)
    logger.info("KIEM TRA YEU CAU")
    logger.info(f"  Van ban co doc_id      : {n_with_id}/{n_docs}")
    logger.info(f"  Van ban co URL that    : {n_with_url}/{n_docs}")
    logger.info(f"  Tong file da tai       : {n_files}")
    logger.info("=" * 70)

    logger.info(f"\nMetadata luu tai: {config.METADATA_FILE}")
    logger.info(f"File PDF/DOC tai : {config.PDF_DIR}")


def main():
    args = parse_args()
    explicit_types = [d.strip() for d in (args.doc_types or "").split(",") if d.strip()]
    doc_types = explicit_types or list(config.DOCUMENT_TYPES)
    headless = args.headless.lower() == "true"
    sources = [s.strip().lower() for s in args.sources.split(",") if s.strip()]
    unknown = [s for s in sources if s not in ("vbpl", "mof")]
    if unknown:
        print(f"Nguồn không hỗ trợ: {unknown}. Dùng: vbpl, mof")
        sys.exit(2)

    plan = None
    if args.keywords_file:
        try:
            plan = load_keyword_plan(args.keywords_file, doc_types_override=explicit_types or None)
        except (OSError, ValueError) as exc:
            print(f"Không đọc được file từ khoá: {exc}")
            sys.exit(2)
        if not plan.searches:
            print(f"File từ khoá {args.keywords_file} không có từ khoá nào đang bật.")
            sys.exit(2)

    if args.count_only and plan is not None:
        try:
            run_keyword_pipeline(plan, sources, headless, count_only=True)
            return
        except KeyboardInterrupt:
            logger.warning("Đã dừng bởi người dùng (Ctrl+C).")
            sys.exit(1)

    if args.count_only:
        try:
            run_count_only(args.keyword, doc_types, headless, sources)
            return
        except KeyboardInterrupt:
            logger.warning("Đã dừng bởi người dùng (Ctrl+C).")
            sys.exit(1)
        except Exception as exc:
            logger.error(f"Lỗi khi đếm dữ liệu: {exc}", exc_info=True)
            sys.exit(1)

    try:
        export_formats = parse_export_format(args.export_format)
    except ValueError as exc:
        logger.error(str(exc))
        sys.exit(2)

    if args.purge_invalid or args.export_only or args.reparse_only:
        try:
            config.select_run(args.run_dir)
        except FileNotFoundError as exc:
            logger.error(str(exc))
            sys.exit(2)
    else:
        config.start_new_run()
        logger.info(f"Lượt cào mới: {config.DATA_DIR}")

    if args.purge_invalid:
        n = purge_invalid_metadata()
        print(f"Đã xoá {n} bản ghi không hợp lệ khỏi {config.METADATA_FILE}")
        return

    if args.export_only or args.reparse_only:
        run_export_only(export_formats)
        return

    if args.no_ocr:
        config.OCR_ENABLED = False

    if plan is not None:
        try:
            run_keyword_pipeline(
                plan, sources, headless,
                skip_download=args.skip_download,
                export=args.export,
                skip_existing=not args.no_skip_existing,
                export_formats=export_formats,
            )
        except KeyboardInterrupt:
            logger.warning("Đã dừng (Ctrl+C). Dữ liệu đến từ khoá trước đã được lưu; chạy lại để tiếp tục.")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Lỗi không mong muốn ở cấp cao nhất: {e}", exc_info=True)
            sys.exit(1)
        return

    try:
        run_pipeline(
            keyword=args.keyword,
            doc_types=doc_types,
            top_n=None if args.crawl_all else args.top_n,
            headless=headless,
            skip_download=args.skip_download,
            export=args.export,
            sources=sources,
            export_formats=export_formats,
        )
    except KeyboardInterrupt:
        logger.warning("Đã dừng bởi người dùng (Ctrl+C).")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Lỗi không mong muốn ở cấp cao nhất: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
