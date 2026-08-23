"""
ClaimGuard AI
Admin Investigator Approval API
"""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from app.schemas.investigator import (
    InvestigatorRegistrationDecisionRequest,
    InvestigatorRegistrationDecisionResponse,
)

from app.services.investigator_approval_service import (
    investigator_approval_service,
)

from app.core.security import (
    get_current_admin,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/admin/investigators",
    tags=["Admin Investigator Approval"],
)


# ============================================================
# PENDING INVESTIGATORS
# ============================================================

@router.get(
    "/pending",
)
def get_pending_investigators(
    current_admin: dict = Depends(
        get_current_admin
    ),
):

    try:

        return (
            investigator_approval_service
            .get_pending_investigators()
        )

    except Exception as exc:

        logger.exception(
            "Failed to load pending investigators."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "PENDING_INVESTIGATORS_LOAD_FAILED",

                "message":
                    "Unable to load pending investigators.",
            },
        ) from exc


# ============================================================
# INVESTIGATOR APPROVAL / REJECTION
# ============================================================

@router.post(
    "/{investigator_id}/decision",
    response_model=InvestigatorRegistrationDecisionResponse,
)
def investigator_decision(
    investigator_id: str,
    request: InvestigatorRegistrationDecisionRequest,
    current_admin: dict = Depends(
        get_current_admin
    ),
):

    investigator_id = (
        investigator_id.strip()
    )

    try:

        # ====================================================
        # APPROVE
        # ====================================================

        if request.decision == "APPROVE":

            return (
                investigator_approval_service
                .approve_investigator(
                    investigator_id=
                        investigator_id,
                )
            )

        # ====================================================
        # REJECT
        # ====================================================

        if request.decision == "REJECT":

            if not request.reason:

                raise HTTPException(
                    status_code=400,
                    detail={
                        "error":
                            "REASON_REQUIRED",

                        "message":
                            "Rejection reason is required.",
                    },
                )

            return (
                investigator_approval_service
                .reject_investigator(
                    investigator_id=
                        investigator_id,

                    reason=
                        request.reason,
                )
            )

        # ====================================================
        # INVALID DECISION
        # ====================================================

        raise HTTPException(
            status_code=400,
            detail={
                "error":
                    "INVALID_DECISION",

                "message":
                    "Decision must be APPROVE or REJECT.",
            },
        )

    except HTTPException:
        raise

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail={
                "error":
                    "INVESTIGATOR_DECISION_FAILED",

                "message":
                    str(exc),
            },
        ) from exc

    except RuntimeError as exc:

        raise HTTPException(
            status_code=503,
            detail={
                "error":
                    "SERVICE_UNAVAILABLE",

                "message":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Investigator approval/rejection failed."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "INVESTIGATOR_DECISION_ERROR",

                "message":
                    "Unable to process investigator decision.",
            },
        ) from exc


__all__ = [
    "router",
]