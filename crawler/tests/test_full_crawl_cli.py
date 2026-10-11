import sys

import scraper_agent


def test_all_flag_disables_top_n(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["scraper_agent.py", "--all", "--top-n", "3"])

    args = scraper_agent.parse_args()

    assert args.crawl_all is True
