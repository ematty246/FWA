"""
ClaimGuard AI
Peer Comparison API
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

from app.services.peer_comparison_service import (
    peer_comparison_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/investigator",
    tags=["Investigator"],
)


# ============================================================
# PEER COMPARISON
# ============================================================

@router.get(
    "/providers/{provider_id}/peer-comparison",
)
def get_peer_comparison(
    provider_id: str,
    current_investigator: dict = Depends(
        get_current_investigator
    ),
):
    """
    Get peer comparison for a provider.

    Access:
        INVESTIGATOR only

    Returns:
        - provider_id
        - overall_fwa_risk
        - peer_group
        - peer providers
        - each peer's FWA score
        - each peer's total claims
        - each peer's average claim reimbursement
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

    # ========================================================
    # FETCH PEER COMPARISON
    # ========================================================

    try:

        return (
            peer_comparison_service
            .get_peer_comparison(
                provider_id=provider_id
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error":
                    "PEER_COMPARISON_NOT_FOUND",

                "message":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Failed to load peer comparison "
            "for provider %s",
            provider_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error":
                    "PEER_COMPARISON_LOAD_FAILED",

                "message":
                    "Unable to load peer comparison.",
            },
        ) from exc


__all__ = [
    "router",
]