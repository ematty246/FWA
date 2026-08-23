"""
ClaimGuard AI
Investigation Schemas
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


InvestigationStatus = Literal[
    "UNASSIGNED",
    "ASSIGNED",
]


class InvestigationQueueItem(BaseModel):
    rank: int
    investigation_id: str
    provider_id: str
    overall_fwa_score: float | None = None
    anomalous_claims: int | None = None
    investigation_priority: str | None = None
    status: InvestigationStatus
    assigned_investigator_id: Optional[str] = None      # 👈 new
    assigned_investigator_name: Optional[str] = None    # 👈 new


class InvestigationQueueResponse(BaseModel):
    total: int
    investigations: list[InvestigationQueueItem]


__all__ = [
    "InvestigationStatus",
    "InvestigationQueueItem",
    "InvestigationQueueResponse",
]