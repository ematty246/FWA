"""
ClaimGuard AI
Provider Risk Profile API
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

from app.schemas.provider_risk import (
    ProviderRiskProfileResponse,
)

from app.services.provider_risk_service import (
    provider_risk_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/investigator",
    tags=["Investigator"],
)


# ============================================================
# PROVIDER RISK PROFILE
# ============================================================

@router.get(
    "/providers/{provider_id}/risk-profile",
    response_model=ProviderRiskProfileResponse,
)
def get_provider_risk_profile(
    provider_id: str,
    current_investigator: dict = Depends(
        get_current_investigator
    ),
):
    """
    Return the complete risk profile for a provider.

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
            detail="Provider ID is required.",
        )

    try:

        # ====================================================
        # GET PROVIDER PROFILE
        # ====================================================

        return (
            provider_risk_service
            .get_provider_risk_profile(
                provider_id=provider_id
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error":
                    "PROVIDER_NOT_FOUND",

                "message":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Failed to load provider risk profile "
            "for %s",
            provider_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error":
                    "RISK_PROFILE_LOAD_FAILED",

                "message":
                    "Unable to load provider risk profile.",
            },
        ) from exc


__all__ = [
    "router",
]