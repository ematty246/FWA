"""
ClaimGuard AI
Peer Comparison Detail API
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

from app.services.peer_comparison_detail_service import (
    peer_comparison_detail_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/investigator",
    tags=["Investigator"],
)


# ============================================================
# DETAILED PEER COMPARISON
# ============================================================

@router.get(
    "/providers/{provider_id}/peer-comparison/details",
)
def get_detailed_peer_comparison(
    provider_id: str,
    current_investigator: dict = Depends(
        get_current_investigator
    ),
):

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

        return (
            peer_comparison_detail_service
            .get_detailed_comparison(
                provider_id
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error":
                    "PEER_COMPARISON_DETAIL_NOT_FOUND",

                "message":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Failed to load detailed peer "
            "comparison for %s",
            provider_id,
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "PEER_COMPARISON_DETAIL_LOAD_FAILED",

                "message":
                    "Unable to load detailed "
                    "peer comparison.",
            },
        ) from exc


__all__ = [
    "router",
]