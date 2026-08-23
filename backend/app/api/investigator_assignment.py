"""
ClaimGuard AI
Investigator Assignment API
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

from app.services.investigation_service import (
    investigation_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/investigator",
    tags=["Investigator"],
)


# ============================================================
# ASSIGN INVESTIGATION
# ============================================================

@router.post(
    "/investigations/{investigation_id}/assign",
)
def assign_investigation(
    investigation_id: str,
    current_investigator: dict = Depends(
        get_current_investigator
    ),
):

    try:

        # ====================================================
        # GET INVESTIGATOR ID FROM JWT
        # ====================================================

        investigator_id = (
            current_investigator["id"]
        )

        # ====================================================
        # ASSIGN INVESTIGATION
        # ====================================================

        result = (
            investigation_service
            .assign_investigation(
                investigation_id=investigation_id,
                investigator_id=investigator_id,
            )
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error":
                    "ASSIGNMENT_FAILED",

                "message":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Investigation assignment failed."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "ASSIGNMENT_ERROR",

                "message":
                    "Unable to assign investigation.",
            },
        ) from exc


__all__ = [
    "router",
]