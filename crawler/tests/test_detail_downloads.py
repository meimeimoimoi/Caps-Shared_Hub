"""vbpl "Tải về" tab: stop clicking once buttons keep failing to start a download."""

import sys
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import config  # noqa: E402
from src import search_client  # noqa: E402


class _Buttons:
    def __init__(self, n):
        self.n = n

    def count(self):
        return self.n

    def nth(self, i):
        return self

    def evaluate(self, script):
        pass


class _Pane:
    def __init__(self, n):
        self.first = self
        self.n = n

    def locator(self, selector):
        return _Buttons(self.n)


class _NoDownloadPage:
    """Every click times out without a download event."""

    def __init__(self, n):
        self.n = n
        self.clicks = 0

    def locator(self, selector):
        return _Pane(self.n)

    @contextmanager
    def expect_download(self, timeout):
        self.clicks += 1
        yield None
        raise search_client.PlaywrightTimeoutError("no download")


def test_stops_after_consecutive_timeouts(monkeypatch):
    files = [{"name": f"f{i}.pdf", "info": ""} for i in range(25)]
    monkeypatch.setattr(search_client, "_list_detail_files", lambda page: files)
    monkeypatch.setattr(search_client, "_polite_delay", lambda *a: None)
    page = _NoDownloadPage(len(files))

    assert search_client._download_files_from_detail(page, "Luật", "1-2026-qh16") == []
    assert page.clicks == config.MAX_CONSECUTIVE_DOWNLOAD_TIMEOUTS
