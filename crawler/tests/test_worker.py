"""Tests for the ingestion worker: export files sent to the BE and text read from DOCX uploads."""

import io
import json
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import worker  # noqa: E402


def test_export_payloads_yields_json_files_listed_in_manifest(tmp_path):
    payload = {"schema_version": 2, "legal_source": {"document_number": "1/2024/TT-BTC"}}
    (tmp_path / "thong_tu").mkdir()
    (tmp_path / "thong_tu" / "1-2024-tt-btc.json").write_text(json.dumps(payload), encoding="utf-8")
    manifest = {
        "schema_version": 2,
        "documents": [
            {"file": "thong_tu/1-2024-tt-btc.json", "document_number": "1/2024/TT-BTC"},
            # Markdown-only export: nothing to send
            {"md_file": "thong_tu/2-2024-tt-btc.md", "document_number": "2/2024/TT-BTC"},
        ],
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    pairs = list(worker.export_payloads(tmp_path))

    assert [(entry["document_number"], body) for entry, body in pairs] == [("1/2024/TT-BTC", payload)]


def test_export_payloads_without_manifest_sends_nothing(tmp_path):
    assert list(worker.export_payloads(tmp_path)) == []


def _docx(*paragraphs: str) -> bytes:
    body = "".join(paragraphs)
    xml = (
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}</w:body></w:document>"
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as package:
        package.writestr("word/document.xml", xml)
    return buffer.getvalue()


def _p(*runs: str) -> str:
    return "<w:p>" + "".join(f'<w:r><w:t xml:space="preserve">{r}</w:t></w:r>' for r in runs) + "</w:p>"


def test_docx_text_joins_runs_and_keeps_one_line_per_paragraph():
    content = _docx(_p("Điều 1.", " Phạm vi điều chỉnh"), "<w:p><w:r><w:t>a)</w:t><w:tab/><w:t>Điểm</w:t></w:r></w:p>")

    assert worker.docx_text(content) == "Điều 1. Phạm vi điều chỉnh\na)\tĐiểm"


def test_docx_text_is_split_into_articles():
    content = _docx(
        _p("Điều 1. Phạm vi điều chỉnh"),
        _p("Thông tư này quy định về thuế."),
        _p("Điều 2. Đối tượng áp dụng"),
        _p("1. Doanh nghiệp."),
    )

    parsed = worker.parse_legal_text(worker.docx_text(content)).to_content_json()

    assert parsed["parse_status"] == "PARSED"
    articles = [a["number"] for c in parsed["chapters"] for a in c["articles"]]
    assert articles == ["1", "2"]
