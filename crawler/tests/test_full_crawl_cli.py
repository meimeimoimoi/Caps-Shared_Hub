import sys

import scraper_agent
from src.models import LegalDocument


def test_all_flag_disables_top_n(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["scraper_agent.py", "--all", "--top-n", "3"])

    args = scraper_agent.parse_args()

    assert args.crawl_all is True


def _doc(number, source):
    return LegalDocument(
        so_hieu=number,
        tieu_de=number,
        loai_van_ban="Thông tư",
        source=source,
    )


def test_count_report_deduplicates_mof_against_vbpl_by_document_number():
    report = scraper_agent.build_count_report(
        [_doc("82/2025/NĐ-CP", "vbpl"), _doc("10/2024/TT-BTC", "vbpl")],
        [_doc("82/2025/ND-CP", "mof"), _doc("20/2023/TT-BTC", "mof")],
    )

    assert report["vbpl"] == 2
    assert report["mof"] == 2
    assert report["mof_duplicates"] == 1
    assert report["metadata_total"] == 3


def test_count_only_flag_is_available(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["scraper_agent.py", "--count-only"])
    assert scraper_agent.parse_args().count_only is True


def test_is_expired_status_from_payload():
    from unittest.mock import MagicMock
    from src.search_client import _is_expired_status

    mock_page = MagicMock()
    mock_page.locator.return_value.count.return_value = 0

    assert _is_expired_status(mock_page, detail={"effStatus": {"name": "Hết hiệu lực toàn bộ"}}) is True
    assert _is_expired_status(mock_page, detail={"effStatus": "Hết hiệu lực toàn bộ"}) is True
    assert _is_expired_status(mock_page, api_item={"effStatus": {"name": "Hết hiệu lực toàn bộ"}}) is True
    assert _is_expired_status(mock_page, detail={"effStatus": {"name": "Còn hiệu lực"}}) is False


def test_is_expired_status_from_dom():
    from unittest.mock import MagicMock
    from src.search_client import _is_expired_status

    mock_page = MagicMock()
    mock_tag = MagicMock()
    mock_tag.inner_text.return_value = "Hết hiệu lực toàn bộ"

    mock_locator = MagicMock()
    mock_locator.count.return_value = 1
    mock_locator.nth.return_value = mock_tag
    mock_page.locator.return_value = mock_locator

    assert _is_expired_status(mock_page) is True
