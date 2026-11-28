"""Task 20: a conclusion must not call an expense deductible when a retrieved rule says it is not (CP-03/05/08/13)."""

from pathlib import Path
import sys
from types import SimpleNamespace
import unittest

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.modules.rag.guardrails import contradicts_non_deductible_rule  # noqa: E402

UNPAID_CAPITAL = (
    "Nghị định 320/2025/NĐ-CP — Điều 10. Các khoản chi không được trừ khi xác định thu nhập chịu thuế — Khoản 9 "
    "9. Chi trả lãi tiền vay tương ứng với phần vốn điều lệ (đối với doanh nghiệp tư nhân là vốn đầu tư) đã đăng ký "
    "còn thiếu theo tiến độ góp vốn ghi trong điều lệ của doanh nghiệp nhưng tiến độ góp vốn tối đa không được vượt "
    "quá thời hạn góp vốn theo quy định của Luật Doanh nghiệp kể cả trường hợp doanh nghiệp đã đi vào sản xuất kinh doanh."
)
PENALTIES = (
    "Nghị định 320/2025/NĐ-CP — Điều 10. Các khoản chi không được trừ khi xác định thu nhập chịu thuế — Khoản 15 "
    "15. Các khoản tiền phạt về vi phạm hành chính bao gồm: vi phạm luật giao thông, vi phạm chế độ đăng ký kinh doanh, "
    "vi phạm hành chính về thuế; tiền chậm nộp thuế theo quy định của Luật Quản lý thuế."
)
CASH = (
    "Thông tư 20/2026/TT-BTC — Điều 3. Hồ sơ của khoản chi được tính vào chi phí được trừ — Khoản 5 "
    "5. Hóa đơn mua hàng hóa, dịch vụ từng lần có giá trị từ 05 triệu đồng trở lên (giá đã bao gồm thuế GTGT) "
    "phải có chứng từ thanh toán không dùng tiền mặt. Trường hợp mua hàng hóa, dịch vụ của cùng một người bán "
    "nhiều lần trong cùng một ngày có tổng giá trị từ 05 triệu đồng trở lên thì cũng phải có chứng từ thanh toán "
    "không dùng tiền mặt."
)
UNIFORMS = (
    "Nghị định 320/2025/NĐ-CP — Điều 10. Các khoản chi không được trừ khi xác định thu nhập chịu thuế — Khoản 6 "
    "6. Phần chi trang phục bằng tiền cho người lao động vượt quá 05 triệu đồng/người/năm. Chi trang phục bằng "
    "tiền cho người lao động không quá 05 triệu đồng/người/năm."
)
WAGES = (
    "Luật 67/2025/QH15 — Điều 9. Các khoản chi được trừ và không được trừ khi xác định thu nhập chịu thuế — Khoản 1 "
    "1. Doanh nghiệp được trừ mọi khoản chi nếu đáp ứng đủ các điều kiện: khoản chi thực tế phát sinh liên quan đến "
    "hoạt động sản xuất, kinh doanh, kể cả tiền lương trả cho người lao động; có hóa đơn, chứng từ."
)


def _hit(text: str):
    return SimpleNamespace(score=0.8, payload={"text_content": text, "document_number": "320/2025/NĐ-CP"})


class NonDeductibleListTests(unittest.TestCase):
    def test_cp13_interest_on_unpaid_charter_capital(self):
        question = (
            "Thành viên chưa góp đủ vốn điều lệ theo tiến độ, công ty đi vay ngân hàng. Lãi vay có được trừ không?"
        )
        wrong = "Chi trả lãi tiền vay tương ứng với phần vốn điều lệ còn thiếu được trừ khi xác định thu nhập chịu thuế [1]."
        note = contradicts_non_deductible_rule(question, wrong, [_hit(UNPAID_CAPITAL)])
        self.assertIsNotNone(note)
        self.assertIn("KHÔNG được trừ", note)
        right = "Lãi tiền vay tương ứng với phần vốn điều lệ còn thiếu không được trừ [1]."
        self.assertIsNone(contradicts_non_deductible_rule(question, right, [_hit(UNPAID_CAPITAL)]))

    def test_cp05_late_payment_interest(self):
        question = (
            "Công ty nộp thuế trễ bị tính tiền chậm nộp. Tiền chậm nộp này có được tính vào chi phí được trừ không?"
        )
        wrong = "Tiền chậm nộp có thể được tính vào chi phí được trừ, nhưng phải tuân theo quy định [1]."
        self.assertIsNotNone(contradicts_non_deductible_rule(question, wrong, [_hit(PENALTIES)]))

    def test_unrelated_item_on_the_same_list_is_ignored(self):
        question = "Công ty vay ngân hàng để sản xuất kinh doanh, lãi vay có được trừ không?"
        answer = "Lãi vay ngân hàng phục vụ sản xuất kinh doanh được trừ khi có hợp đồng và chứng từ [1]."
        self.assertIsNone(contradicts_non_deductible_rule(question, answer, [_hit(UNPAID_CAPITAL)]))

    def test_deductible_list_is_not_treated_as_non_deductible(self):
        question = "Chi tiền lương trả cho người lao động có được trừ không?"
        answer = "Tiền lương trả cho người lao động được trừ khi có hóa đơn, chứng từ [1]."
        self.assertIsNone(contradicts_non_deductible_rule(question, answer, [_hit(WAGES)]))

    def test_non_deductibility_question_is_ignored(self):
        question = "Tiền chậm nộp thuế được tính theo mức bao nhiêu mỗi ngày?"
        answer = "Tiền chậm nộp được tính theo quy định [1]."
        self.assertIsNone(contradicts_non_deductible_rule(question, answer, [_hit(PENALTIES)]))


class EvalFalsePositiveTests(unittest.TestCase):
    """Correct or partly correct answers from the 28/11 v1.0 run that an earlier draft of the check blocked."""

    def test_pv06_case_of_a_conditional_list_is_not_the_general_rule(self):
        chunk = (
            "Nghị định 320/2025/NĐ-CP — Điều 10. Các khoản chi không được trừ khi xác định thu nhập chịu thuế — Khoản 6\n"
            "6. Chi khấu hao tài sản cố định thuộc một trong các trường hợp sau:\n"
            "a) Chi khấu hao đối với tài sản cố định không sử dụng cho hoạt động sản xuất, kinh doanh hàng hóa, dịch vụ."
        )
        question = "Chi phí khấu hao tài sản cố định của dự án đầu tư có được trừ khi tính thuế TNDN không?"
        answer = "Chi phí khấu hao tài sản cố định của dự án đầu tư được trừ khi tính thuế TNDN [1]."
        self.assertIsNone(contradicts_non_deductible_rule(question, answer, [_hit(chunk)]))

    def test_cp16_deductible_article_mentioning_article_10_is_ignored(self):
        chunk = (
            "Nghị định 320/2025/NĐ-CP — Điều 9. Các khoản chi được trừ khi xác định thu nhập chịu thuế — Khoản 1\n"
            "1. Trừ các khoản chi không được trừ quy định tại Điều 10 của Nghị định này, doanh nghiệp được trừ các "
            "khoản chi khi xác định thu nhập chịu thuế nếu đáp ứng đủ điều kiện tại các điểm a, b và c sau đây:\n"
            "a) Khoản chi thực tế phát sinh liên quan đến hoạt động sản xuất, kinh doanh của doanh nghiệp, bao gồm cả "
            "khoản chi phí bổ sung được trừ theo tỷ lệ phần trăm tính trên chi phí thực tế phát sinh trong kỳ tính thuế "
            "liên quan đến hoạt động nghiên cứu và phát triển của doanh nghiệp;"
        )
        question = "Chi phí nghiên cứu và phát triển có được tính tăng thêm vào chi phí được trừ không?"
        answer = "Được trừ chi phí nghiên cứu và phát triển theo tỷ lệ phần trăm tính trên chi phí thực tế phát sinh [1]."
        self.assertIsNone(contradicts_non_deductible_rule(question, answer, [_hit(chunk)]))

    def test_cp15_cap_question_is_not_a_yes_no_question(self):
        chunk = (
            "Nghị định 320/2025/NĐ-CP — Điều 10. Các khoản chi không được trừ khi xác định thu nhập chịu thuế — Khoản 4\n"
            "c) Chi trả lãi tiền vay của doanh nghiệp có giao dịch liên kết theo quy định của pháp luật về quản lý thuế "
            "đối với doanh nghiệp có giao dịch liên kết;"
        )
        question = "Chi phí lãi vay trong giao dịch liên kết được trừ tối đa bao nhiêu khi tính thuế TNDN năm 2026?"
        answer = "Chi phí lãi vay trong giao dịch liên kết được tính vào chi phí được trừ trong kỳ [1]."
        self.assertIsNone(contradicts_non_deductible_rule(question, answer, [_hit(chunk)]))

    def test_cp08_cash_allowance_is_not_a_purchase_from_a_seller(self):
        question = "Công ty chi tiền mặt mua đồng phục cho mỗi nhân viên 6 triệu/năm thì có được trừ hết không?"
        answer = "Công ty có thể được trừ 6 triệu/năm cho mỗi nhân viên [1]."
        self.assertIsNone(contradicts_non_deductible_rule(question, answer, [_hit(CASH)]))


class CashPaymentTests(unittest.TestCase):
    QUESTION = (
        "Trong một ngày công ty mua của cùng một người bán 3 lần, mỗi lần 3 triệu, đều trả tiền mặt. "
        "Có được tính chi phí không?"
    )

    def test_cp03_repeated_cash_purchases_add_up(self):
        wrong = "Có được tính chi phí vì đã có hóa đơn, chứng từ chi trả tiền cho người bán [1]."
        note = contradicts_non_deductible_rule(self.QUESTION, wrong, [_hit(CASH)])
        self.assertIsNotNone(note)
        self.assertIn("9 triệu", note)

    def test_answer_naming_the_non_cash_condition_passes(self):
        answer = "Chỉ được tính chi phí khi có chứng từ thanh toán không dùng tiền mặt vì tổng từ 05 triệu đồng trở lên [1]."
        self.assertIsNone(contradicts_non_deductible_rule(self.QUESTION, answer, [_hit(CASH)]))

    def test_small_cash_purchase_passes(self):
        question = "Công ty mua văn phòng phẩm 2 triệu trả tiền mặt có được tính chi phí không?"
        answer = "Được tính vào chi phí được trừ nếu có hóa đơn [1]."
        self.assertIsNone(contradicts_non_deductible_rule(question, answer, [_hit(CASH)]))


class PerPersonCapTests(unittest.TestCase):
    QUESTION = "Công ty chi tiền mặt mua đồng phục cho mỗi nhân viên 6 triệu/năm thì có được trừ hết không?"

    def test_cp08_uniform_above_cap(self):
        wrong = "Công ty có thể được trừ 6 triệu/năm cho mỗi nhân viên vào chi phí được trừ [1]."
        note = contradicts_non_deductible_rule(self.QUESTION, wrong, [_hit(UNIFORMS)])
        self.assertIsNotNone(note)
        self.assertIn("5 triệu đồng/người/năm", note)

    def test_answer_with_cap_passes(self):
        answer = "Chi trang phục bằng tiền chỉ được trừ tối đa 5 triệu/người/năm; phần vượt không được trừ [1]."
        self.assertIsNone(contradicts_non_deductible_rule(self.QUESTION, answer, [_hit(UNIFORMS)]))


if __name__ == "__main__":
    unittest.main()
