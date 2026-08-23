"""
ClaimGuard AI
Provider Historical Claims API
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

from app.schemas.provider_claims import (
    ProviderClaimsResponse,
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
# PROVIDER HISTORICAL CLAIMS
# ============================================================

@router.get(
    "/providers/{provider_id}/claims",
    response_model=ProviderClaimsResponse,
)
def get_provider_claims(
    provider_id: str,
    current_investigator: dict = Depends(
        get_current_investigator
    ),
):
    """
    Return historical and submitted claims
    for a specific provider.

    The service is responsible for:
        - loading provider_claims
        - loading claims
        - merging duplicate claim IDs
        - converting claim_start_dt to claim_start_date
        - returning the correct risk tier
        - returning the claim source

    Only authenticated INVESTIGATOR users
    can access this endpoint.
    """

    # ========================================================
    # NORMALIZE PROVIDER ID
    # ========================================================

    provider_id = (
        provider_id
        .strip()
        .upper()
    )

    if not provider_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error":
                    "INVALID_PROVIDER_ID",

                "message":
                    "Provider ID is required.",
            },
        )

    # ========================================================
    # FETCH CLAIMS
    # ========================================================

    try:

        result = (
            provider_claims_service
            .get_provider_claims(
                provider_id=provider_id
            )
        )

        return result

    # ========================================================
    # PROVIDER / CLAIM DATA NOT FOUND
    # ========================================================

    except ValueError as exc:

        message = str(exc)

        if "Provider not found" in message:

            error_code = (
                "PROVIDER_NOT_FOUND"
            )

        elif "No historical claims" in message:

            error_code = (
                "CLAIMS_NOT_FOUND"
            )

        else:

            error_code = (
                "CLAIMS_NOT_FOUND"
            )

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error":
                    error_code,

                "message":
                    message,
            },
        ) from exc

    # ========================================================
    # UNEXPECTED ERROR
    # ========================================================

    except Exception as exc:

        logger.exception(
            "Failed to load claims "
            "for provider %s",
            provider_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error":
                    "CLAIMS_LOAD_FAILED",

                "message":
                    "Unable to load provider claims.",
            },
        ) from exc


__all__ = [
    "router",
]