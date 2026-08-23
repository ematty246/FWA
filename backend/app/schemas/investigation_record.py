from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
class InvestigationRecordCreateRequest(BaseModel):
    investigation_id: str
    investigator_id: str
    provider_id: str
    overall_fwa_risk: float

class InvestigationRecordCreate(BaseModel):
    investigation_id: str
    investigator_id: str
    provider_id: str
    overall_fwa_risk: Optional[float] = None
    summary_document_url: Optional[str] = None


class InvestigationDecisionUpdate(BaseModel):
    decision: str = Field(
        ...,
        pattern="^(CONTINUE_REVIEW|ESCALATE|REJECT)$",
    )
    reason: str = Field(..., min_length=1)


class InvestigationRecordResponse(BaseModel):
    id: str
    investigation_id: str
    investigator_id: str
    provider_id: str
    overall_fwa_risk: Optional[float] = None
    summary_document_url: Optional[str] = None
    decision: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    decision_by: Optional[str] = None
    decision_at: Optional[datetime] = None

