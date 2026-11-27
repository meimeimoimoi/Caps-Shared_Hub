from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.config import settings  # noqa: E402
from app.core.models import llm_model  # noqa: E402
import app.main as main_module  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.ingestion.indexer import LegalIndexer  # noqa: E402


class KbLifecycleAndProbesTests(unittest.TestCase):
    """Unit tests for Qdrant lifecycle endpoints, internal key auth, and health probes."""

    def setUp(self):
        self._orig_internal_key = settings.INTERNAL_API_KEY
        self._orig_require_key = settings.REQUIRE_INTERNAL_API_KEY
        self._orig_app_env = settings.APP_ENV
        settings.INTERNAL_API_KEY = ""
        settings.REQUIRE_INTERNAL_API_KEY = False
        settings.APP_ENV = "dev"
        main_module._last_ollama_probe_ok_at = 0.0
        self._init_qdrant_patch = patch("app.main.init_qdrant")
        self._init_qdrant_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        settings.INTERNAL_API_KEY = self._orig_internal_key
        settings.REQUIRE_INTERNAL_API_KEY = self._orig_require_key
        settings.APP_ENV = self._orig_app_env
        main_module._last_ollama_probe_ok_at = 0.0
        self._init_qdrant_patch.stop()

    def test_health_and_healthz_return_ok(self):
        for path in ("/health", "/healthz"):
            resp = self.client.get(path)
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()["status"], "ok")

    def test_readyz_returns_200_when_qdrant_and_ollama_ready(self):
        fake_cols = SimpleNamespace(collections=[SimpleNamespace(name=settings.QDRANT_COLLECTION)])
        fake_ollama_resp = MagicMock()
        fake_ollama_resp.status_code = 200
        fake_ollama_resp.json.return_value = {
            "models": [
                {"name": settings.LLM_MODEL},
                {"name": settings.EMBEDDING_MODEL},
            ]
        }
        fake_probe_resp = MagicMock()
        fake_probe_resp.status_code = 200

        with (
            patch("app.main.qdrant_client") as mock_qdrant,
            patch("app.main.httpx.get", return_value=fake_ollama_resp),
            patch("app.main.httpx.post", return_value=fake_probe_resp) as mock_probe,
        ):
            mock_qdrant.get_collections.return_value = fake_cols
            resp = self.client.get("/readyz")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "ready", "checks": {"qdrant": "ok", "ollama": "ok"}})
        mock_probe.assert_called_once()

    def test_readyz_returns_503_when_ollama_runner_hangs_even_if_tags_ok(self):
        # Task #2 (S08): /api/tags responds 200, but live 1-token inference probe times out -> 503.
        fake_cols = SimpleNamespace(collections=[SimpleNamespace(name=settings.QDRANT_COLLECTION)])
        fake_ollama_resp = MagicMock()
        fake_ollama_resp.status_code = 200
        fake_ollama_resp.json.return_value = {
            "models": [
                {"name": settings.LLM_MODEL},
                {"name": settings.EMBEDDING_MODEL},
            ]
        }

        with (
            patch("app.main.qdrant_client") as mock_qdrant,
            patch("app.main.httpx.get", return_value=fake_ollama_resp),
            patch("app.main.httpx.post", side_effect=TimeoutError("runner wedged")),
        ):
            mock_qdrant.get_collections.return_value = fake_cols
            resp = self.client.get("/readyz")

        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.json()["checks"]["ollama"], "unavailable")

    def test_readyz_returns_503_when_model_or_qdrant_missing(self):
        fake_cols = SimpleNamespace(collections=[])
        fake_ollama_resp = MagicMock()
        fake_ollama_resp.status_code = 200
        fake_ollama_resp.json.return_value = {"models": [{"name": settings.LLM_MODEL}]}

        with (
            patch("app.main.qdrant_client") as mock_qdrant,
            patch("app.main.httpx.get", return_value=fake_ollama_resp),
        ):
            mock_qdrant.get_collections.return_value = fake_cols
            resp = self.client.get("/readyz")

        self.assertEqual(resp.status_code, 503)
        self.assertEqual(
            resp.json(),
            {"status": "unavailable", "checks": {"qdrant": "collection_missing", "ollama": "model_missing"}},
        )

    def test_internal_key_protection_when_configured(self):
        settings.INTERNAL_API_KEY = "super-secret-key"

        with patch("app.api.routes.LegalIndexer.delete_by_document_id", return_value=3):
            no_header = self.client.delete("/api/v1/kb/documents/doc-1")
            self.assertEqual(no_header.status_code, 401)

            wrong_header = self.client.delete(
                "/api/v1/kb/documents/doc-1",
                headers={"X-Internal-Key": "wrong"},
            )
            self.assertEqual(wrong_header.status_code, 401)

            valid_header = self.client.delete(
                "/api/v1/kb/documents/doc-1",
                headers={"X-Internal-Key": "super-secret-key"},
            )
            self.assertEqual(valid_header.status_code, 200)
            self.assertEqual(valid_header.json()["deleted_count"], 3)

    def test_delete_document_vectors_hides_internal_errors(self):
        with patch("app.modules.ingestion.indexer.qdrant_client") as mock_qdrant:
            mock_qdrant.count.side_effect = RuntimeError("internal qdrant host leaked")
            resp = self.client.delete("/api/v1/kb/documents/doc-1")

        self.assertEqual(resp.status_code, 503)
        self.assertNotIn("internal qdrant host leaked", resp.text)

    def test_delete_document_vectors_deletes_matching_points(self):
        with patch("app.modules.ingestion.indexer.qdrant_client") as mock_qdrant:
            mock_qdrant.count.return_value = SimpleNamespace(count=5)
            resp = self.client.delete("/api/v1/kb/documents/doc-1")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.json(),
            {"status": "SUCCESS", "knowledge_document_id": "doc-1", "deleted_count": 5},
        )
        mock_qdrant.delete.assert_called_once()

    def test_update_document_metadata_validation_and_success(self):
        empty_resp = self.client.patch("/api/v1/kb/documents/doc-1/metadata", json={})
        self.assertEqual(empty_resp.status_code, 400)

        bad_date = self.client.patch(
            "/api/v1/kb/documents/doc-1/metadata",
            json={"effective_to": "31-12-2026"},
        )
        self.assertEqual(bad_date.status_code, 400)

        null_from = self.client.patch(
            "/api/v1/kb/documents/doc-1/metadata",
            json={"effective_from": None},
        )
        self.assertEqual(null_from.status_code, 400)

        with patch("app.modules.ingestion.indexer.qdrant_client") as mock_qdrant:
            mock_qdrant.count.return_value = SimpleNamespace(count=0)
            not_found = self.client.patch(
                "/api/v1/kb/documents/doc-missing/metadata",
                json={"status": "EXPIRED"},
            )
            self.assertEqual(not_found.status_code, 404)

        with patch("app.modules.ingestion.indexer.qdrant_client") as mock_qdrant:
            mock_qdrant.count.return_value = SimpleNamespace(count=4)
            ok_resp = self.client.patch(
                "/api/v1/kb/documents/doc-1/metadata",
                json={"effective_to": "2026-12-31", "status": "EXPIRED"},
            )
            self.assertEqual(ok_resp.status_code, 200)
            self.assertEqual(ok_resp.json()["matched_count"], 4)
            set_payload_kwargs = mock_qdrant.set_payload.call_args.kwargs
            self.assertEqual(
                set_payload_kwargs["payload"],
                {"effective_to": "2026-12-31T23:59:59Z", "status": "EXPIRED"},
            )

        with patch("app.modules.ingestion.indexer.qdrant_client") as mock_qdrant:
            mock_qdrant.count.return_value = SimpleNamespace(count=2)
            clear_resp = self.client.patch(
                "/api/v1/kb/documents/doc-1/metadata",
                json={"effective_to": None},
            )
            self.assertEqual(clear_resp.status_code, 200)
            set_payload_kwargs = mock_qdrant.set_payload.call_args.kwargs
            self.assertEqual(set_payload_kwargs["payload"], {"effective_to": None})

    def test_index_to_qdrant_deletes_stale_points_before_upsert(self):
        chunks = [
            {
                "doc_id": "doc-1",
                "source_id": "src-1",
                "doc_number": "398/2026/NĐ-CP",
                "doc_title": "Test",
                "article": "Điều 1",
                "clause": None,
                "point": None,
                "effective_from": "2026-10-29",
                "effective_to": None,
                "text": "Sample legal text",
            }
        ]
        call_order = []

        with (
            patch("app.modules.ingestion.indexer.embedding_model") as mock_embed,
            patch("app.modules.ingestion.indexer.qdrant_client") as mock_qdrant,
        ):
            mock_embed.embed_documents.return_value = [[0.1, 0.2]]
            mock_qdrant.count.return_value = SimpleNamespace(count=1)
            mock_qdrant.delete.side_effect = lambda **_: call_order.append("delete")
            mock_qdrant.upsert.side_effect = lambda **_: call_order.append("upsert")

            result = LegalIndexer.index_to_qdrant(chunks)

        self.assertEqual(len(result), 1)
        self.assertEqual(call_order, ["delete", "upsert"])

    def test_chat_query_returns_503_when_backend_fails(self):
        fake_analysis = SimpleNamespace(
            is_cit=True,
            needs_clarification=False,
            period_start=SimpleNamespace(isoformat=lambda: "2026-01-01"),
            period_end=SimpleNamespace(isoformat=lambda: "2026-12-31"),
        )
        with (
            patch("app.api.routes.ScopeRouter.analyze", return_value=fake_analysis),
            patch("app.api.routes.TemporalRetriever.retrieve", side_effect=RuntimeError("qdrant down")),
        ):
            resp = self.client.post(
                "/api/v1/chat/query",
                json={"question": "Thuế suất TNDN 2026?", "user_tax_period": "2026-01-01..2026-12-31"},
            )

        self.assertEqual(resp.status_code, 503)
        self.assertNotIn("qdrant down", resp.text)

    def test_draft_document_normalizes_citation_dates(self):
        fake_hit = SimpleNamespace(
            payload={
                "legal_source_id": "src-1",
                "document_number": "320/2025/ND-CP",
                "document_title": "Decree 320",
                "article": "Dieu 1",
                "clause": None,
                "point": None,
                "text_content": "Corporate income tax content",
                "effective_from": "2025-10-01T00:00:00Z",
                "effective_to": "2026-12-31T23:59:59Z",
            }
        )
        fake_draft = {
            "content": {"summary": "Draft"},
            "content_hash": "abc",
            "has_unauthorized_numbers": False,
            "unauthorized_numbers": [],
        }
        with (
            patch("app.api.routes.TemporalRetriever.retrieve", return_value=[fake_hit]),
            patch("app.api.routes.DocumentDrafter.generate_draft", return_value=fake_draft),
        ):
            resp = self.client.post(
                "/api/v1/drafting/generate",
                json={
                    "document_id": "doc-1",
                    "snapshot_data": {"revenue": 100},
                    "template_schema": {},
                    "period_start": "2026-01-01",
                    "period_end": "2026-03-31",
                },
            )

        self.assertEqual(resp.status_code, 200)
        citation = resp.json()["citations"][0]
        self.assertEqual(citation["effective_from"], "2025-10-01")
        self.assertEqual(citation["effective_to"], "2026-12-31")
        self.assertNotIn("text", citation)

    def test_require_internal_api_key_fails_closed_when_key_empty(self):
        settings.INTERNAL_API_KEY = ""
        settings.REQUIRE_INTERNAL_API_KEY = True
        resp = self.client.delete("/api/v1/kb/documents/doc-1")
        self.assertEqual(resp.status_code, 503)

    def test_chat_query_rejects_overlong_or_blank_question_with_422(self):
        long_resp = self.client.post(
            "/api/v1/chat/query",
            json={"question": "a" * 7000, "user_tax_period": "2026"},
        )
        self.assertEqual(long_resp.status_code, 422)

        blank_resp = self.client.post(
            "/api/v1/chat/query",
            json={"question": "   ", "user_tax_period": "2026"},
        )
        self.assertEqual(blank_resp.status_code, 422)

    def test_chat_query_returns_504_on_timeout(self):
        with patch("app.api.routes.ScopeRouter.analyze", side_effect=TimeoutError("ollama timeout")):
            resp = self.client.post(
                "/api/v1/chat/query",
                json={"question": "Thuế suất TNDN 2026?", "user_tax_period": "2026"},
            )
        self.assertEqual(resp.status_code, 504)

    def test_non_dev_startup_refuses_empty_internal_api_key_and_llm_caps_num_predict(self):
        # Task #1 & #2: refuse startup in prod/ngrok without INTERNAL_API_KEY, and cap num_predict.
        import asyncio

        async def _enter_lifespan():
            async with main_module.lifespan(app):
                pass

        self.assertEqual(llm_model.num_predict, settings.OLLAMA_NUM_PREDICT)
        settings.APP_ENV = "prod"
        settings.INTERNAL_API_KEY = ""
        with self.assertRaises(RuntimeError):
            asyncio.run(_enter_lifespan())

    def test_warmup_helper_preloads_llm_and_embedding_models_with_keep_alive(self):
        # Task #16: warm-up calls both /api/generate and /api/embeddings with OLLAMA_KEEP_ALIVE.
        with patch("app.main.httpx.post") as mock_post:
            main_module._warmup_ollama_models()
        self.assertEqual(mock_post.call_count, 2)
        first_payload = mock_post.call_args_list[0].kwargs["json"]
        second_payload = mock_post.call_args_list[1].kwargs["json"]
        self.assertEqual(first_payload["model"], settings.LLM_MODEL)
        self.assertEqual(first_payload["keep_alive"], settings.OLLAMA_KEEP_ALIVE)
        self.assertEqual(second_payload["model"], settings.EMBEDDING_MODEL)


if __name__ == "__main__":
    unittest.main()
