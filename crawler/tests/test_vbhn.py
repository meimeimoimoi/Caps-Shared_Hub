"""Consolidated documents (VBHN): VBHN list, base selection, footnote markers and export."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import scraper_agent  # noqa: E402
from src.exporter import build_payload  # noqa: E402
from src.legal_parser import parse_legal_text  # noqa: E402
from src.rsc import find_vbhn_list  # noqa: E402
from src.vbhn import latest_base_vbhn, parse_footnote, split_footnotes, vbhn_status  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "text" / "van_ban_hop_nhat" / "25-vbhn-btc.txt"

# Trimmed from the VBHN list of Luật 56/2024/QH15 (id 173331): an omnibus amending law
VBHN_PAYLOAD = (
    '0:["$@1",["HcJCr6aAS2l1zPKIdHYZR",null]]\n'
    '1:[{"vbhnDocument":{"id":"0d12","docNum":"90/VBHN-VPQH","issueDate":"2026-03-30T00:00:00","current":false},'
    '"mergedDocuments":[{"id":"27621","docNum":"15/2012/QH13","issueDate":"2012-06-20T00:00:00","current":false},'
    '{"id":"173331","docNum":"56/2024/QH15","issueDate":"2024-11-29T00:00:00","current":true}]},'
    '{"vbhnDocument":{"id":"f389","docNum":"90/VBHN-VPQH","issueDate":"2026-03-30T00:00:00","current":false},'
    '"mergedDocuments":[]},'
    '{"vbhnDocument":{"id":"177809","docNum":"24/VBHN-VPQH","issueDate":"2025-02-26T00:00:00","current":false},'
    '"mergedDocuments":[{"id":"173331","docNum":"56/2024/QH15","issueDate":"2024-11-29T00:00:00","current":true},'
    '{"id":"9001","docNum":"54/2019/QH14","issueDate":"2019-11-22T00:00:00","current":false}]}]\n'
)


def _vbhn(vid, issued, *merged):
    return {"id": vid, "doc_num": vid, "issue_date": issued,
            "merged": [{"id": i, "doc_num": i, "issue_date": d} for i, d in merged]}


def test_find_vbhn_list_flattens_and_drops_duplicate_numbers():
    vbhn = find_vbhn_list(VBHN_PAYLOAD)

    assert [v["doc_num"] for v in vbhn] == ["90/VBHN-VPQH", "24/VBHN-VPQH"]
    assert vbhn[0]["issue_date"] == "2026-03-30"
    assert vbhn[0]["merged"][1] == {"id": "173331", "doc_num": "56/2024/QH15", "issue_date": "2024-11-29"}
    assert find_vbhn_list('0:["$@1",null]\n1:[]\n') is None


def test_omnibus_amending_law_is_not_the_base_of_other_laws_vbhn():
    vbhn = find_vbhn_list(VBHN_PAYLOAD)

    assert latest_base_vbhn("173331", vbhn) is None
    assert latest_base_vbhn("27621", vbhn)["doc_num"] == "90/VBHN-VPQH"
    assert latest_base_vbhn("9001", vbhn)["doc_num"] == "24/VBHN-VPQH"


def test_latest_base_vbhn_takes_newest_issue():
    vbhn = [
        _vbhn("old", "2025-01-01", ("base", "2020-01-01"), ("a1", "2024-01-01")),
        _vbhn("new", "2026-01-01", ("base", "2020-01-01"), ("a1", "2024-01-01"), ("a2", "2025-06-01")),
    ]
    assert latest_base_vbhn("base", vbhn)["id"] == "new"


def test_vbhn_status_lists_amendments_not_merged_yet():
    vbhn = [_vbhn("v1", "2025-01-01", ("base", "2020-01-01"), ("a1", "2024-01-01"))]
    relations = [
        {"code": "10", "direction": "in", "doc_id": "a1", "title": "merged"},
        {"code": "10", "direction": "in", "doc_id": "a2", "title": "too new"},
        {"code": "12", "direction": "in", "doc_id": "r1", "title": "replacement"},
        {"code": "10", "direction": "out", "doc_id": "x", "title": "this one amends x"},
    ]
    status = vbhn_status("base", relations, vbhn)

    assert status["vbhn_latest"]["id"] == "v1"
    assert status["vbhn_outdated"] is True
    assert status["vbhn_missing"] == [{"doc_id": "a2", "title": "too new"}]
    assert vbhn_status("base", relations[:1], vbhn)["vbhn_outdated"] is False


def test_relation_targets_add_newest_vbhn_of_base_document():
    vbhn = [_vbhn("v1", "2025-01-01", ("base", "2020-01-01"), ("a1", "2024-01-01"))]
    targets = scraper_agent.relation_targets([("base", "1/2020/TT-BTC", [], vbhn)], known_ids={"base"})

    assert targets == [("v1", {"doc_id": "base", "so_hieu": "1/2020/TT-BTC",
                               "relation": "hop_nhat", "direction": "in"})]
    # Not the base (the amending document): no VBHN target
    assert scraper_agent.relation_targets([("a1", "X", [], vbhn)], known_ids=set()) == []


def test_split_and_parse_footnotes():
    closing = ["KT. BỘ TRƯỞNG", "[1]", "Văn bản này được hợp nhất từ 02 Thông tư sau:",
               "[3]", "Khoản này được sửa đổi, bổ sung theo quy định tại khoản 5 Điều 1 Thông tư số",
               "71/2025/TT-BTC", ", có hiệu lực thi hành từ ngày 01 tháng 7 năm 2025."]
    rest, notes = split_footnotes(closing)

    assert rest == ["KT. BỘ TRƯỞNG"]
    assert notes[3].startswith("Khoản này được sửa đổi") and "TT-BTC, có hiệu lực" in notes[3]
    assert parse_footnote(3, notes[3]) == {
        "note": 3, "type": "sửa đổi, bổ sung",
        "source_number": "71/2025/TT-BTC", "effective_from": "2025-07-01", "text": notes[3],
    }
    # Quoted provisions after the first sentence do not count as the note's own effect
    quoted = parse_footnote(4, "Điều 2 Thông tư số 71/2025/TT-BTC quy định như sau: được sửa đổi, bổ sung ...")
    assert quoted["type"] is None


def _units(content):
    return {(a["number"], u["label"]): u for c in content["chapters"] for a in c["articles"] for u in a["units"]}


def test_vbhn_markers_attach_to_their_provision():
    parsed = parse_legal_text(FIXTURE.read_text(encoding="utf-8"), consolidated=True)
    content = parsed.to_content_json()
    units = _units(content)

    clause = units[("5", "Khoản 3")]
    assert [a["note"] for a in clause["amendments"]] == [3]
    assert clause["amendments"][0]["source_number"] == "71/2025/TT-BTC"
    # Marker on the article heading applies to every unit of the article
    assert all([a["note"] for a in u["amendments"]] == [4] for (art, _), u in units.items() if art == "7")
    assert "amendments" not in units[("1", "Khoản 1")]
    assert not any("[" in u["text"] for u in units.values())
    assert parsed.doc_notes == [1, 2] and [n["note"] for n in content["document_notes"]] == [1, 2]
    assert sorted(parsed.footnotes) == [1, 2, 3, 4]
    assert "[1]" not in content["closing"]


def test_marker_at_line_end_from_dom_text():
    text = "\n".join([
        "THÔNG TƯ[1]",
        "Điều 1. Phạm vi[2]",
        "1. Khoản một.",
        "2. Khoản hai.[3]",
        "a) Điểm a.",
        "KT. BỘ TRƯỞNG",
        "[1] Văn bản này được hợp nhất từ 02 Thông tư sau:",
        "[2] Điều này được bổ sung theo quy định tại Điều 1 Thông tư số 1/2025/TT-BTC.",
        "[3] Khoản này được sửa đổi theo quy định tại khoản 2 Điều 1 Thông tư số 2/2025/TT-BTC.",
    ])
    content = parse_legal_text(text, consolidated=True).to_content_json()
    units = _units(content)

    assert [a["note"] for a in units[("1", "Khoản 2")]["amendments"]] == [2, 3]
    assert [a["note"] for a in units[("1", "Khoản 1")]["amendments"]] == [2]
    assert units[("1", "Khoản 2")]["text"] == "Khoản hai."


def test_regular_documents_are_not_touched():
    text = "Điều 1. Phạm vi\n1. Theo quy định [1] của Luật.\nKT. BỘ TRƯỞNG\n[1] ghi chú"
    content = parse_legal_text(text).to_content_json()

    assert "document_notes" not in content
    assert _units(content)[("1", "Khoản 1")]["text"] == "Theo quy định [1] của Luật."


def test_export_of_vbhn():
    rec = {"loai_van_ban": "Văn bản hợp nhất", "so_hieu": "25/VBHN-BTC", "doc_id": "v",
           "source": "vbpl", "noi_dung_text": FIXTURE.read_text(encoding="utf-8")}
    payload = build_payload(rec)
    meta = payload["knowledge_document"]["metadata"]

    assert meta["vbhn_effective_from"] == "2025-07-01"
    assert payload["chunks"] and not any("[3]" in c["text"] for c in payload["chunks"])


def test_vbhn_page_id_comes_from_luoc_do_code_7():
    vbhn = [_vbhn("hidden-id", "2025-08-05", ("base", "2024-10-21"), ("a1", "2025-07-01"))]
    vbhn[0]["doc_num"] = "25/VBHN-BTC"
    relations = [{"code": "7", "direction": "in", "doc_id": "published-id",
                  "title": "Văn bản hợp nhất số 25/VBHN-BTC 2025, hợp nhất Thông tư số 73/2024/TT-BTC"}]

    targets = scraper_agent.relation_targets([("base", "73/2024/TT-BTC", relations, vbhn)], known_ids=set())
    assert [t for t, _ in targets] == ["published-id"]
    assert vbhn_status("base", relations, vbhn)["vbhn_latest"]["page_id"] == "published-id"
    # No code-7 entry: fall back to the list id
    assert vbhn_status("base", [], vbhn)["vbhn_latest"]["page_id"] == "hidden-id"
