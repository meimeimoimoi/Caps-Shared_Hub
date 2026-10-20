from enum import StrEnum


class ErrorMessage(StrEnum):
    EMPTY_DOCUMENT = "Không có nội dung để chunk."
    INVALID_AI_RESPONSE = "AI trả về dữ liệu không hợp lệ. Vui lòng thử lại."
    INTERNAL_ERROR = "Hệ thống gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại."
