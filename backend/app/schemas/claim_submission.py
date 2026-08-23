"""
ClaimGuard AI
Claim Submission Schemas
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


# ============================================================
# CLAIM SUBMISSION REQUEST
# ============================================================

class ClaimSubmissionRequest(BaseModel):

    claim_id: str = Field(
        ...,
        min_length=1,
    )

    claim_type: str

    beneficiary_id: str

    claim_reimbursement: float

    claim_deductible: float

    total_claim_cost: float

    claim_start_dt: date

    claim_end_dt: date

    beneficiary_age: int

    chronic_condition_count: int

    diagnosis_count: int

    procedure_count: int

    physician_count: int

    attending_physician_id: Optional[str] = None

    operating_physician_id: Optional[str] = None

    other_physician_id: Optional[str] = None


# ============================================================
# CLAIM SUBMISSION RESPONSE
# ============================================================

class ClaimSubmissionResponse(BaseModel):

    message: str

    claim_id: str

    provider_id: str
    beneficiary_id: str


    provider_status: str

    previous_claim_count: int

    current_claim_count: int

    fraud_probability: Optional[float] = None

    claim_anomaly_score: Optional[float] = None

    claim_anomaly_score_100: Optional[float] = None

    combined_risk_score: Optional[float] = None

    claim_risk_tier: str

    investigation_created: bool

    investigation_id: Optional[str] = None

    investigation_priority: Optional[str] = None

    investigation_status: Optional[str] = None

    claim_anomaly_assessed: bool = False

    claim_anomaly_error: Optional[str] = None
    beneficiary_id: str
    attending_physician_id: str | None = None
    operating_physician_id: str | None = None
    other_physician_id: str | None = None
# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ClaimSubmissionRequest",
    "ClaimSubmissionResponse",
]