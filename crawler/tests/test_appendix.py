"""Appendix attachments (tax forms in .docx / zip of .docx) become their own chunks."""

import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.appendix import attachment_appendices, docx_text, is_appendix  # noqa: E402
from src.exporter import build_payload  # noqa: E402

W = (
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'
)
FORM_XML = (
    f'<w:document {W}><w:body>'
    # Text box: Word writes the same text in mc:Choice and mc:Fallback
    '<w:p><w:r><mc:AlternateContent><mc:Choice><w:t>Mẫu số: 03/TNDN</w:t></mc:Choice>'
    '<mc:Fallback><w:t>Mẫu số: 03/TNDN</w:t></mc:Fallback></mc:AlternateContent></w:r></w:p>'
    '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Tổng lợi nhuận kế toán</w:t></w:r></w:p></w:tc>'
    '<w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl>'
    '</w:body></w:document>'
)


def _docx(path: Path) -> Path:
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("word/document.xml", FORM_XML)
    return path


def test_docx_text_keeps_table_rows_on_one_line(tmp_path):
    assert docx_text(_docx(tmp_path / "f.docx")) == "Mẫu số: 03/TNDN\nTổng lợi nhuận kế toán | A1"


def test_only_appendix_files_are_read():
    assert is_appendix({"downloaded": True, "file_type": "rar", "file_name": "Mẫu 1-6.rar"})
    assert is_appendix({"downloaded": True, "file_type": "docx", "file_name": "Phụ lục I.docx"})
    assert not is_appendix({"downloaded": True, "file_type": "docx", "file_name": "THÔNG TƯ 89.docx"})
    assert not is_appendix({"downloaded": False, "file_type": "rar", "file_name": "x.rar"})


def test_zip_of_forms_under_docx_name_and_chunks(tmp_path):
    form = _docx(tmp_path / "03.TNDN.docx")
    archive = tmp_path / "Phụ lục I.docx"
    with zipfile.ZipFile(archive, "w") as z:
        z.write(form, "6. Mẫu biểu khai TNDN/2. 03.TNDN.docx")
        z.writestr("6. Mẫu biểu khai TNDN/old.doc", b"\xd0\xcf\x11\xe0")
    rec = {
        "so_hieu": "89/2026/TT-BTC",
        "loai_van_ban": "Thông tư",
        "noi_dung_text": "",
        "attachments": [{"downloaded": True, "file_type": "docx", "file_name": archive.name, "local_path": str(archive)}],
    }

    appendices = attachment_appendices(rec)
    assert [a["title"] for a in appendices] == ["Phụ lục I / 6. Mẫu biểu khai TNDN / 2. 03.TNDN"]

    payload = build_payload(rec)
    chunk = payload["chunks"][-1]
    assert chunk["article"] is None and chunk["path"] == appendices[0]["title"]
    assert chunk["text"].startswith("Thông tư 89/2026/TT-BTC — Phụ lục I / 6. Mẫu biểu khai TNDN / 2. 03.TNDN\n")
    assert "A1" in chunk["text"]
    # Same body text but new appendix text -> new hash, so ingestion imports the re-export
    no_forms = build_payload({**rec, "attachments": []})
    assert payload["knowledge_document"]["file_hash"] != no_forms["knowledge_document"]["file_hash"]
