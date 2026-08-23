"""
ClaimGuard AI
Investigator Schemas
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)


# ============================================================
# INVESTIGATOR REGISTRATION REQUEST
# ============================================================

class InvestigatorRegistrationRequest(BaseModel):
    """
    Investigator submits a registration request.

    Password is NOT provided during registration.
    """

    full_name: str = Field(
        min_length=2,
        max_length=200,
    )

    email: EmailStr

    phone_number: Optional[str] = Field(
        default=None,
        max_length=20,
    )


# ============================================================
# INVESTIGATOR REGISTRATION RESPONSE
# ============================================================

class InvestigatorRegistrationResponse(BaseModel):

    message: str

    investigator_id: str

    status: str


# ============================================================
# ADMIN DECISION
# ============================================================

class InvestigatorRegistrationDecisionRequest(BaseModel):
    """
    Admin approves or rejects an investigator
    registration request.
    """

    decision: Literal[
        "APPROVE",
        "REJECT",
    ]

    reason: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


# ============================================================
# ADMIN DECISION RESPONSE
# ============================================================

class InvestigatorRegistrationDecisionResponse(BaseModel):

    message: str

    investigator_id: str

    status: str


# ============================================================
# INVESTIGATOR LOGIN
# ============================================================

class InvestigatorLoginRequest(BaseModel):

    email: EmailStr

    password: str


__all__ = [
    "InvestigatorRegistrationRequest",
    "InvestigatorRegistrationResponse",
    "InvestigatorRegistrationDecisionRequest",
    "InvestigatorRegistrationDecisionResponse",
    "InvestigatorLoginRequest",
]