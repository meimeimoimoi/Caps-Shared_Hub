from datetime import date
from typing import Any

from pydantic import BaseModel, RootModel, StrictBool, model_validator


class ScopeAnalysis(BaseModel):
    is_cit: StrictBool
    period_start: date | None
    period_end: date | None
    needs_clarification: StrictBool
    clarification_msg: str | None = None

    @model_validator(mode="after")
    def validate_period(self):
        if self.period_start and self.period_end and self.period_start > self.period_end:
            raise ValueError("period_start must not exceed period_end")
        return self


class DraftContent(RootModel[dict[str, Any]]):
    pass
