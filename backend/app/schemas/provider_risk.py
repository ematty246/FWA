"""
ClaimGuard AI
Provider Risk Profile Schemas
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ============================================================
# LOCATION
# ============================================================

class ProviderLocation(BaseModel):

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    google_maps_url: Optional[str] = None


# ============================================================
# PROVIDER RISK PROFILE
# ============================================================

class ProviderRiskProfileResponse(BaseModel):

    provider_id: str

    provider_name: Optional[str] = None

    location: ProviderLocation

    # ========================================================
    # CLAIM INFORMATION
    # ========================================================

    total_claims: int = Field(
        default=0,
        ge=0,
    )

    total_beneficiaries: int = Field(
        default=0,
        ge=0,
    )

    average_claim_reimbursement: Optional[float] = None

    # ========================================================
    # CLAIM RISK DISTRIBUTION
    # ========================================================

    very_high_risk_claims: int = Field(
        default=0,
        ge=0,
    )

    high_risk_claims: int = Field(
        default=0,
        ge=0,
    )

    medium_risk_claims: int = Field(
        default=0,
        ge=0,
    )

    low_risk_claims: int = Field(
        default=0,
        ge=0,
    )

    # ========================================================
    # PROVIDER RISK SCORES
    # ========================================================

    fraud_risk_score: Optional[float] = None

    waste_risk_score: Optional[float] = None

    abuse_risk_score: Optional[float] = None
    overall_fwa_score: Optional[float] = None


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ProviderLocation",
    "ProviderRiskProfileResponse",
]