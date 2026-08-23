"""
ClaimGuard AI
Investigator Queue API
"""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from app.schemas.investigation import (
    InvestigationQueueResponse,
)

from app.services.investigation_service import (
    investigation_service,
)

from app.core.security import (
    get_current_investigator,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/investigator",
    tags=["Investigator"],
)


# ============================================================
# INVESTIGATION QUEUE
# ============================================================

@router.get(
    "/queue",
    response_model=InvestigationQueueResponse,
)
def get_investigation_queue(
    current_investigator: dict = Depends(
        get_current_investigator
    ),
):

    try:

        return (
            investigation_service
            .get_queue()
        )

    except Exception as exc:

        logger.exception(
            "Failed to load investigation queue."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "QUEUE_LOAD_FAILED",

                "message":
                    "Unable to load investigation queue.",
            },
        ) from exc




__all__ = [
    "router",
]