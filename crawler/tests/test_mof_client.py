"""Test nguồn vbpq.mof.gov.vn: map dữ liệu API, lọc trích yếu, khoá theo nguồn, OCR fallback."""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import config  # noqa: E402
from src import mof_client, ocr, storage  # noqa: E402
from src.exporter import build_payload  # noqa: E402
from src.models import Attachment, LegalDocument, record_key  # noqa: E402
from src.normalize import doc_number_key  # noqa: E402

# Một phần tử `documents[]` theo đúng schema API thật (giá trị tổng hợp)
API_ITEM = {
    "contentType": "LegalDocument",
    "no": "65/2026/TT-BTC",
    "legalApplyDate": "2026-07-26T00:00:00",
    "legalExpireDate": None,
    "summary": "Sửa đổi, bổ sung một số điều của Thông tư hướng dẫn thuế  thu nhập doanh nghiệp",
    "id": 556391,
    "filePathCurrent": [
        {"id": 556390, "inputFileName": "65/2026/TT-BTC.pdf", "filePath": "x.pdf", "length": 829953},
        {"id": 556392, "inputFileName": "phu-luc.rar", "filePath": "y.rar", "length": 1000},
    ],
    "documentTypeRecordName": "Thông tư",
    "documentTypeRecordId": 20,
    "legalPublishDate": "2026-06-11T00:00:00",
    "organizations": [{"name": "Bộ Tài chính", "id": 1}, {"name": "Bộ Tài chính", "id": 1}],
    "documentStatusRecordName": "Chưa hiệu lực",
    "toanVan": "Câu tóm tắt của văn bản khác - không được dùng",
}


def test_to_legal_document_maps_api_fields():
    doc = mof_client.to_legal_document(API_ITEM)
    assert doc.source == "mof"
    assert doc.so_hieu == "65/2026/TT-BTC"
    assert doc.loai_van_ban == "Thông tư"
    assert doc.tieu_de.startswith("Thông tư 65/2026/TT-BTC Sửa đổi")
    assert doc.co_quan_ban_hanh == "Bộ Tài chính"
    assert (doc.ngay_ban_hanh, doc.ngay_hieu_luc, doc.ngay_het_hieu_luc) == ("11/06/2026", "26/07/2026", None)
    assert doc.tinh_trang_hieu_luc == "Chưa hiệu lực"
    assert doc.doc_id == "556391"
    assert doc.detail_url.endswith("Detail?contentType=LegalDocument&id=556391&tab=99")
    assert doc.noi_dung_text is None  # toanVan không phải toàn văn
    assert [a.source_url for a in doc.attachments] == [
        "https://vbpq.mof.gov.vn/DKC.FileManagement/FileStorage/File/556390",
        "https://vbpq.mof.gov.vn/DKC.FileManagement/FileStorage/File/556392",
    ]
    assert [a.file_type for a in doc.attachments] == ["pdf", "rar"]


@pytest.mark.parametrize(
    "summary, keyword, expected",
    [
        ("Hướng dẫn thuế  Thu Nhập doanh nghiệp", "thuế thu nhập doanh nghiệp", True),
        ("Quy định mức thu phí sử dụng đường bộ", "thuế thu nhập doanh nghiệp", False),
        ("Bất kỳ", "", True),
        (None, "thuế", False),
    ],
)
def test_summary_matches(summary, keyword, expected):
    assert mof_client.summary_matches(summary, keyword) is expected


def test_dest_path_sanitizes_slash_and_uses_source_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "PDF_DIR", tmp_path)
    doc = mof_client.to_legal_document(API_ITEM)
    dest = mof_client._dest_path(doc, "65/2026/TT-BTC.pdf")
    assert dest == tmp_path / "mof" / "thong_tu" / "65-2026-tt-btc__65_2026_TT-BTC.pdf"


def test_record_key_keeps_sources_separate():
    assert record_key({"doc_id": "8535"}) == "id::8535"  # bản ghi vbpl cũ không có "source"
    assert record_key({"doc_id": "8535", "source": "vbpl"}) == "id::8535"
    assert record_key({"doc_id": "8535", "source": "mof"}) == "mof::id::8535"
    doc = mof_client.to_legal_document(API_ITEM)
    assert doc.unique_key == "mof::id::556391"


def test_export_uses_source_code():
    rec = mof_client.to_legal_document(API_ITEM).to_dict()
    rec["noi_dung_text"] = "Điều 1. Phạm vi điều chỉnh\n1. Nội dung."
    payload = build_payload(rec)
    assert payload["knowledge_document"]["source"] == "CRAWL_MOF"
    assert payload["legal_source"]["metadata"]["source"] == "mof"
    assert payload["legal_source"]["document_number"] == "65/2026/TT-BTC"
    assert payload["chunks"][0]["path"] == "Điều 1 · Khoản 1"


def test_decision_without_year_is_a_document_number():
    rec = {"so_hieu": "2777/QĐ-BTC", "loai_van_ban": "Quyết định", "source": "mof",
           "doc_id": "1", "noi_dung_text": ""}
    assert build_payload(rec)["legal_source"]["document_number"] == "2777/QĐ-BTC"


def _scanned_doc(tmp_path) -> LegalDocument:
    pdf = tmp_path / "scan.pdf"
    pdf.write_bytes(b"%PDF-1.4")
    return LegalDocument(
        so_hieu="65/2026/TT-BTC", tieu_de="x", loai_van_ban="Thông tư", source="mof",
        attachments=[Attachment(file_name="scan.pdf", source_url="u", local_path=str(pdf),
                                file_type="pdf", downloaded=True)],
    )


def test_scanned_pdf_is_ocred(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "extract_text_from_pdf", lambda p: ("", True))
    monkeypatch.setattr(ocr, "availability_problem", lambda: None)
    monkeypatch.setattr(ocr, "ocr_pdf", lambda p: "Điều 1. Phạm vi điều chỉnh")
    monkeypatch.setattr(config, "OCR_ENABLED", True)
    doc = storage.ensure_document_text(_scanned_doc(tmp_path))
    assert doc.text_source == "pdf_ocr"
    assert doc.ocr_required is False
    assert doc.noi_dung_text == "Điều 1. Phạm vi điều chỉnh"


def test_missing_tesseract_keeps_ocr_required(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "extract_text_from_pdf", lambda p: ("", True))
    monkeypatch.setattr(ocr, "availability_problem", lambda: "chưa cài Tesseract")
    monkeypatch.setattr(config, "OCR_ENABLED", True)
    doc = storage.ensure_document_text(_scanned_doc(tmp_path))
    assert doc.text_source == "pdf_extraction"
    assert doc.ocr_required is True


def test_no_ocr_flag_skips_ocr(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "extract_text_from_pdf", lambda p: ("", True))
    monkeypatch.setattr(ocr, "ocr_pdf", lambda p: pytest.fail("không được OCR khi tắt"))
    monkeypatch.setattr(config, "OCR_ENABLED", False)
    doc = storage.ensure_document_text(_scanned_doc(tmp_path))
    assert doc.ocr_required is True


@pytest.mark.skipif(ocr.availability_problem() is not None, reason="Chưa cài Tesseract + gói 'vie'")
def test_real_ocr_smoke(tmp_path):
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (1200, 200), "white")
    ImageDraw.Draw(img).text((20, 80), "Dieu 1. Pham vi dieu chinh", fill="black")
    pdf = tmp_path / "t.pdf"
    img.save(pdf)
    assert "Dieu" in ocr.ocr_pdf(str(pdf))


@pytest.mark.parametrize(
    "a, b",
    [
        ("82/2025/NĐ-CP", "82/2025/nđ-cp "),
        ("82/2025/NĐ-CP", "82/2025/ND-CP"),
        ("2777/QĐ-BTC", "2777 /QĐ-BTC"),
    ],
)
def test_doc_number_key_matches_variants(a, b):
    assert doc_number_key(a) == doc_number_key(b) is not None


@pytest.mark.parametrize("so_hieu", [None, "", "UNKNOWN", "Không số"])
def test_doc_number_key_rejects_non_numbers(so_hieu):
    assert doc_number_key(so_hieu) is None


def test_collect_skips_documents_already_on_vbpl(monkeypatch):
    dup = dict(API_ITEM)
    new = dict(API_ITEM, id=999, no="70/2026/TT-BTC")
    monkeypatch.setattr(mof_client, "_session", lambda: None)
    monkeypatch.setattr(mof_client, "_doc_type_ids", lambda s: {"Thông tư": 20})
    monkeypatch.setattr(mof_client, "_search_pages", lambda *a, **kw: iter([dup, new]))
    monkeypatch.setattr(mof_client, "_delay", lambda: None)

    docs = mof_client.collect_mof_documents(
        "thuế thu nhập doanh nghiệp", ["Thông tư"], top_n=1, skip_download=True,
        known_numbers={doc_number_key("65/2026/TT-BTC")},
    )
    # Bản trùng không tính vào top-N -> lấy văn bản kế tiếp
    assert [d.so_hieu for d in docs] == ["70/2026/TT-BTC"]


def test_collect_all_does_not_apply_top_n_limit(monkeypatch):
    first = dict(API_ITEM, id=101, no="65/2026/TT-BTC")
    second = dict(API_ITEM, id=102, no="70/2026/TT-BTC")
    monkeypatch.setattr(mof_client, "_session", lambda: None)
    monkeypatch.setattr(mof_client, "_doc_type_ids", lambda s: {"Thông tư": 20})
    monkeypatch.setattr(mof_client, "_search_pages", lambda *a, **kw: iter([first, second]))
    monkeypatch.setattr(mof_client, "_delay", lambda: None)

    docs = mof_client.collect_mof_documents(
        "thuế thu nhập doanh nghiệp",
        ["Thông tư"],
        top_n=None,
        skip_download=True,
    )

    assert [d.so_hieu for d in docs] == ["65/2026/TT-BTC", "70/2026/TT-BTC"]
