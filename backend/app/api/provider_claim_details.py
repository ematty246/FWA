"""
ClaimGuard AI
Provider Claim Details API
"""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from app.core.security import (
    get_current_investigator,
)

from app.services.provider_claims_service import (
    provider_claims_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/investigator",
    tags=["Investigator"],
)


# ============================================================
# SINGLE CLAIM DETAILS
# ============================================================

@router.get(
    "/providers/{provider_id}/claims/{claim_id}",
)
def get_claim_details(
    provider_id: str,
    claim_id: str,
    current_investigator: dict = Depends(
        get_current_investigator
    ),
):
    """
    Return detailed information for one claim.

    Access:
        INVESTIGATOR only
    """

    # ========================================================
    # NORMALIZE IDS
    # ========================================================

    provider_id = (
        provider_id
        .strip()
        .upper()
    )

    claim_id = (
        claim_id
        .strip()
        .upper()
    )

    if not provider_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider ID is required.",
        )

    if not claim_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim ID is required.",
        )

    # ========================================================
    # FETCH CLAIM DETAILS
    # ========================================================

    try:

        return (
            provider_claims_service
            .get_claim_details(
                provider_id=provider_id,
                claim_id=claim_id,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error":
                    "CLAIM_NOT_FOUND",

                "message":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Failed to load claim details "
            "for claim %s and provider %s",
            claim_id,
            provider_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error":
                    "CLAIM_DETAILS_LOAD_FAILED",

                "message":
                    "Unable to load claim details.",
            },
        ) from exc


__all__ = [
    "router",
]