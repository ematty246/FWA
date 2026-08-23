"""
ClaimGuard AI
Provider Historical Claims Schemas
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


# ============================================================
# SINGLE HISTORICAL CLAIM
# ============================================================

class ProviderClaimItem(BaseModel):

    claim_id: str

    claim_type: Optional[str] = None

    claim_start_date: Optional[date] = None

    total_claim_cost: Optional[float] = None

    claim_duration: Optional[int] = None

    beneficiary_age: Optional[int] = None

    status: Optional[str] = None

    claim_risk_tier: Optional[str] = None

    claim_anomaly_score: Optional[float] = None

    source: Optional[str] = None


# ============================================================
# PROVIDER HISTORICAL CLAIMS RESPONSE
# ============================================================

class ProviderClaimsResponse(BaseModel):

    provider_id: str

    total_claims: int

    risk_distribution: Optional[dict] = None

    claims: list[ProviderClaimItem]


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ProviderClaimItem",
    "ProviderClaimsResponse",
]