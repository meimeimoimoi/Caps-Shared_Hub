"""Cross-references in provision text ("khoản 2 Điều 24 của Luật này", "... Nghị định số X")."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.legal_parser import parse_legal_text  # noqa: E402
from src.references import find_references  # noqa: E402


def _ref(doc, article, clause=None, point=None):
    return {"doc": doc, "article": article, "clause": clause, "point": point}


def test_same_document():
    text = "số tiền phạt chậm nộp theo quy định tại khoản 2 Điều 24 của Luật này; nếu"
    assert find_references(text, "9") == [_ref("self", "24", "2")]


def test_this_article_and_clause_lists():
    assert find_references("nêu tại khoản 1 và khoản 2 Điều này", "3", "4") == [
        _ref("self", "3", "1"), _ref("self", "3", "2")]
    assert find_references("quy định tại điểm a, b khoản này", "2", "3") == [
        _ref("self", "2", "3", "a"), _ref("self", "2", "3", "b")]


def test_other_document_with_number_even_across_lines():
    assert find_references("theo khoản 2 Điều 6 Nghị định số 326/2026/NĐ-CP ngày", "1") == [
        _ref("326/2026/NĐ-CP", "6", "2")]
    assert find_references("tại khoản 3 Điều 21 Nghị định số\n70/2024/NĐ-CP ngày", "5") == [
        _ref("70/2024/NĐ-CP", "21", "3")]
    assert find_references("quy định tại Điều 7, Điều 8 Thông tư số 14/2015/TT-BTC ngày", "2") == [
        _ref("14/2015/TT-BTC", "7"), _ref("14/2015/TT-BTC", "8")]


def test_ambiguous_or_quoted_references_are_dropped():
    # No document named, a law by name only, and quoted text of an amending document
    assert find_references("tại khoản 1 Điều 51a như sau", "1") == []
    assert find_references("tại điểm đ khoản 2 Điều 18 Luật Hải quan, xuất trình", "1") == []
    assert find_references("Sửa đổi khoản 1 như sau: “1. Theo khoản 2 Điều 3 Thông tư này.”", "1") == []


def test_reference_to_itself_is_dropped():
    assert find_references("theo quy định tại khoản 2 Điều này", "4", "2") == []


def test_parser_adds_references_to_units():
    fixture = ROOT / "tests" / "fixtures" / "text" / "thong_tu" / "69-2026-tt-bxd.txt"
    content = parse_legal_text(fixture.read_text(encoding="utf-8")).to_content_json()
    refs = [r for c in content["chapters"] for a in c["articles"] for u in a["units"]
            for r in u.get("references", [])]

    assert _ref("326/2026/NĐ-CP", "6", "2") in refs
    assert any(r["doc"] == "self" for r in refs)
    # Units without references keep their previous shape
    assert any("references" not in u for c in content["chapters"] for a in c["articles"] for u in a["units"])
