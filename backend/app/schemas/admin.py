"""
ClaimGuard AI
Admin Schemas
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ============================================================
# PROVIDER REGISTRATION DECISION
# ============================================================

class ProviderRegistrationDecisionRequest(BaseModel):
    """
    Admin decision for a pending provider.

    APPROVE:
        reason is optional.

    REJECT:
        reason should explain why the provider was rejected.
    """

    decision: Literal[
        "APPROVE",
        "REJECT",
    ]

    reason: str | None = Field(
        default=None,
        max_length=1000,
    )


# ============================================================
# RESPONSE
# ============================================================

class ProviderRegistrationDecisionResponse(BaseModel):

    message: str

    provider_id: str

    status: str


__all__ = [
    "ProviderRegistrationDecisionRequest",
    "ProviderRegistrationDecisionResponse",
]