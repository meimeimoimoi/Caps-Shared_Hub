import unittest

from fastapi import HTTPException

from app.core.ai_response import parse_ai_response
from app.schemas.ai_results import DraftContent, ScopeAnalysis


class AiResponseTests(unittest.TestCase):
    def test_scope_accepts_fenced_json_and_dates(self):
        result = parse_ai_response(
            '```json\n{"is_cit":true,"period_start":"2025-01-01",'
            '"period_end":"2025-12-31","needs_clarification":false}\n```',
            ScopeAnalysis,
        )
        self.assertEqual(result.period_start.isoformat(), "2025-01-01")

    def test_scope_rejects_invalid_flags_dates_and_period_order(self):
        responses = [
            '{"is_cit":"false","period_start":null,"period_end":null,'
            '"needs_clarification":false}',
            '{"is_cit":true,"period_start":"2025-02-30",'
            '"period_end":"2025-12-31","needs_clarification":false}',
            '{"is_cit":true,"period_start":"2026-01-01",'
            '"period_end":"2025-12-31","needs_clarification":false}',
            '{}',
        ]
        for response in responses:
            with self.subTest(response=response):
                with self.assertRaises(HTTPException) as raised:
                    parse_ai_response(response, ScopeAnalysis)
                self.assertEqual(raised.exception.status_code, 502)

    def test_missing_period_remains_missing(self):
        result = parse_ai_response(
            '{"is_cit":true,"period_start":null,"period_end":null,'
            '"needs_clarification":false}',
            ScopeAnalysis,
        )
        self.assertIsNone(result.period_start)
        self.assertIsNone(result.period_end)

    def test_draft_requires_json_object(self):
        for response in ('not JSON', '[]', 'null', '{"amount":'):
            with self.subTest(response=response):
                with self.assertRaises(HTTPException) as raised:
                    parse_ai_response(response, DraftContent)
                self.assertEqual(raised.exception.status_code, 502)
        self.assertEqual(
            parse_ai_response('{"amount":100}', DraftContent).root,
            {"amount": 100},
        )


if __name__ == "__main__":
    unittest.main()
