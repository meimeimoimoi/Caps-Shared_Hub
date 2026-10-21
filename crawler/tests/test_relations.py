"""Relations from the vbpl "Lược đồ" tab: payload parsing and one-hop target selection."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import config  # noqa: E402
import scraper_agent  # noqa: E402
from src.rsc import find_document_detail, find_document_relations, find_full_text_html  # noqa: E402

# Trimmed from a real payload of Luật Quản lý thuế 38/2019/QH14 (id 136036)
PAYLOAD = (
    '0:["$@1",["HcJCr6aAS2l1zPKIdHYZR",null]]\n'
    '1:{"documentNamesByType":{'
    '"3":[{"id":"32801","name":"Hiến pháp năm 2013","effectAllType":null}],'
    '"12":[{"id":"14832","name":"Luật Quản lý thuế số 78/2006/QH11","effectAllType":1}]},'
    '"documentNamesBySource":{'
    '"9":[{"id":"150993","name":"<<ccr:2ec9e9219863,string,364B>>","effectAllType":null}],'
    '"10":[{"id":"173331","name":"Luật số 56/2024/QH15","effectAllType":0}],'
    '"77":[{"id":"999","name":"Unknown kind","effectAllType":null}]}}\n'
)


def test_parses_both_directions_and_codes():
    rels = find_document_relations(PAYLOAD, config.RELATION_TYPES)
    by_id = {r["doc_id"]: r for r in rels}

    assert len(rels) == 5
    assert by_id["14832"] == {
        "code": "12", "type": "thay_the_toan_bo", "direction": "out",
        "doc_id": "14832", "title": "Luật Quản lý thuế số 78/2006/QH11",
    }
    assert by_id["173331"]["direction"] == "in"
    assert by_id["173331"]["type"] == "sua_doi_mot_phan"
    assert by_id["150993"]["title"] is None  # unresolved RSC reference
    assert by_id["999"]["type"] == "77"  # unknown code kept raw


def test_payload_without_relations_returns_none():
    assert find_document_relations('0:["$@1",null]\n1:[]\n') is None


def test_relation_targets_follow_only_selected_codes_once():
    rels = find_document_relations(PAYLOAD, config.RELATION_TYPES)
    sources = [
        ("136036", "38/2019/QH14", rels, []),
        ("1", "X", [{"code": "10", "type": "sua_doi_mot_phan", "direction": "in", "doc_id": "173331"}], []),
    ]

    targets = scraper_agent.relation_targets(sources, known_ids={"136036", "14832"})

    # 3 (legal basis) and unknown codes are not followed; 14832 is known; 173331 only once
    assert [t for t, _ in targets] == ["150993", "173331"]
    assert targets[1][1] == {
        "doc_id": "136036", "so_hieu": "38/2019/QH14",
        "relation": "sua_doi_mot_phan", "direction": "in",
    }


# Detail payload: the text row has no trailing newline, so the metadata row follows "</html>"
_HTML = "<html><body><p>Điều 1.</p></body></html>"
_META = '1:{"id":"84250","docNum":"81/2004/QĐ-BTC","docType":{"name":"Quyết định"}}'


def _detail_payload(declared_len: int) -> str:
    return f'0:["$@1",null]\n2:T{declared_len:x},{_HTML}{_META}\n'


def test_detail_row_after_text_row_split_by_declared_length():
    payload = _detail_payload(len(_HTML.encode("utf-8")))
    assert find_document_detail(payload)["docNum"] == "81/2004/QĐ-BTC"
    assert find_full_text_html(payload) == _HTML


def test_detail_row_after_text_row_split_when_length_is_off():
    # Bytes lost to mojibake make the declared length wrong
    payload = _detail_payload(len(_HTML.encode("utf-8")) + 3)
    assert find_document_detail(payload)["id"] == "84250"
    assert find_full_text_html(payload) == _HTML


def _rel(target, code="10"):
    return {"code": code, "type": config.RELATION_TYPES.get(code, code), "direction": "in", "doc_id": target}


def _luoc_do(target):
    return {"relations": [_rel(target)], "vbhn": []}


def _follow(monkeypatch, tmp_path, previous, cache=None, refresh=False, read_ok=True):
    """Run follow_relations with the browser parts replaced; returns (fetched targets, relation reads, cache)."""
    from src import storage
    from src.models import SearchResultItem

    monkeypatch.setattr(config, "DATA_ROOT", tmp_path)
    if cache is not None:
        storage.save_relations_cache(cache)
    reads, fetched = [], []

    def fake_read(ids, headless):
        reads.extend(ids)
        return {i: _luoc_do("from-network") for i in ids} if read_ok else {}

    def fake_fetch(ids, headless, skip_download):
        fetched.extend(ids)
        return [SearchResultItem(title=i, detail_url="", doc_id=i, api_detail={"id": i, "docNum": i}) for i in ids]

    monkeypatch.setattr(scraper_agent, "fetch_relations_by_ids", fake_read)
    monkeypatch.setattr(scraper_agent, "fetch_documents_by_ids", fake_fetch)
    monkeypatch.setattr(scraper_agent, "ensure_document_text", lambda doc: doc)
    related = scraper_agent.follow_relations([], set(previous), False, previous=previous, refresh=refresh)
    assert all(d.related_from for d in related)
    return fetched, reads, storage.load_relations_cache()


def test_skipped_documents_use_cache_then_record_then_network(monkeypatch, tmp_path):
    previous = {
        "a": {"so_hieu": "A", "relations": [_rel("from-record")], "vbhn": []},
        "b": {"so_hieu": "B", "relations": [_rel("from-record-b")], "vbhn": []},
        "c": {"so_hieu": "C"},  # crawled before relations existed
        "d": {"so_hieu": "D", "relations": [_rel("from-record-d")]},  # before VBHN lists existed
    }
    fetched, reads, cache = _follow(monkeypatch, tmp_path, previous, cache={"b": _luoc_do("from-cache")})

    assert sorted(reads) == ["c", "d"]
    assert sorted(fetched) == ["from-cache", "from-network", "from-record"]
    assert cache["c"] == _luoc_do("from-network")


def test_failed_relation_reads_are_not_cached(monkeypatch, tmp_path):
    fetched, reads, cache = _follow(monkeypatch, tmp_path, {"c": {"so_hieu": "C"}}, read_ok=False)

    assert reads == ["c"] and fetched == [] and "c" not in cache


def test_refresh_rereads_stored_relations(monkeypatch, tmp_path):
    previous = {"a": {"so_hieu": "A", "relations": [_rel("from-record")], "vbhn": []}}
    fetched, reads, _ = _follow(monkeypatch, tmp_path, previous, cache={"a": _luoc_do("from-cache")}, refresh=True)

    assert reads == ["a"] and fetched == ["from-network"]
