#!/usr/bin/env python3
"""
worker.py
=========
Connects the crawler to the BE ingestion service through RabbitMQ (messages published by MassTransit).

- CrawlRequested: runs the crawl pipeline with --export, posts every exported file to
  POST /internal/crawl-jobs/{id}/documents, then reports POST /internal/crawl-jobs/{id}/complete.
- DocumentParseRequested: downloads an admin upload (GET /internal/documents/{id}/file), extracts its text
  (PDF: text layer, OCR when available; DOCX), splits articles and posts POST /internal/documents/{id}/content.

Settings (environment or crawler/.env): INGESTION_URL, INTERNAL_API_KEY (= InternalApi:Key of ingestion),
RABBITMQ_URL. Run from crawler/: python worker.py
"""

import io
import json
import os
import sys
import tempfile
import time
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Iterator, Tuple

import pika
import requests
from dotenv import load_dotenv

import config
import scraper_agent
from src import ocr
from src.exporter import get_export_dir
from src.legal_parser import parse_legal_text
from src.logger_setup import setup_logger
from src.storage import extract_text_from_pdf

load_dotenv(Path(__file__).resolve().parent / ".env")

INGESTION_URL = os.environ.get("INGESTION_URL", "http://localhost:5004").rstrip("/")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/%2F")

# MassTransit publishes each message type to a durable fanout exchange named after the .NET type
CRAWL_EXCHANGE = "Caps.Ingestion.Messaging:CrawlRequested"
PARSE_EXCHANGE = "Caps.Ingestion.Messaging:DocumentParseRequested"
CRAWL_QUEUE = "crawler-worker-crawl"
PARSE_QUEUE = "crawler-worker-parse"

DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

logger = setup_logger("worker", config.LOG_DIR)


def call(method: str, path: str, **kwargs) -> requests.Response:
    response = requests.request(
        method, INGESTION_URL + path, headers={"X-Internal-Key": INTERNAL_API_KEY}, timeout=60, **kwargs
    )
    response.raise_for_status()
    return response


# ---------------------------------------------------------------- crawl jobs

def export_payloads(export_dir: Path) -> Iterator[Tuple[dict, dict]]:
    """(manifest entry, export file) for every JSON file listed in export/manifest.json."""
    manifest = export_dir / "manifest.json"
    if not manifest.is_file():
        return
    for entry in json.loads(manifest.read_text(encoding="utf-8"))["documents"]:
        if entry.get("file"):
            yield entry, json.loads((export_dir / entry["file"]).read_text(encoding="utf-8"))


def progress_reporter(job_id: str, min_interval: float = 2.0):
    """on_progress callback for the pipeline: posts milestones, at most every `min_interval` s within a stage."""
    last = {"stage": None, "at": 0.0}

    def report(stage: str, done: int, total=None, message=None) -> None:
        now = time.monotonic()
        if stage == last["stage"] and now - last["at"] < min_interval and done != total:
            return
        last.update(stage=stage, at=now)
        body = {"stage": stage, "done": done, "total": total, "message": message}
        # The job is published just before ingestion commits it, so the first report may briefly get a 404
        for attempt in range(3):
            try:
                call("POST", f"/internal/crawl-jobs/{job_id}/progress", json=body)
                return
            except requests.HTTPError as exc:
                if exc.response.status_code != 404 or attempt == 2:
                    break
                time.sleep(1)
            except Exception:
                break
        # Progress is informational: a failed report must not stop the crawl
        logger.warning(f"Crawl job {job_id}: progress {stage} {done}/{total} not sent")
    return report


def post_export(job_id: str, export_dir: Path, report=None) -> list:
    """Sends every exported document to the job; returns one summary line per document."""
    summary = []
    # Documents reached through a relation go last, so ingestion finds the source they are linked to
    exported = sorted(export_payloads(export_dir),
                      key=lambda e: e[1]["legal_source"]["metadata"].get("related_from") is not None)
    for i, (entry, payload) in enumerate(exported):
        if report:
            report("POSTING", i, len(exported), entry["document_number"])
        result = call("POST", f"/internal/crawl-jobs/{job_id}/documents", json=payload).json()["data"]
        summary.append({
            "documentNumber": entry["document_number"],
            "parseStatus": entry["parse_status"],
            "documentId": result["documentId"],
            "imported": result["imported"],
        })
    if report:
        # Always sent (done == total), so the job does not keep a throttled milestone like 0/N
        report("POSTING", len(exported), len(exported))
    return summary


def complete(job_id: str, status: str, docs_found: int, detail: dict) -> None:
    call("POST", f"/internal/crawl-jobs/{job_id}/complete",
         json={"status": status, "docsFound": docs_found, "detail": detail})


def handle_crawl(message: dict) -> None:
    job_id = message["crawlJobId"]
    logger.info(f"Crawl job {job_id}: {message}")
    report = progress_reporter(job_id)
    try:
        config.start_new_run()
        scraper_agent.run_pipeline(
            keyword=config.KEYWORD,
            doc_types=list(config.DOCUMENT_TYPES),
            top_n=None if message.get("all") else message.get("topN") or config.TOP_N,
            headless=config.HEADLESS,
            export=True,
            sources=message.get("sources") or list(config.DEFAULT_SOURCES),
            on_progress=report,
        )
        documents = post_export(job_id, get_export_dir(), report)
        complete(job_id, "SUCCEEDED", len(documents),
                 {"runDir": str(config.DATA_DIR), "documents": documents})
        logger.info(f"Crawl job {job_id}: {len(documents)} documents sent")
    except KeyboardInterrupt:
        complete(job_id, "FAILED", 0, {"error": "The worker was stopped during the crawl."})
        raise
    except Exception as exc:
        logger.exception(f"Crawl job {job_id} failed")
        complete(job_id, "FAILED", 0, {"error": str(exc)[:2000]})


# ---------------------------------------------------------------- uploads

def docx_text(content: bytes) -> str:
    """Text of a DOCX, one line per paragraph, read with the standard library."""
    # shortcut: a text box nested in a paragraph is read twice; use python-docx if uploads rely on them
    with zipfile.ZipFile(io.BytesIO(content)) as package:
        root = ET.fromstring(package.read("word/document.xml"))
    lines = []
    for paragraph in root.iter(W + "p"):
        parts = []
        for node in paragraph.iter():
            if node.tag == W + "t":
                parts.append(node.text or "")
            elif node.tag == W + "tab":
                parts.append("\t")
            elif node.tag in (W + "br", W + "cr"):
                parts.append("\n")
        lines.append("".join(parts))
    return "\n".join(lines)


def pdf_text(content: bytes) -> str:
    with tempfile.TemporaryDirectory() as folder:
        path = os.path.join(folder, "document.pdf")
        Path(path).write_bytes(content)
        text, ocr_required = extract_text_from_pdf(path)
        if ocr_required and config.OCR_ENABLED and not ocr.availability_problem():
            text = ocr.ocr_pdf(path)
        return text


def download_upload(document_id: str) -> requests.Response:
    # The parse request is published just before ingestion commits the upload, so retry a 404 briefly
    for attempt in range(3):
        try:
            return call("GET", f"/internal/documents/{document_id}/file")
        except requests.HTTPError as exc:
            if exc.response.status_code != 404 or attempt == 2:
                raise
            time.sleep(1)


def handle_parse(message: dict) -> None:
    document_id = message["documentId"]
    response = download_upload(document_id)
    try:
        if response.headers.get("Content-Type", "").startswith(DOCX_TYPE):
            text = docx_text(response.content)
        else:
            text = pdf_text(response.content)
        if text.strip():
            body = {"contentJson": parse_legal_text(text).to_content_json()}
        else:
            body = {"error": "No text found in the file (a scanned PDF needs OCR with Tesseract)."}
    except Exception as exc:
        logger.exception(f"Document {document_id}: could not read the file")
        body = {"error": f"Could not read the file: {exc}"[:2000]}
    call("POST", f"/internal/documents/{document_id}/content", json=body)
    logger.info(f"Document {document_id}: {'content saved' if 'contentJson' in body else body['error']}")


# ---------------------------------------------------------------- RabbitMQ

def on_message(handler):
    def callback(channel, method, properties, body):
        # Acked first: a crawl can outlast RabbitMQ's delivery timeout, and ingestion keeps the job status
        channel.basic_ack(method.delivery_tag)
        try:
            handler(json.loads(body)["message"])
        except Exception:
            logger.exception("Message could not be handled")
    return callback


def consume() -> None:
    params = pika.URLParameters(RABBITMQ_URL)
    # A crawl blocks this thread for minutes; without heartbeats RabbitMQ does not drop the connection
    params.heartbeat = 0
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.basic_qos(prefetch_count=1)
    for exchange, queue, handler in (
        (CRAWL_EXCHANGE, CRAWL_QUEUE, handle_crawl),
        (PARSE_EXCHANGE, PARSE_QUEUE, handle_parse),
    ):
        # Declared like MassTransit does, so whichever side starts first creates the exchange
        channel.exchange_declare(exchange, exchange_type="fanout", durable=True)
        channel.queue_declare(queue, durable=True)
        channel.queue_bind(queue, exchange)
        channel.basic_consume(queue, on_message_callback=on_message(handler))
    logger.info(f"Waiting for crawl and parse requests (ingestion: {INGESTION_URL})")
    channel.start_consuming()


def main() -> None:
    if not INTERNAL_API_KEY:
        sys.exit("INTERNAL_API_KEY is required (the InternalApi:Key of the ingestion service).")
    while True:
        try:
            consume()
        except pika.exceptions.AMQPConnectionError as exc:
            logger.warning(f"RabbitMQ unavailable ({exc!r}); retrying in 5 s")
            time.sleep(5)
        except KeyboardInterrupt:
            return


if __name__ == "__main__":
    main()
