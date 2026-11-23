from datetime import date
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
import pymupdf

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.cv_screening.extractor import CvExtractor  # noqa: E402


def _make_text_pdf(text: str) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    return doc.tobytes()


def _make_blank_pdf() -> bytes:
    doc = pymupdf.open()
    doc.new_page()
    return doc.tobytes()


def _make_valid_png(text: str = "CV") -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    return page.get_pixmap(alpha=False).tobytes("png")


class CvExtractorTests(unittest.TestCase):
    """Unit tests for CV text/OCR extraction endpoint and guardrails."""

    def setUp(self):
        self._orig_key = settings.INTERNAL_API_KEY
        self._orig_ocr = settings.OCR_ENABLED
        settings.INTERNAL_API_KEY = ""
        settings.OCR_ENABLED = True
        self._qdrant_patch = patch("app.main.init_qdrant")
        self._qdrant_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        settings.INTERNAL_API_KEY = self._orig_key
        settings.OCR_ENABLED = self._orig_ocr
        self._qdrant_patch.stop()

    def test_non_cv_documents_are_rejected_without_calling_ollama(self):
        pdf = _make_text_pdf("Personal or non-CV document text that must never be sent to AI.")
        for evidence_type in ("EV-01", "EV-02", "EV-03", "EV-04", "EV-05", "SUPPLEMENT"):
            with self.subTest(evidence_type=evidence_type), patch(
                "app.modules.cv_screening.extractor.httpx.post"
            ) as post:
                resp = self.client.post(
                    "/api/v1/cv/extract",
                    files={"file": ("doc.pdf", pdf, "application/pdf")},
                    data={"evidence_type": evidence_type},
                )
                self.assertEqual(resp.status_code, 400)
                post.assert_not_called()

    def test_text_pdf_calls_llm_model_and_filters_allowed_fields(self):
        pdf = _make_text_pdf(
            "Nguyen Minh Anh - Senior Tax Manager 2019-2025 Corporate Income Tax and Tax Advisory."
        )
        fake_resp = MagicMock()
        fake_resp.status_code = 200
        fake_resp.json.return_value = {
            "message": {
                "content": json.dumps(
                    {
                        "full_name": "Nguyen Minh Anh",
                        "document_type": "CV",
                        "field_codes": [
                            "CORPORATE_INCOME_TAX",
                            "UNKNOWN_CODE",
                            "TAX_ADVISORY",
                        ],
                        "work_milestones": [
                            {
                                "company": "An Phat Tax",
                                "role": "Tax Manager",
                                "start_year": 2019,
                                "start_month": 3,
                                "end_year": 2025,
                                "end_month": 3,
                                "is_current": False,
                                "is_tax_accounting": True,
                            }
                        ],
                        "certificates": [
                            {
                                "name": "Tax Practice Certificate",
                                "issuer": "GDT",
                                "issued_date": "2020-05",
                                "expiry_date": "2025-05-01",
                            }
                        ],
                    }
                )
            }
        }

        with patch("app.modules.cv_screening.extractor.httpx.post", return_value=fake_resp) as post:
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("cv.pdf", pdf, "application/pdf")},
                data={"evidence_type": "CV", "vision_enabled": "true"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "EXTRACTED")
        self.assertFalse(body["is_scanned"])
        self.assertFalse(body["is_image"])
        self.assertEqual(body["extracted"]["full_name"], "Nguyen Minh Anh")
        self.assertEqual(
            body["extracted"]["field_codes"],
            ["CORPORATE_INCOME_TAX", "TAX_ADVISORY"],
        )
        self.assertEqual(body["extracted"]["certificates"][0]["issued_date"], "2020-05-01")
        self.assertEqual(post.call_args.kwargs["json"]["model"], settings.LLM_MODEL)

    def test_scanned_pdf_parses_ocr_text_then_calls_llm_model(self):
        scanned = _make_blank_pdf()
        fake_resp = MagicMock()
        fake_resp.status_code = 200
        fake_resp.json.return_value = {
            "message": {
                "content": json.dumps(
                    {
                        "full_name": "Le Thi C",
                        "document_type": "CV",
                        "field_codes": ["TAX_ADVISORY"],
                        "work_milestones": [],
                        "certificates": [],
                    }
                )
            }
        }
        ocr_text = "Le Thi C - Chuyen vien tu van thue doanh nghiep tu 2018 den 2024."

        with (
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._resolve_tessdata",
                return_value="/tmp/tessdata",
            ),
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._select_ocr_language",
                return_value="vie+eng",
            ),
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._ocr_pixmap",
                return_value=ocr_text,
            ),
            patch("app.modules.cv_screening.extractor.httpx.post", return_value=fake_resp) as post,
        ):
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("scan.pdf", scanned, "application/pdf")},
                data={"evidence_type": "CV"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "EXTRACTED")
        self.assertTrue(body["is_scanned"])
        self.assertFalse(body["is_image"])
        self.assertEqual(body["extracted"]["full_name"], "Le Thi C")
        sent_json = post.call_args.kwargs["json"]
        self.assertEqual(sent_json["model"], settings.LLM_MODEL)
        self.assertNotIn("images", sent_json["messages"][1])
        self.assertIn(ocr_text, sent_json["messages"][1]["content"])

    def test_image_parses_ocr_text_then_calls_llm_model(self):
        fake_resp = MagicMock()
        fake_resp.status_code = 200
        fake_resp.json.return_value = {
            "message": {
                "content": json.dumps(
                    {
                        "full_name": "Tran Van B",
                        "document_type": "CV",
                        "field_codes": [],
                        "work_milestones": [],
                        "certificates": [
                            {
                                "name": "Chung chi dai ly thue",
                                "issuer": "Tong cuc Thue",
                                "issued_date": "15/06/2021",
                                "expiry_date": "15/06/2024",
                            }
                        ],
                    }
                )
            }
        }
        ocr_text = "Tran Van B - Dai ly thue va ke toan doanh nghiep 2019-2025."

        with (
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._resolve_tessdata",
                return_value="/tmp/tessdata",
            ),
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._select_ocr_language",
                return_value="vie+eng",
            ),
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._ocr_pixmap",
                return_value=ocr_text,
            ),
            patch("app.modules.cv_screening.extractor.httpx.post", return_value=fake_resp) as post,
        ):
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("cv.png", _make_valid_png(), "image/png")},
                data={"evidence_type": "CV"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "EXTRACTED")
        self.assertTrue(body["is_image"])
        self.assertEqual(body["extracted"]["document_type"], "CV")
        self.assertEqual(body["extracted"]["certificates"][0]["expiry_date"], "2024-06-15")
        sent_json = post.call_args.kwargs["json"]
        self.assertEqual(sent_json["model"], settings.LLM_MODEL)
        self.assertNotIn("images", sent_json["messages"][1])
        self.assertIn(ocr_text, sent_json["messages"][1]["content"])

    def test_scanned_pdf_when_ocr_unavailable_returns_unreadable_without_calling_ollama(self):
        scanned = _make_blank_pdf()
        with (
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._resolve_tessdata",
                return_value=None,
            ),
            patch("app.modules.cv_screening.extractor.httpx.post") as post,
        ):
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("scan.pdf", scanned, "application/pdf")},
                data={"evidence_type": "CV"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "UNREADABLE")
        self.assertTrue(body["is_scanned"])
        self.assertTrue(body["is_unreadable"])
        self.assertEqual(body["unreadable_reason"], "OCR_UNAVAILABLE")
        self.assertIsNone(body["extracted"])
        post.assert_not_called()

    def test_image_with_insufficient_ocr_text_returns_unreadable(self):
        with (
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._resolve_tessdata",
                return_value="/tmp/tessdata",
            ),
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._select_ocr_language",
                return_value="vie+eng",
            ),
            patch(
                "app.modules.cv_screening.extractor.CvExtractor._ocr_pixmap",
                return_value="tiny",
            ),
            patch("app.modules.cv_screening.extractor.httpx.post") as post,
        ):
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("blank.png", _make_valid_png(), "image/png")},
                data={"evidence_type": "CV"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "UNREADABLE")
        self.assertTrue(body["is_image"])
        self.assertTrue(body["is_unreadable"])
        self.assertEqual(body["unreadable_reason"], "OCR_NO_TEXT")
        post.assert_not_called()

    def test_corrupt_image_returns_unreadable(self):
        with patch("app.modules.cv_screening.extractor.httpx.post") as post:
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("broken.png", b"\x89PNG\r\n\x1a\nbroken", "image/png")},
                data={"evidence_type": "CV"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "UNREADABLE")
        self.assertTrue(body["is_image"])
        self.assertTrue(body["is_unreadable"])
        self.assertEqual(body["unreadable_reason"], "CORRUPT_IMAGE")
        post.assert_not_called()

    def test_corrupt_pdf_returns_unreadable(self):
        with patch("app.modules.cv_screening.extractor.httpx.post") as post:
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("broken.pdf", b"%PDF-1.4\nbroken", "application/pdf")},
                data={"evidence_type": "CV"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "UNREADABLE")
        self.assertTrue(body["is_unreadable"])
        self.assertEqual(body["unreadable_reason"], "CORRUPT_PDF")
        post.assert_not_called()

    def test_invalid_ai_json_returns_502(self):
        pdf = _make_text_pdf("Valid text content inside PDF with more than forty characters total.")
        fake_resp = MagicMock()
        fake_resp.status_code = 200
        fake_resp.json.return_value = {"message": {"content": "not json at all"}}

        with patch("app.modules.cv_screening.extractor.httpx.post", return_value=fake_resp):
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("cv.pdf", pdf, "application/pdf")},
                data={"evidence_type": "CV"},
            )

        self.assertEqual(resp.status_code, 502)

    def test_image_with_ocr_disabled_returns_unreadable(self):
        settings.OCR_ENABLED = False
        with patch("app.modules.cv_screening.extractor.httpx.post") as post:
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("cv.png", _make_valid_png(), "image/png")},
                data={"evidence_type": "CV"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "UNREADABLE")
        self.assertTrue(body["is_image"])
        self.assertEqual(body["unreadable_reason"], "OCR_DISABLED")
        post.assert_not_called()

    def test_select_ocr_language_filters_to_installed_traineddata(self):
        with tempfile.TemporaryDirectory() as tmp:
            tess_dir = Path(tmp)
            (tess_dir / "eng.traineddata").write_bytes(b"")
            self.assertEqual(CvExtractor._select_ocr_language(tmp, "vie+eng"), "eng")
            (tess_dir / "vie.traineddata").write_bytes(b"")
            self.assertEqual(CvExtractor._select_ocr_language(tmp, "vie+eng"), "vie+eng")

    def test_current_month_end_milestone_is_marked_as_current(self):
        pdf = _make_text_pdf(
            "Nguyen Minh Anh - Senior AI Engineer 01/2025 - 11/2026 and Software Engineer 2022 - 2024."
        )
        fake_resp = MagicMock()
        fake_resp.status_code = 200
        fake_resp.json.return_value = {
            "message": {
                "content": json.dumps(
                    {
                        "full_name": "Nguyen Minh Anh",
                        "document_type": "CV",
                        "field_codes": [],
                        "work_milestones": [
                            {
                                "company": "Tech Corp",
                                "role": "AI Engineer",
                                "start_year": 2025,
                                "start_month": 1,
                                "end_year": 2026,
                                "end_month": 11,
                                "is_current": False,
                                "is_tax_accounting": False,
                            },
                            {
                                "company": "Old Corp",
                                "role": "Software Engineer",
                                "start_year": 2022,
                                "start_month": 1,
                                "end_year": 2024,
                                "end_month": 12,
                                "is_current": False,
                                "is_tax_accounting": False,
                            },
                        ],
                        "certificates": [],
                    }
                )
            }
        }

        with (
            patch("app.modules.cv_screening.extractor.CvExtractor._current_date", return_value=date(2026, 11, 22)),
            patch("app.modules.cv_screening.extractor.httpx.post", return_value=fake_resp) as post,
        ):
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("cv.pdf", pdf, "application/pdf")},
                data={"evidence_type": "CV"},
            )

        self.assertEqual(resp.status_code, 200)
        milestones = resp.json()["extracted"]["work_milestones"]
        self.assertTrue(milestones[0]["is_current"])
        self.assertFalse(milestones[1]["is_current"])
        sent_prompt = post.call_args.kwargs["json"]["messages"][1]["content"]
        self.assertIn("Current date: 2026-11-22 (11/2026).", sent_prompt)

    def test_system_prompt_includes_audit_roles_and_strict_certificate_dates(self):
        from app.modules.cv_screening.prompts import SYSTEM_PROMPT

        self.assertIn("trợ lý kiểm toán", SYSTEM_PROMPT)
        self.assertIn('NEVER invent "-01-01" or "-01"', SYSTEM_PROMPT)


if __name__ == "__main__":
    unittest.main()
