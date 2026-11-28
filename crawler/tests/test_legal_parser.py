"""Test bộ tách Điều/Khoản, chuẩn hoá số hiệu và chunk xuất cho Caps-Shared_Hub."""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import config  # noqa: E402
from src.exporter import (  # noqa: E402
    MAX_CHUNK_CHARS,
    build_payload,
    export_records,
    parse_export_format,
    render_markdown,
)
from src.legal_parser import parse_legal_text  # noqa: E402
from src.normalize import (  # noqa: E402
    normalize_attachments,
    parse_vn_date,
    resolve_so_hieu,
)

# Bản sao vài văn bản thật đã cào (data/ không được commit)
TEXT_DIR = Path(__file__).resolve().parent / "fixtures" / "text"


def _read(rel: str) -> str:
    path = TEXT_DIR / rel
    if not path.exists():
        pytest.skip(f"Thiếu file mẫu {path}")
    return path.read_text(encoding="utf-8")


# ------------------------------------------------------------
#  Parser trên văn bản thật
# ------------------------------------------------------------
def test_nghi_dinh_82_articles_clauses_points():
    doc = parse_legal_text(_read("nghi_dinh/82-2025-n-cp.txt"))
    assert doc.parse_status == "PARSED"
    assert [a.number for a in doc.articles] == ["1", "2", "3", "4", "5", "6"]

    art4 = doc.articles[3]
    assert art4.title == "Gia hạn thời hạn nộp thuế và tiền thuê đất"
    clauses = [u.clause for u in art4.units if u.clause and not u.point]
    assert clauses == ["1", "2", "3", "4", "5"]
    assert any(u.label == "Khoản 1 · Điểm a" for u in art4.units)

    # Mẫu đơn sau chữ ký không được lẫn vào Điều 6
    art6 = doc.articles[5]
    assert "Nơi nhận" not in art6.text
    assert "GIẤY ĐỀ NGHỊ GIA HẠN" not in art6.text
    assert any(line.startswith("Nơi nhận") for line in doc.closing)


def test_luat_cu_uses_dash_clause_numbering():
    doc = parse_legal_text(_read("luat/khong-so.txt"))
    assert len(doc.chapters) == 8
    assert doc.chapters[0].number == "I"
    assert doc.chapters[0].title == "NHỮNG QUY ĐỊNH CHUNG"
    art9 = next(a for a in doc.articles if a.number == "9")
    assert [u.clause for u in art9.units if u.clause and not u.point][:2] == ["1", "2"]
    assert not any(u.warning for u in art9.units)


def test_thong_tu_69_chapters_and_appendices():
    doc = parse_legal_text(_read("thong_tu/69-2026-tt-bxd.txt"))
    assert [c.number for c in doc.chapters] == ["I", "II", "III", "IV", "V"]
    assert [a.title for a in doc.appendices] == ["Phụ lục I", "Phụ lục II", "Phụ lục III", "Phụ lục IV"]
    # "Mục đích ..." trong phụ lục không được hiểu là Mục
    assert all(a.section is None or a.section.startswith("Mục ") for a in doc.articles)


# ------------------------------------------------------------
#  Parser trên mẫu tổng hợp
# ------------------------------------------------------------
AMENDING = """NGHỊ ĐỊNH
Căn cứ Luật Tổ chức Chính phủ;
Điều 1. Sửa đổi, bổ sung một số điều của Nghị định số 95/2016/NĐ-CP
1. Sửa đổi, bổ sung Điều 3 như sau:
“Điều 3. Hình thức xử phạt
1. Các hình thức xử phạt chính bao gồm:
a) Phạt cảnh cáo;
b) Phạt tiền.”.
2. Bổ sung khoản 6 vào sau khoản 5 Điều 7 như sau:
“6. Áp dụng biện pháp khắc phục hậu quả.”
Điều 2. Hiệu lực thi hành
Nghị định này có hiệu lực từ ngày ký.
Nơi nhận:
- Như trên;
"""


def test_quoted_amendments_stay_inside_clause():
    doc = parse_legal_text(AMENDING)
    assert [a.number for a in doc.articles] == ["1", "2"]
    art1 = doc.articles[0]
    assert [u.label for u in art1.units] == ["Khoản 1", "Khoản 2"]
    assert "“Điều 3. Hình thức xử phạt" in art1.units[0].text
    assert "b) Phạt tiền.”." in art1.units[0].text
    assert doc.articles[1].units[0].label == "Mở đầu"
    assert doc.preamble == ["NGHỊ ĐỊNH", "Căn cứ Luật Tổ chức Chính phủ;"]
    assert not doc.warnings


QUOTED_LABELS = """Điều 4. Giảm thuế
5. Lập hoá đơn:
"Đơn giá" ghi: 11.000.000 x 60 (m2) = 660.000.000 đồng.
“Thuế suất” ghi: 10% x 50%.
6. Kê khai thuế được giảm
a) Thủ tục khai thuế.
b) Dòng ghi chú ghi "Giảm 50%".
"""


def test_line_starting_with_closed_quote_does_not_swallow_clauses():
    units = parse_legal_text(QUOTED_LABELS).articles[0].units
    assert [u.label for u in units] == ["Khoản 5", "Khoản 6", "Khoản 6 · Điểm a", "Khoản 6 · Điểm b"]
    assert '"Đơn giá" ghi' in units[0].text


SECTIONS = """CHƯƠNG I
QUY ĐỊNH CHUNG
Mục 1
PHẠM VI
Điều 1. Phạm vi
1. Khoản một.
3. Khoản ba.
c) Điểm c.
Điều 3. Bỏ qua Điều 2
"""


def test_sections_and_numbering_warnings():
    doc = parse_legal_text(SECTIONS)
    assert doc.chapters[0].title == "QUY ĐỊNH CHUNG"
    assert doc.articles[0].section == "Mục 1 PHẠM VI"
    units = doc.articles[0].units
    assert units[1].warning and "Khoản 3" in units[1].warning
    assert units[2].warning and "c)" in units[2].warning
    assert any("Điều 1 -> Điều 3" in w for w in doc.warnings)
    content = doc.to_content_json()
    assert content["chapters"][0]["articles"][0]["units"][1]["status"] == "WARNING"


INSERTED = """Điều 4. Thu nhập được miễn thuế
14. Khoản mười bốn.
14a. Khoản chèn.
a) Điểm a.
đ) Điểm đ.
đ1) Điểm con một.
đ2) Điểm con hai.
e) Điểm e.
15. Khoản mười lăm.
"""


def test_inserted_clauses_and_sub_points_are_split_without_warnings():
    units = parse_legal_text(INSERTED).articles[0].units
    assert [(u.clause, u.point) for u in units] == [
        ("14", None), ("14a", None), ("14a", "a"), ("14a", "đ"),
        ("14a", "đ1"), ("14a", "đ2"), ("14a", "e"), ("15", None),
    ]
    assert units[4].text == "Điểm con một."
    # Article opening at 14 and "a) -> đ)" are real gaps; sub-points and inserted clauses are not
    assert [(u.clause, u.point) for u in units if u.warning] == [("14", None), ("14a", "đ")]


def test_no_articles_is_parse_failed():
    doc = parse_legal_text("Công văn trả lời doanh nghiệp.\nKhông có Điều nào.")
    assert doc.parse_status == "PARSE_FAILED"


# ------------------------------------------------------------
#  Chuẩn hoá
# ------------------------------------------------------------
def test_resolve_so_hieu_repairs_lost_d():
    assert resolve_so_hieu("362/2026/N�\x90-CP", "Nghị định số 362/2026/NĐ-CP Sửa đổi") == "362/2026/NĐ-CP"
    # Không sửa được bằng byte -> lấy từ tiêu đề
    assert resolve_so_hieu("81/2004/Q�-BTC", "Quyết định số 81/2004/QĐ-BTC Về việc") == "81/2004/QĐ-BTC"
    assert resolve_so_hieu("32/2026/TT-BTC", "Thông tư 32/2026/TT-BTC") == "32/2026/TT-BTC"


def test_parse_vn_date_sorts_chronologically():
    dates = ["02/04/2025", "18/09/2026", "15/10/2004"]
    assert sorted(dates, key=parse_vn_date) == ["15/10/2004", "02/04/2025", "18/09/2026"]
    assert parse_vn_date("N/A") is None


def test_normalize_attachments_dedupes_and_checks_disk(tmp_path):
    real = tmp_path / "a.pdf"
    real.write_bytes(b"%PDF")
    atts = [
        {"file_name": "Nghị-định-N�\x90-CP.pdf", "downloaded": False, "local_path": None},
        {"file_name": "Nghị-định-NĐ-CP.pdf", "downloaded": True, "local_path": str(real)},
        {"file_name": "gone.docx", "downloaded": True, "local_path": str(tmp_path / "gone.docx")},
    ]
    out = normalize_attachments(atts)
    assert [a["file_name"] for a in out] == ["Nghị-định-NĐ-CP.pdf", "gone.docx"]
    assert out[0]["downloaded"] is True
    assert out[1]["downloaded"] is False and out[1]["download_error"] == "file missing on disk"


# ------------------------------------------------------------
#  Payload xuất
# ------------------------------------------------------------
def test_payload_matches_ingestion_schema():
    rec = {
        "so_hieu": "82/2025/NĐ-CP",
        "tieu_de": "Nghị định số 82/2025/NĐ-CP Gia hạn thời hạn nộp thuế",
        "loai_van_ban": "Nghị định",
        "co_quan_ban_hanh": "Chính phủ",
        "ngay_ban_hanh": "02/04/2025",
        "ngay_hieu_luc": "02/04/2025",
        "ngay_het_hieu_luc": None,
        "doc_id": "test-id",
        "noi_dung_text": _read("nghi_dinh/82-2025-n-cp.txt"),
    }
    payload = build_payload(rec)
    kd = payload["knowledge_document"]
    assert kd["source"] == "CRAWL_VBPL"
    assert kd["issued_date"] == "2025-04-02"
    assert len(kd["file_hash"]) == 64
    chunks = payload["chunks"]
    assert [c["chunk_index"] for c in chunks] == list(range(len(chunks)))
    c41 = next(c for c in chunks if c["path"] == "Điều 4 · Khoản 1 · Điểm a")
    assert c41["article"] == "4" and c41["clause"] == "1" and c41["point"] == "a"
    assert c41["text"].startswith("Nghị định 82/2025/NĐ-CP — Điều 4. Gia hạn")
    header, body = c41["text"].split("\n", 1)
    assert header.endswith("— Khoản 1 — Điểm a")
    assert body.startswith("1. Đối với thuế giá trị gia tăng")
    assert "\na) Gia hạn thời hạn nộp thuế" in body
    assert c41["effective_from"] == "2025-04-02"
    assert payload["schema_version"] == 2
    assert kd["file_hash_basis"] == "text"
    assert kd["ingest"] == {"suggested_status": "APPROVED", "pending_reasons": []}
    assert all(c["char_count"] == len(c["text"]) <= MAX_CHUNK_CHARS for c in chunks)


def _write_docx(path: Path, body_xml: str) -> str:
    import zipfile

    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("word/document.xml", f'<w:document xmlns:w="{ns}"><w:body>{body_xml}</w:body></w:document>')
    return str(path)


def test_docx_appendix_attachment_is_exported(tmp_path):
    def p(text):
        return f"<w:p><w:r><w:t>{text}</w:t></w:r></w:p>"

    def row(*cells):
        return "<w:tr>" + "".join(f"<w:tc>{p(c)}</w:tc>" for c in cells) + "</w:tr>"

    appendix = _write_docx(
        tmp_path / "a.docx",
        p("Phụ lục I") + p("DANH MỤC HỒ SƠ KHAI THUẾ")
        + f"<w:tbl>{row('2', '03-2/TNDN', 'Phụ lục chuyển lỗ')}{row('9', '03-8/TNDN', 'Phụ lục bảng phân bổ')}</w:tbl>",
    )
    broken = tmp_path / "b.docx"
    broken.write_text("not a zip")
    rec = {
        "so_hieu": "89/2026/TT-BTC", "loai_van_ban": "Thông tư", "doc_id": "tt89",
        "noi_dung_text": "Điều 1. Phạm vi\n1. Nội dung.",
        "attachments": [
            {"file_name": "89-2026-tt-btc__Phụ lục I.docx", "local_path": appendix},
            {"file_name": "THÔNG TƯ 89 LƯU HÀNH.docx", "local_path": appendix},
            {"file_name": "Phụ lục II. Khai bổ sung.docx", "local_path": str(broken)},
            {"file_name": "Phụ lục I. Khai thuế mẫu 1-6.rar", "local_path": str(broken.with_suffix(".rar"))},
        ],
    }
    appendices = build_payload(rec)["knowledge_document"]["content_json"]["appendices"]
    assert appendices == [{
        "title": "Phụ lục I",
        "text": "Phụ lục I\nDANH MỤC HỒ SƠ KHAI THUẾ\n2 | 03-2/TNDN | Phụ lục chuyển lỗ\n9 | 03-8/TNDN | Phụ lục bảng phân bổ",
    }]


@pytest.mark.parametrize("effect, expected", [
    ("Nghị định này có hiệu lực thi hành kể từ ngày ký ban hành và áp dụng từ kỳ tính thuế "
     "thu nhập doanh nghiệp năm 2025.", "2025-01-01"),
    ("Thông tư này có hiệu lực thi hành kể từ ngày 02/08/2014 và áp dụng cho kỳ tính thuế "
     "từ năm 2014 trở đi.", "2014-01-01"),
    ("Nghị định này có hiệu lực thi hành kể từ ngày 15/12/2025.", "2025-12-15"),
])
def test_effective_from_follows_tax_period_in_effect_clause(effect, expected):
    text = (
        "Điều 1. Ưu đãi\n1. Dự án được áp dụng ưu đãi cho thời gian còn lại kể từ kỳ tính thuế năm 2020.\n"
        f"Điều 2. Hiệu lực thi hành\n1. {effect}"
    )
    rec = {"so_hieu": "320/2025/NĐ-CP", "loai_van_ban": "Nghị định", "doc_id": "tp",
           "ngay_hieu_luc": "15/12/2025", "noi_dung_text": text}
    payload = build_payload(rec)
    kd = payload["knowledge_document"]
    assert kd["effective_from"] == expected
    assert kd["metadata"]["ngay_hieu_luc"] == "2025-12-15"
    assert {c["effective_from"] for c in payload["chunks"]} == {expected}


def test_long_clause_is_split_with_header_repeated():
    sentence = "Doanh nghiệp được giảm thuế theo quy định tại khoản này. "
    text = "Điều 1. Ưu đãi thuế\n1. " + sentence * 120
    rec = {"so_hieu": "1/2025/NĐ-CP", "loai_van_ban": "Nghị định", "doc_id": "long",
           "tieu_de": "Nghị định dài", "noi_dung_text": text}
    chunks = build_payload(rec)["chunks"]
    assert len(chunks) > 1
    assert [c["chunk_index"] for c in chunks] == list(range(len(chunks)))
    assert [c["part"] for c in chunks] == list(range(1, len(chunks) + 1))
    assert all(c["total_parts"] == len(chunks) for c in chunks)
    header = chunks[0]["text"].split("\n", 1)[0]
    for c in chunks:
        assert len(c["text"]) <= MAX_CHUNK_CHARS
        assert c["text"].startswith(header + "\n")
        assert c["path"] == "Điều 1 · Khoản 1"


def test_each_point_is_a_chunk_with_clause_lead_in():
    text = "Điều 9. Chi phí\n1. Chi phí được trừ.\n2. Các khoản chi không được trừ gồm:\na) Không có hóa đơn.\nb) Vượt mức.\n"
    rec = {"so_hieu": "1/2025/NĐ-CP", "loai_van_ban": "Nghị định", "doc_id": "points",
           "tieu_de": "Nghị định", "noi_dung_text": text}
    chunks = build_payload(rec)["chunks"]
    assert [c["path"] for c in chunks] == ["Điều 9 · Khoản 1", "Điều 9 · Khoản 2 · Điểm a", "Điều 9 · Khoản 2 · Điểm b"]
    assert all("2. Các khoản chi không được trừ gồm:" in c["text"] for c in chunks[1:])
    assert "Khoản 2 — Điểm b\n" in chunks[2]["text"] and "hóa đơn" not in chunks[2]["text"]


AMENDS_TARGETS = """Điều 1. Sửa đổi, bổ sung một số điều của Nghị định số 164/2003/NĐ-CP
1. Bổ sung thêm điểm e vào khoản 1 Điều 35 như sau:
“e) Thuế suất 20%.”
2. Giữ nguyên các nội dung khác.
Điều 2. Bổ sung khoản 15 Điều 4 Nghị định số 320/2025/NĐ-CP ngày 15 tháng 12 năm 2025 của Chính phủ
“15. Thu nhập được miễn thuế.”
Điều 3. Hiệu lực thi hành
Nghị định này có hiệu lực từ ngày 01 tháng 01 năm 2026.
"""


def test_amending_chunks_name_the_amended_target():
    rec = {"so_hieu": "141/2026/NĐ-CP", "loai_van_ban": "Nghị định", "doc_id": "amend",
           "tieu_de": "Nghị định sửa đổi", "noi_dung_text": AMENDS_TARGETS}
    amends = {c["path"]: c["amends"] for c in build_payload(rec)["chunks"]}
    assert amends == {
        "Điều 1 · Khoản 1": "Bổ sung thêm điểm e vào khoản 1 Điều 35 của Nghị định số 164/2003/NĐ-CP",
        "Điều 1 · Khoản 2": "Sửa đổi, bổ sung một số điều của Nghị định số 164/2003/NĐ-CP",
        "Điều 2": "Bổ sung khoản 15 Điều 4 Nghị định số 320/2025/NĐ-CP",
        "Điều 3": None,
    }


def test_document_without_text_still_has_hash_and_is_pending():
    rec = {"so_hieu": "2/2025/TT-BTC", "loai_van_ban": "Thông tư", "doc_id": "empty",
           "source": "mof", "tieu_de": "Thông tư rỗng", "noi_dung_text": "", "ocr_required": True}
    kd = build_payload(rec)["knowledge_document"]
    assert len(kd["file_hash"]) == 64
    assert kd["file_hash_basis"] == "source_id"
    assert kd["ingest"]["suggested_status"] == "PENDING"
    assert kd["ingest"]["pending_reasons"] == ["NO_TEXT", "OCR_TEXT"]


def test_old_format_is_split_by_roman_sections_and_pending():
    rec = {"so_hieu": "87/2003/TT-BTC", "loai_van_ban": "Thông tư", "doc_id": "old",
           "tieu_de": "Thông tư 87/2003/TT-BTC", "noi_dung_text": _read("thong_tu/87-2003-tt-btc.txt")}
    payload = build_payload(rec)
    content = payload["knowledge_document"]["content_json"]
    articles = [a for c in content["chapters"] for a in c["articles"]]
    assert content["parse_status"] == "PARSED"
    assert [a["number"] for a in articles][:1] == ["I"] and articles[-1]["number"] == "III"
    assert all(a["kind"] == "Mục" for a in articles)
    assert content["preamble"].startswith("BỘ TÀI CHÍNH") or "Căn cứ" in content["preamble"]
    assert all(u["status"] == "WARNING" for a in articles for u in a["units"])
    assert payload["knowledge_document"]["ingest"]["pending_reasons"] == ["OLD_FORMAT"]
    assert payload["chunks"] and payload["chunks"][0]["path"].startswith("Mục I")


def test_modern_document_is_not_old_format():
    doc = parse_legal_text("I. QUY ĐỊNH CHUNG\nĐiều 1. Phạm vi\n1. Nội dung.")
    assert not doc.old_format
    assert [a.number for a in doc.articles] == ["1"]


def test_unparsable_text_is_pending():
    rec = {"so_hieu": "3/2025/QĐ-BTC", "loai_van_ban": "Quyết định", "doc_id": "noparse",
           "tieu_de": "Quyết định", "noi_dung_text": "Văn bản không có cấu trúc Điều."}
    payload = build_payload(rec)
    assert payload["chunks"] == []
    assert payload["knowledge_document"]["ingest"]["pending_reasons"] == ["PARSE_FAILED"]


def test_law_without_number_gets_unique_fallback_key():
    rec = {"so_hieu": "Không số", "loai_van_ban": "Luật", "ngay_ban_hanh": "10/05/1997",
           "doc_id": "abc", "tieu_de": "Luật Thuế thu nhập doanh nghiệp", "noi_dung_text": "Điều 1. A"}
    src = build_payload(rec)["legal_source"]
    assert src["document_number"] == "Luật không số (10/05/1997, vbpl:abc)"
    assert src["metadata"]["has_document_number"] is False


# ------------------------------------------------------------
#  Xuất Markdown / chọn định dạng
# ------------------------------------------------------------
def _nd82_rec():
    return {
        "so_hieu": "82/2025/NĐ-CP", "tieu_de": "Nghị định 82/2025/NĐ-CP", "loai_van_ban": "Nghị định",
        "co_quan_ban_hanh": "Chính phủ", "ngay_ban_hanh": "02/04/2025", "doc_id": "test-id",
        "noi_dung_text": _read("nghi_dinh/82-2025-n-cp.txt"),
    }


def test_render_markdown_has_metadata_and_structure():
    rec = _nd82_rec()
    md = render_markdown(rec, build_payload(rec))
    assert md.startswith("# Nghị định 82/2025/NĐ-CP\n")
    assert "| Số hiệu | 82/2025/NĐ-CP |" in md
    assert "### Điều 4. Gia hạn" in md
    assert "**1.** Đối với thuế giá trị gia tăng" in md
    assert "\na) Gia hạn thời hạn nộp thuế" in md


def test_render_markdown_falls_back_to_full_text():
    rec = {"so_hieu": "3/2025/QĐ-BTC", "loai_van_ban": "Quyết định", "doc_id": "x",
           "tieu_de": "Quyết định", "noi_dung_text": "Văn bản không có cấu trúc Điều."}
    md = render_markdown(rec, build_payload(rec))
    assert "Chưa tách được Điều/Khoản" in md
    assert md.rstrip().endswith("Văn bản không có cấu trúc Điều.")


def test_parse_export_format():
    assert parse_export_format("json") == ("json",)
    assert parse_export_format("MD") == ("md",)
    assert parse_export_format("both") == ("json", "md")
    assert parse_export_format("json,md") == ("json", "md")
    with pytest.raises(ValueError):
        parse_export_format("pdf")


@pytest.mark.parametrize("formats, suffixes", [
    (("json",), {".json"}), (("md",), {".md"}), (("json", "md"), {".json", ".md"}),
])
def test_export_records_writes_selected_formats(tmp_path, monkeypatch, formats, suffixes):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    manifest = export_records([_nd82_rec()], formats)
    written = {p.suffix for p in (tmp_path / "export").rglob("*") if p.is_file() and p.name != "manifest.json"}
    assert written == suffixes
    assert ("file" in manifest[0]) == ("json" in formats)
    assert ("md_file" in manifest[0]) == ("md" in formats)
    assert next(iter(manifest[0].values())).startswith("nghi_dinh/2025/")


def test_export_records_without_date_goes_to_unknown_year(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    manifest = export_records([{**_nd82_rec(), "ngay_ban_hanh": None}])
    assert manifest[0]["file"].startswith("nghi_dinh/khong-ro-nam/")


def test_export_records_skips_documents_without_text(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    manifest = export_records([{**_nd82_rec(), "noi_dung_text": "  "}])
    assert manifest[0]["skipped"] == "NO_TEXT" and "file" not in manifest[0]
    assert [p.name for p in (tmp_path / "export").rglob("*") if p.is_file()] == ["manifest.json"]


def test_normalize_record_drops_khong_so_from_title():
    from src.normalize import normalize_record
    rec = normalize_record({"so_hieu": "Không số", "tieu_de": "Luật Thuế thu nhập doanh nghiệp số Không số"})
    assert rec["tieu_de"] == "Luật Thuế thu nhập doanh nghiệp"
