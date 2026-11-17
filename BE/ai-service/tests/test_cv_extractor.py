import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
import pymupdf

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402


def _make_text_pdf(text: str) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    return doc.tobytes()


def _make_blank_pdf() -> bytes:
    doc = pymupdf.open()
    doc.new_page()
    return doc.tobytes()


_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00"
    b"\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
)


class CvExtractorTests(unittest.TestCase):
    """Unit tests for CV and certificate extraction endpoint and guardrails."""

    def setUp(self):
        self._orig_key = settings.INTERNAL_API_KEY
        self._orig_vision = settings.VISION_ENABLED
        settings.INTERNAL_API_KEY = ""
        settings.VISION_ENABLED = True
        self._qdrant_patch = patch("app.main.init_qdrant")
        self._qdrant_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        settings.INTERNAL_API_KEY = self._orig_key
        settings.VISION_ENABLED = self._orig_vision
        self._qdrant_patch.stop()

    def test_ev01_identity_document_is_rejected(self):
        pdf = _make_text_pdf("National ID document text that must never be sent to AI.")
        resp = self.client.post(
            "/api/v1/cv/extract",
            files={"file": ("id.pdf", pdf, "application/pdf")},
            data={"evidence_type": "EV-01"},
        )
        self.assertEqual(resp.status_code, 400)

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

    def test_scanned_pdf_with_vision_disabled_returns_vision_disabled_without_calling_ollama(self):
        scanned = _make_blank_pdf()
        with patch("app.modules.cv_screening.extractor.httpx.post") as post:
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("scan.pdf", scanned, "application/pdf")},
                data={"evidence_type": "EV-02", "vision_enabled": "false"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "VISION_DISABLED")
        self.assertTrue(body["is_scanned"])
        self.assertTrue(body["is_unreadable"])
        self.assertIsNone(body["extracted"])
        post.assert_not_called()

    def test_image_with_global_vision_disabled_skips_ollama(self):
        settings.VISION_ENABLED = False
        with patch("app.modules.cv_screening.extractor.httpx.post") as post:
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("cert.png", _TINY_PNG, "image/png")},
                data={"evidence_type": "EV-02", "vision_enabled": "true"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "VISION_DISABLED")
        self.assertTrue(body["is_image"])
        self.assertTrue(body["is_unreadable"])
        post.assert_not_called()

    def test_image_with_vision_enabled_calls_vision_model(self):
        fake_resp = MagicMock()
        fake_resp.status_code = 200
        fake_resp.json.return_value = {
            "message": {
                "content": json.dumps(
                    {
                        "full_name": "Tran Van B",
                        "document_type": "TAX_CERTIFICATE",
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

        with patch("app.modules.cv_screening.extractor.httpx.post", return_value=fake_resp) as post:
            resp = self.client.post(
                "/api/v1/cv/extract",
                files={"file": ("cert.png", _TINY_PNG, "image/png")},
                data={"evidence_type": "EV-02", "vision_enabled": "true"},
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "EXTRACTED")
        self.assertTrue(body["is_image"])
        self.assertEqual(body["extracted"]["document_type"], "TAX_CERTIFICATE")
        self.assertEqual(body["extracted"]["certificates"][0]["expiry_date"], "2024-06-15")
        sent_json = post.call_args.kwargs["json"]
        self.assertEqual(sent_json["model"], settings.VISION_MODEL)
        self.assertEqual(len(sent_json["messages"][1]["images"]), 1)

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


if __name__ == "__main__":
    unittest.main()
