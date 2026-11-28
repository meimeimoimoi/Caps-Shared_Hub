# Crawler image: includes Playwright Chromium for headless scraping + Tesseract for OCR.
# Runs as a one-shot command (docker run) or scheduled via cron.
# bookworm: Playwright 1.48 has no install-deps support for newer Debian (trixie)
FROM python:3.12-slim-bookworm

# libarchive-tools: bsdtar unpacks .rar appendix archives (tax forms) for src/appendix.py
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr tesseract-ocr-vie libarchive-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# --with-deps installs every system library Chromium needs (a hand-written list missed libxfixes3)
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

COPY . .

ENTRYPOINT ["python", "scraper_agent.py"]
