import calendar
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

ALLOWED_FIELD_CODES: tuple[str, ...] = (
    "CORPORATE_INCOME_TAX",
    "TAX_FINALIZATION",
    "CORPORATE_ACCOUNTING",
    "FINANCIAL_REPORTING",
    "AUDIT",
    "TAX_ADVISORY",
)

DocumentType = Literal[
    "CV",
    "TAX_CERTIFICATE",
    "TRAINING_CERTIFICATE",
    "OTHER",
]

ExtractionStatus = Literal[
    "EXTRACTED",
    "UNREADABLE",
]


def _clean_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.split()).strip()
    return cleaned or None


def _parse_optional_year(value: object) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if 1950 <= value <= 2100 else None
    if isinstance(value, str):
        digits = value.strip()
        if digits.isdigit():
            year = int(digits)
            return year if 1950 <= year <= 2100 else None
    return None


def _parse_optional_month(value: object) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if 1 <= value <= 12 else None
    if isinstance(value, str):
        digits = value.strip()
        if digits.isdigit():
            month = int(digits)
            return month if 1 <= month <= 12 else None
    return None


def _parse_flexible_date(value: object, end_of_month_for_ym: bool) -> date | None:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            pass
    for fmt in ("%Y-%m", "%m/%Y"):
        try:
            dt = datetime.strptime(raw, fmt)
            day = (
                calendar.monthrange(dt.year, dt.month)[1]
                if end_of_month_for_ym
                else 1
            )
            return date(dt.year, dt.month, day)
        except ValueError:
            pass
    return None


class WorkMilestone(BaseModel):
    """One work period extracted from a CV or professional document."""

    company: str | None = None
    role: str | None = None
    start_year: int | None = None
    start_month: int | None = None
    end_year: int | None = None
    end_month: int | None = None
    is_current: bool = False
    is_tax_accounting: bool = False

    @field_validator("company", "role", mode="before")
    @classmethod
    def normalize_strings(cls, v: object) -> str | None:
        return _clean_text(v)

    @field_validator("start_year", "end_year", mode="before")
    @classmethod
    def normalize_years(cls, v: object) -> int | None:
        return _parse_optional_year(v)

    @field_validator("start_month", "end_month", mode="before")
    @classmethod
    def normalize_months(cls, v: object) -> int | None:
        return _parse_optional_month(v)

    @field_validator("is_current", "is_tax_accounting", mode="before")
    @classmethod
    def normalize_bools(cls, v: object) -> bool:
        return bool(v) if isinstance(v, bool) else False


class CertificateInfo(BaseModel):
    """Certificate metadata extracted from a certificate or CV."""

    name: str | None = None
    issuer: str | None = None
    issued_date: date | None = None
    expiry_date: date | None = None

    @field_validator("name", "issuer", mode="before")
    @classmethod
    def normalize_strings(cls, v: object) -> str | None:
        return _clean_text(v)

    @field_validator("issued_date", mode="before")
    @classmethod
    def normalize_issued_date(cls, v: object) -> date | None:
        return _parse_flexible_date(v, end_of_month_for_ym=False)

    @field_validator("expiry_date", mode="before")
    @classmethod
    def normalize_expiry_date(cls, v: object) -> date | None:
        return _parse_flexible_date(v, end_of_month_for_ym=True)


class ExtractedDocumentData(BaseModel):
    """Structured fields extracted by AI; never contains pass/fail conclusions."""

    full_name: str | None = None
    document_type: DocumentType = "OTHER"
    field_codes: list[str] = Field(default_factory=list)
    work_milestones: list[WorkMilestone] = Field(default_factory=list)
    certificates: list[CertificateInfo] = Field(default_factory=list)

    @field_validator("full_name", mode="before")
    @classmethod
    def normalize_full_name(cls, v: object) -> str | None:
        return _clean_text(v)

    @field_validator("document_type", mode="before")
    @classmethod
    def normalize_doc_type(cls, v: object) -> str:
        if isinstance(v, str):
            upper = v.strip().upper()
            if upper in ("CV", "TAX_CERTIFICATE", "TRAINING_CERTIFICATE", "OTHER"):
                return upper
        return "OTHER"

    @field_validator("field_codes", mode="before")
    @classmethod
    def normalize_field_codes(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        allowed = set(ALLOWED_FIELD_CODES)
        seen: list[str] = []
        for item in v:
            if isinstance(item, str):
                code = item.strip().upper()
                if code in allowed and code not in seen:
                    seen.append(code)
        return seen


class CvExtractResponse(BaseModel):
    """Extraction outcome returned to the expert service."""

    status: ExtractionStatus
    is_image: bool = False
    is_scanned: bool = False
    is_unreadable: bool = False
    unreadable_reason: str | None = None
    extracted: ExtractedDocumentData | None = None
