"""
config.py
=========
Cấu hình trung tâm cho VBPL Scraper Agent.
Chỉnh các giá trị dưới đây theo nhu cầu trước khi chạy scraper_agent.py.
"""

import os
from datetime import datetime
from pathlib import Path

# ============================================================
# 1. THAM SỐ TÌM KIẾM
# ============================================================

# Từ khóa tìm kiếm mặc định (có thể override bằng --keyword khi chạy CLI)
KEYWORD = "thuế thu nhập doanh nghiệp"

# Danh sách loại văn bản cần lấy top-N mỗi loại.
# Đây là các giá trị hiển thị trong dropdown "Loại văn bản" trên vbpl.vn.
# LƯU Ý: Tên chính xác có thể khác nhau chút ít tùy thời điểm - hãy xác minh
# bằng inspect_site.py trước khi chạy thật (xem PLAN.md - Bước 3).
DOCUMENT_TYPES = [
    "Luật",
    "Nghị định",
    "Thông tư",
    "Quyết định",
]

# Số văn bản gần nhất muốn lấy CHO MỖI loại văn bản ở trên
TOP_N = 3

# Sắp xếp kết quả: mặc định trang đã sắp theo "Nhóm văn bản / Từ mới đến cũ"
# Không cần thay đổi trừ khi bạn muốn logic khác.
SORT_NEWEST_FIRST = True

# Số trang kết quả cần lấy để đủ "TOP_N" văn bản cho mỗi loại.
# Trang mặc định trả 10 kết quả / trang; tăng lên nếu muốn quét sâu hơn.
RESULT_PAGE_SIZE_FALLBACK = 20

# Thời gian chờ tối đa (ms) cho server action trả về kết quả tìm kiếm / chi tiết
SEARCH_PAYLOAD_TIMEOUT_MS = 25_000
DETAIL_CONTENT_TIMEOUT_MS = 25_000

# Trang tìm kiếm trả 10-20 kết quả / trang tuỳ thời điểm. Với từ khóa rộng
# (kiểu "thuế thu nhập doanh nghiệp") một số loại văn bản có thể không xuất
# hiện ở trang đầu, nên cần bấm "trang sau" để lấy đủ.
# Số trang tối đa sẽ duyệt khi tìm mỗi loại văn bản.
MAX_RESULT_PAGES = 5

# Relation codes of the vbpl "Lược đồ" tab (same code for both directions).
# Unknown codes are kept under their raw code.
RELATION_TYPES = {
    "3": "can_cu",
    "4": "dan_chieu",
    "7": "hop_nhat",
    "8": "huong_dan_ap_dung",
    "9": "quy_dinh_chi_tiet",
    "10": "sua_doi_mot_phan",
    "12": "thay_the_toan_bo",
}
# Followed one hop; 3 (legal basis) and 4 (citations) are too broad, stored only.
FOLLOW_RELATION_CODES = {"8", "9", "10", "12"}


# ============================================================
#  2. URL & SELECTOR (có thể cần cập nhật nếu giao diện trang thay đổi)
# ============================================================

BASE_URL = "https://vbpl.vn"
SEARCH_URL = "https://vbpl.vn/van-ban/trung-uong"

# Template dựng URL trang chi tiết từ id văn bản.
# id có thể là UUID (văn bản mới) hoặc số (văn bản cũ) - cả hai đều hợp lệ:
#   https://vbpl.vn/van-ban/chi-tiet/03dee8b0-b8ce-11f1-b362-1b2583ed3ba0
#   https://vbpl.vn/van-ban/chi-tiet/8535
DETAIL_URL_TEMPLATE = BASE_URL + "/van-ban/chi-tiet/{doc_id}"

# --- Selector cho trang tìm kiếm ---
# LƯU Ý QUAN TRỌNG:
#   DOM của card kết quả KHÔNG chứa id văn bản (chỉ có tiêu đề + nút
#   PDF/Lược đồ/Tải về). Id nằm trong payload server action (xem src/rsc.py).
#   Các selector dưới đây chỉ dùng để thao tác UI (gõ từ khóa, bật bộ lọc).
SELECTORS = {
    # Ô input tìm kiếm chính ở đầu trang
    "search_input": "input#keyword, input[placeholder*='Nhập từ khóa'], input[placeholder*='thông tin']",

    # Nút bấm "Tìm kiếm" (nếu cần bấm thay vì Enter)
    "search_button": "button:has-text('Tìm kiếm')",

    # Checkbox bộ lọc "Loại văn bản" (khớp CHÍNH XÁC tên loại văn bản, ví dụ "Luật").
    # Lưu ý: phải khớp exact - "Luật" sẽ đụng "Bộ luật"/"Hiến pháp" nếu dùng contains.
    "doc_type_filter_checkbox": (
        "label.ant-checkbox-wrapper, label[class*='CollapsibleFilter_checkboxItem']"
    ),

    # Container bọc toàn bộ danh sách kết quả sau khi search xong
    "results_container": "div[class*='DocumentList'], div[class*='DocumentCard_card']:visible",

    # Mỗi dòng/kết quả riêng lẻ trong danh sách
    "result_item": "div[class*='DocumentCard_cardContent']",

    # Trong 1 result_item: element tiêu đề
    "result_item_link": "div[class*='DocumentCard_documentTitle']",

    # Trong 1 result_item: các nút thao tác (mở modal "File đính kèm")
    "result_item_download_button": "button:has-text('Tải về'), button:has-text('PDF')",
}

# --- Selector cho trang chi tiết ---
DETAIL_SELECTORS = {
    # Các tab của trang chi tiết: Nội dung / Thuộc tính / Lược đồ / Lịch sử /
    # Văn bản gốc / Lệnh công bố / Tải về
    "tab": "div.ant-tabs-tab, div[role='tab']",

    # Nội dung tabpane đang hiển thị (chứa toàn văn văn bản)
    "active_pane": "div.ant-tabs-tabpane-active",

    # Danh sách file trong tab "Tải về"
    "download_tab_button": "div.ant-tabs-tabpane-active button.ant-btn",

    # Nút báo "văn bản không tồn tại"
    "not_found": "text=Văn bản không tồn tại",
}

# Map tên loại văn bản (tiếng Việt, dùng cho bộ lọc UI) -> docType code của server.
# Dùng để lọc lại kết quả phía server khi bộ lọc UI không hoạt động.
DOC_TYPE_CODE_MAP = {
    "Hiến pháp": "HP",
    "Bộ luật": "BL",
    "Luật": "L",
    "Pháp lệnh": "PL",
    "Nghị định": "ND",
    "Thông tư": "TT",
    "Thông tư liên tịch": "TTLT_TW",
    "Thông tư liên bộ": "TTLB",
    "Quyết định": "QD",
    # Lưu ý: KHÔNG map "Lệnh" vì code server của Lệnh trùng với Luật ("L");
    # nếu map sai sẽ lọc nhầm văn bản Lệnh vào nhóm Luật. Tên loại vẫn được
    # lọc bằng khớp tên (docType.name) trong search_client._filter_items_by_doc_type.
    "Nghị quyết": "NQ",
    "Nghị quyết liên tịch": "NQLT",
    "Chỉ thị": "CT",
    "Văn bản hợp nhất": "VBHN",
    "Văn bản hệ thống hóa": "VBSH",
    "Văn bản hành chính liên quan": "VBCLQT",
    "Bản dịch văn bản": "BDVBT",
    "Sắc lệnh": "SL",
    "Công văn": "CV",
    "Quy chế": "QC",
    "Thông báo": "TB",
    "Kết luận": "KL",
}



# ============================================================
# 3. HTTP / NETWORK
# ============================================================

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

REQUEST_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
}

# Delay lịch sự giữa các request (giây) - tránh gây tải cho server nhà nước
DELAY_MIN_SECONDS = 2.0
DELAY_MAX_SECONDS = 5.0

# Timeout cho mỗi request (giây)
REQUEST_TIMEOUT = 30
PLAYWRIGHT_TIMEOUT_MS = 30_000  # 30 giây, đơn vị milliseconds cho Playwright

# Số lần thử lại tối đa khi request thất bại
MAX_RETRIES = 3

# Chạy Playwright ở chế độ headless (không hiện cửa sổ trình duyệt)?
# Đặt False khi cần debug trực quan (giống inspect_site.py)
HEADLESS = True

# Nguồn cào mặc định khi không truyền --sources ("vbpl", "mof")
DEFAULT_SOURCES = ["vbpl"]

# --- vbpq.mof.gov.vn: CSDL văn bản quy phạm pháp luật ngành tài chính (API JSON) ---
MOF_BASE_URL = "https://vbpq.mof.gov.vn"
MOF_PAGE_SIZE = 50
# Số trang kết quả tối đa duyệt cho mỗi loại văn bản khi lọc theo trích yếu
MOF_MAX_PAGES = 10
# Bỏ qua file đính kèm lớn hơn ngưỡng này (MB)
MOF_MAX_FILE_MB = 40

# --- OCR (văn bản trên vbpq.mof.gov.vn từ 2021 là PDF scan, không có text layer) ---
OCR_ENABLED = True
# Cài bản Windows của UB-Mannheim kèm gói ngôn ngữ "vie"; ghi đè bằng biến môi trường TESSERACT_CMD
TESSERACT_CMD = os.environ.get("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
OCR_LANG = "vie"
OCR_DPI = 300
OCR_MAX_PAGES = 60


# ============================================================
# 4. ĐƯỜNG DẪN OUTPUT
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent
DATA_ROOT = PROJECT_ROOT / "data"
DATA_DIR = DATA_ROOT
RAW_HTML_DIR = DATA_DIR / "raw_html"
PDF_DIR = DATA_DIR / "pdf"
TEXT_DIR = DATA_DIR / "text"
METADATA_FILE = DATA_DIR / "metadata.json"
LOG_DIR = PROJECT_ROOT / "logs"

def _activate_run(run_dir: Path) -> Path:
    """Point every crawler output at one date/run partition."""
    global DATA_DIR, RAW_HTML_DIR, PDF_DIR, TEXT_DIR, METADATA_FILE
    DATA_DIR = Path(run_dir).resolve()
    RAW_HTML_DIR = DATA_DIR / "raw_html"
    PDF_DIR = DATA_DIR / "pdf"
    TEXT_DIR = DATA_DIR / "text"
    METADATA_FILE = DATA_DIR / "metadata.json"
    for directory in (RAW_HTML_DIR, PDF_DIR, TEXT_DIR, LOG_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    return DATA_DIR


def start_new_run(now: datetime = None) -> Path:
    """Create data/YYYY-MM-DD/run-HHMMSS[-NN] without overwriting another run."""
    now = now or datetime.now()
    day_dir = DATA_ROOT / now.strftime("%Y-%m-%d")
    base_name = f"run-{now:%H%M%S}"
    run_dir = day_dir / base_name
    suffix = 2
    while run_dir.exists():
        run_dir = day_dir / f"{base_name}-{suffix:02d}"
        suffix += 1
    run_dir.mkdir(parents=True)
    return _activate_run(run_dir)


def select_run(run_dir: str = None) -> Path:
    """Activate an explicit run, or the newest run containing metadata.json."""
    if run_dir:
        selected = Path(run_dir)
        if not selected.is_absolute():
            selected = PROJECT_ROOT / selected
        if not (selected / "metadata.json").is_file():
            raise FileNotFoundError(f"Không tìm thấy metadata.json trong lượt cào: {selected}")
        return _activate_run(selected)

    candidates = sorted(DATA_ROOT.glob("????-??-??/run-*/metadata.json"))
    if candidates:
        return _activate_run(candidates[-1].parent)
    if (DATA_ROOT / "metadata.json").is_file():
        return _activate_run(DATA_ROOT)
    raise FileNotFoundError(f"Không tìm thấy lượt cào nào trong {DATA_ROOT}")


# A crawl run is activated explicitly by scraper_agent.main().
LOG_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# 5. MAPPING TÊN THƯ MỤC (loại văn bản -> tên thư mục con, không dấu)
# ============================================================

DOC_TYPE_FOLDER_MAP = {
    "Luật": "luat",
    "Nghị định": "nghi_dinh",
    "Thông tư": "thong_tu",
    "Quyết định": "quyet_dinh",
    "Thông tư liên tịch": "thong_tu_lien_tich",
    "Thông tư liên bộ": "thong_tu_lien_bo",
    "Nghị quyết": "nghi_quyet",
    "Nghị quyết liên tịch": "nghi_quyet_lien_tich",
    "Văn bản hợp nhất": "van_ban_hop_nhat",
    "Văn bản hệ thống hóa": "van_ban_he_thong_hoa",
    "Văn bản hành chính liên quan": "van_ban_hanh_chinh_lien_quan",
    "Pháp lệnh": "phap_lenh",
    "Chỉ thị": "chi_thi",
    "Lệnh": "lenh",
    "Công văn": "cong_van",
    "Thông báo": "thong_bao",
    "Bản dịch văn bản": "ban_dich_van_ban",
}


def source_dir(base: Path, source: str) -> Path:
    """
    Thư mục con theo nguồn: vbpl.vn giữ nguyên đường dẫn cũ (data/text/...),
    nguồn khác tách riêng (data/text/mof/...) để file trùng số hiệu không đè nhau.
    """
    return base if source in (None, "", "vbpl") else base / source


def get_folder_name(doc_type: str) -> str:
    """Trả về tên thư mục con (không dấu) tương ứng với loại văn bản.
    Nếu loại văn bản không có trong map, tự sinh slug từ tên."""
    if doc_type in DOC_TYPE_FOLDER_MAP:
        return DOC_TYPE_FOLDER_MAP[doc_type]
    from slugify import slugify
    return slugify(doc_type, separator="_")


# ============================================================
#  6. DỰNG URL TRANG CHI TIẾT TỪ ID VĂN BẢN
# ============================================================

def get_detail_url(doc_id: str, document_url: str = None) -> str:
    """
    Dựng URL trang tài liệu từ id văn bản.

    id trên vbpl.vn có 2 dạng:
      - UUID (văn bản mới):  03dee8b0-b8ce-11f1-b362-1b2583ed3ba0
      - Số   (văn bản cũ):   8535
    Cả hai đều ghép được vào /van-ban/chi-tiet/{id}.

    Args:
        doc_id:       id văn bản lấy được từ server action.
        document_url: URL đầy đủ do server trả về (ưu tiên dùng nếu có).
    """
    if document_url:
        document_url = str(document_url).strip()
        if document_url.startswith("http"):
            return document_url
        if document_url.startswith("/"):
            return BASE_URL + document_url

    return DETAIL_URL_TEMPLATE.format(doc_id=doc_id)
