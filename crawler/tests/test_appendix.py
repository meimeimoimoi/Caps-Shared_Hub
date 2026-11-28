"""Appendix attachments shipped as zip archives of .docx forms (tax forms of TT 89/2026)."""

import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.appendix import docx_text  # noqa: E402
from src.exporter import build_payload  # noqa: E402

NS = (
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'
)
FORM_XML = (
    f"<w:document {NS}><w:body>"
    # Text box: Word writes the same text in mc:Choice and mc:Fallback
    "<w:p><w:r><mc:AlternateContent><mc:Choice><w:t>Mẫu số: 03/TNDN</w:t></mc:Choice>"
    "<mc:Fallback><w:t>Mẫu số: 03/TNDN</w:t></mc:Fallback></mc:AlternateContent></w:r></w:p>"
    "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Tổng lợi nhuận kế toán</w:t></w:r></w:p></w:tc>"
    "<w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl>"
    "</w:body></w:document>"
)


def _docx(path: Path) -> Path:
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("word/document.xml", FORM_XML)
    return path


def test_docx_text_reads_text_boxes_once_and_rows_on_one_line(tmp_path):
    assert docx_text(_docx(tmp_path / "f.docx")) == "Mẫu số: 03/TNDN\nTổng lợi nhuận kế toán | A1"


def test_forms_in_zip_saved_as_docx_become_appendices(tmp_path):
    form = _docx(tmp_path / "03.TNDN.docx")
    archive = tmp_path / "Phụ lục I.docx"
    with zipfile.ZipFile(archive, "w") as z:
        # Nested folder named like the appendix itself is not repeated in the title
        z.write(form, "Phụ lục I/6. Mẫu biểu khai TNDN/10. 03-8.TNDN.docx")
        z.write(form, "Phụ lục I/6. Mẫu biểu khai TNDN/2. 03.TNDN.docx")
        z.writestr("6. Mẫu biểu khai TNDN/old.doc", b"\xd0\xcf\x11\xe0")
    rec = {
        "so_hieu": "89/2026/TT-BTC",
        "loai_van_ban": "Thông tư",
        "noi_dung_text": "Điều 1. Phạm vi\n1. Nội dung.",
        "attachments": [{"file_name": "89-2026-tt-btc__Thông-tư_Phụ lục I.docx", "local_path": str(archive)}],
    }

    payload = build_payload(rec)
    titles = [a["title"] for a in payload["knowledge_document"]["content_json"]["appendices"]]
    assert titles == ["Phụ lục I / 6. Mẫu biểu khai TNDN / 2. 03.TNDN", "Phụ lục I / 6. Mẫu biểu khai TNDN / 10. 03-8.TNDN"]
    # Same body text but new appendix text -> new hash, so ingestion imports the re-export
    no_forms = build_payload({**rec, "attachments": []})
    assert payload["knowledge_document"]["file_hash"] != no_forms["knowledge_document"]["file_hash"]


def test_docker_local_path_is_mapped_to_data_root(tmp_path, monkeypatch):
    import config

    monkeypatch.setattr(config, "DATA_ROOT", tmp_path)
    run = tmp_path / "2026-11-26" / "run-1" / "pdf"
    run.mkdir(parents=True)
    _docx(run / "Phụ lục II.docx")
    rec = {
        "so_hieu": "89/2026/TT-BTC",
        "loai_van_ban": "Thông tư",
        "noi_dung_text": "",
        "attachments": [{"file_name": "Phụ lục II.docx", "local_path": "/app/data/2026-11-26/run-1/pdf/Phụ lục II.docx"}],
    }
    appendices = build_payload(rec)["knowledge_document"]["content_json"]["appendices"]
    assert [a["title"] for a in appendices] == ["Phụ lục II"]
