"""
src/logger_setup.py
====================
Cấu hình logging thống nhất cho toàn bộ project.
Ghi log ra cả console (để theo dõi trực tiếp) và file (để debug sau).
"""

import logging
import sys
from datetime import datetime
from pathlib import Path


def setup_logger(name: str, log_dir: Path) -> logging.Logger:
    """Tạo logger có tên `name`, ghi ra console + file logs/scraper_YYYYMMDD.log"""

    logger = logging.getLogger(name)

    # Tránh add handler trùng lặp nếu hàm được gọi nhiều lần
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # --- Console handler (chỉ hiện INFO trở lên cho gọn) ---
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # --- File handler (ghi chi tiết DEBUG để phục vụ debug sau này) ---
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"scraper_{datetime.now().strftime('%Y%m%d')}.log"
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger
