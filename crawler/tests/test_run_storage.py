from datetime import datetime

import config


def test_each_crawl_gets_its_own_date_and_run_directory(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_ROOT", tmp_path)

    first = config.start_new_run(datetime(2026, 10, 11, 8, 30, 15))
    second = config.start_new_run(datetime(2026, 10, 11, 8, 30, 15))

    assert first == tmp_path / "2026-10-11" / "run-083015"
    assert second == tmp_path / "2026-10-11" / "run-083015-02"
    assert config.METADATA_FILE == second / "metadata.json"
    assert config.PDF_DIR == second / "pdf"
    assert config.TEXT_DIR == second / "text"
    assert config.RAW_HTML_DIR == second / "raw_html"
    assert all(path.is_dir() for path in (config.PDF_DIR, config.TEXT_DIR, config.RAW_HTML_DIR))


def test_select_latest_run_uses_most_recent_partition(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_ROOT", tmp_path)
    older = tmp_path / "2026-10-10" / "run-235959"
    latest = tmp_path / "2026-10-11" / "run-000001"
    older.mkdir(parents=True)
    latest.mkdir(parents=True)
    (older / "metadata.json").write_text("[]", encoding="utf-8")
    (latest / "metadata.json").write_text("[]", encoding="utf-8")

    selected = config.select_run()

    assert selected == latest
    assert config.METADATA_FILE == latest / "metadata.json"
