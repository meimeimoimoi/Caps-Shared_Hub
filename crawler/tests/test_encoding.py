"""Encoding fixes: no U+FFFD, repair markerless UTF-8 double-encoding, sanitize exports."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.exporter import build_payload  # noqa: E402
from src.rsc import decode_utf8_safe, fix_mojibake, is_mojibake  # noqa: E402


def test_decode_utf8_safe_never_emits_replacement_char():
    # 0xFF is not a valid UTF-8 lead byte; it must map through latin-1, not U+FFFD.
    assert "\ufffd" not in decode_utf8_safe(b"Lu\xff\xfft")
    assert decode_utf8_safe("Luật".encode("utf-8")) == "Luật"


def test_fix_mojibake_markerless_double_encoding():
    # cp1252 double-encoding of "Luật Thuế thu nhập doanh nghiệp số 09/2003/QH11"
    broken = "Luáº­t Thuáº¿ thu nháº­p doanh nghiá»‡p sá»‘ 09/2003/QH11"
    assert is_mojibake(broken)
    assert fix_mojibake(broken) == "Luật Thuế thu nhập doanh nghiệp số 09/2003/QH11"
    assert not is_mojibake(fix_mojibake(broken))


def test_fix_mojibake_keeps_clean_vietnamese():
    for text in ("Luật Thuế thu nhập doanh nghiệp", "Quốc hội", "Thông tư 12/2020/TT-BTC"):
        assert fix_mojibake(text) == text
        assert not is_mojibake(text)


def test_build_payload_repairs_legacy_mojibake_metadata():
    rec = {
        "doc_id": "20984",
        "so_hieu": "09/2003/QH11",
        "tieu_de": "Luáº­t Thuáº¿ thu nháº­p doanh nghiá»‡p sá»‘ 09/2003/QH11",
        "loai_van_ban": "Luáº­t",
        "co_quan_ban_hanh": "Quá»‘c há»™i",
        "noi_dung_text": "",
    }

    payload = build_payload(rec)
    source = payload["legal_source"]

    assert source["doc_type"] == "Luật"
    assert source["issuing_authority"] == "Quốc hội"
    assert source["title"] == "Luật Thuế thu nhập doanh nghiệp số 09/2003/QH11"
    assert "\ufffd" not in str(payload)
