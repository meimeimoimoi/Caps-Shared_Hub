"""Test chế độ cào theo bộ từ khoá (--keywords-file)."""

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import config  # noqa: E402
from src import storage  # noqa: E402
from src.keywords import infer_doc_type, load_keyword_plan, title_matches  # noqa: E402
from src.models import LegalDocument  # noqa: E402

PLAN_TOML = """
doc_types = ["Thông tư", "Nghị định"]

[core]
terms = ["thuế thu nhập doanh nghiệp", "Luật Thuế thu nhập doanh nghiệp"]
aliases = ["thuế TNDN"]

[topic]
terms = ["chuyển giá", "thuế thu nhập doanh nghiệp"]   # trùng core -> bỏ
doc_types = ["Nghị định"]

[seeds]
so_hieu = ["80/2021/TT-BTC", "14/2008/QH12", "80/2021/tt-btc"]

[contractor]
enabled = false
terms = ["nhà thầu nước ngoài"]
"""


@pytest.fixture
def plan(tmp_path):
    path = tmp_path / "kw.toml"
    path.write_text(PLAN_TOML, encoding="utf-8")
    return load_keyword_plan(path)


def test_plan_groups_dedupe_and_disabled(plan):
    labels = [(s.group, s.term) for s in plan.searches]
    assert labels == [
        ("core", "thuế thu nhập doanh nghiệp"),
        ("core", "Luật Thuế thu nhập doanh nghiệp"),
        ("topic", "chuyển giá"),
        ("seeds", "80/2021/TT-BTC"),
        ("seeds", "14/2008/QH12"),
    ]
    assert plan.groups == ["core", "topic", "seeds"]
    assert plan.searches[2].doc_types == ("Nghị định",)  # ghi đè theo nhóm
    assert plan.searches[3].doc_types == ("Thông tư",)  # seed đoán loại từ số hiệu
    assert plan.searches[4].doc_types == ("Luật",)


def test_doc_types_override_from_cli(tmp_path):
    path = tmp_path / "kw.toml"
    path.write_text(PLAN_TOML, encoding="utf-8")
    p = load_keyword_plan(path, doc_types_override=["Quyết định"])
    assert {s.doc_types for s in p.searches} == {("Quyết định",)}


def test_core_term_accepts_aliases(plan):
    core = plan.searches[0]
    assert core.matches("Thông tư hướng dẫn về thuế TNDN đối với ...", "1/2020/TT-BTC") is True
    assert core.matches("Quy định về Thuế  Thu Nhập Doanh Nghiệp", None) is True
    assert core.matches("Quy định mức thu phí sử dụng đường bộ", None) is False


def test_topic_term_only_matches_itself(plan):
    topic = plan.searches[2]
    assert topic.matches("Nghị định quy định về quản lý thuế đối với doanh nghiệp có giao dịch chuyển giá", None)
    assert topic.matches("Hướng dẫn thuế TNDN", None) is False  # alias của core không áp cho topic


def test_seed_matches_by_number(plan):
    seed = plan.searches[3]
    assert seed.matches("Thông tư hướng dẫn Luật Quản lý thuế", "80/2021/TT-BTC") is True
    assert seed.matches("Thông tư sửa đổi Thông tư 80/2021/TT-BTC", "40/2025/TT-BTC") is False
    # Số hiệu payload hỏng -> tìm trong tên
    assert seed.matches("Thông tư 80/2021/TT-BTC hướng dẫn", "�") is True


def test_broken_title_is_uncertain():
    assert title_matches("ThÃ´ng tÆ° �", ["thuế thu nhập doanh nghiệp"]) is None
    assert title_matches("", ["thuế"]) is None
    assert title_matches("bất kỳ", []) is True


@pytest.mark.parametrize("so_hieu, expected", [
    ("80/2021/TT-BTC", "Thông tư"),
    ("218/2013/NĐ-CP", "Nghị định"),
    ("14/2008/QH12", "Luật"),
    ("58/2008/TTLT-BTC-BTNMT", "Thông tư liên tịch"),
    ("2777/QĐ-BTC", "Quyết định"),
    ("12/VBHN-BTC", "Văn bản hợp nhất"),
    ("abc", None),
])
def test_infer_doc_type(so_hieu, expected):
    assert infer_doc_type(so_hieu) == expected


def test_save_metadata_unions_keywords(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "METADATA_FILE", tmp_path / "metadata.json")
    doc = LegalDocument(so_hieu="1/2020/TT-BTC", tieu_de="x", loai_van_ban="Thông tư", doc_id="1")
    doc.add_keyword("thuế thu nhập doanh nghiệp", "core")
    storage.save_metadata([doc])
    doc2 = LegalDocument(so_hieu="1/2020/TT-BTC", tieu_de="x", loai_van_ban="Thông tư", doc_id="1")
    doc2.add_keyword("chuyển giá", "topic")
    storage.save_metadata([doc2])
    rec = json.loads((tmp_path / "metadata.json").read_text(encoding="utf-8"))[0]
    assert rec["matched_keywords"] == ["thuế thu nhập doanh nghiệp", "chuyển giá"]
    assert rec["keyword_groups"] == ["core", "topic"]


def test_load_all_runs_records(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_ROOT", tmp_path)
    for run, rec in [("2026-10-11/run-090000", {"doc_id": "1", "source": "vbpl"}),
                     ("2026-10-12/run-100000", {"doc_id": "9", "source": "mof"})]:
        (tmp_path / run).mkdir(parents=True)
        (tmp_path / run / "metadata.json").write_text(json.dumps([rec]), encoding="utf-8")
    (tmp_path / "2026-10-12" / "run-110000").mkdir()  # lượt hỏng, chưa có metadata
    assert set(storage.load_all_runs_records()) == {"id::1", "mof::id::9"}
