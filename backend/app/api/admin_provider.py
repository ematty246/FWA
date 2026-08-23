"""
ClaimGuard AI
Admin Provider Approval API
"""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    HTTPException,
)

from app.schemas.admin import (
    ProviderRegistrationDecisionRequest,
    ProviderRegistrationDecisionResponse,
)

from app.services.provider_approval_service import (
    provider_approval_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/admin/providers",
    tags=["Admin Provider Approval"],
)


# ============================================================
# PENDING PROVIDERS
# ============================================================

@router.get(
    "/pending",
)
def get_pending_providers():

    try:

        return (
            provider_approval_service
            .get_pending_providers()
        )

    except Exception as exc:

        logger.exception(
            "Failed to load pending providers."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "PENDING_PROVIDERS_LOAD_FAILED",

                "message":
                    "Unable to load pending providers.",
            },
        ) from exc


# ============================================================
# PROVIDER APPROVAL / REJECTION
# ============================================================

@router.post(
    "/{provider_id}/decision",
    response_model=ProviderRegistrationDecisionResponse,
)
def provider_decision(
    provider_id: str,
    request: ProviderRegistrationDecisionRequest,
):

    try:

        # ----------------------------------------------------
        # APPROVE
        # ----------------------------------------------------

        if request.decision == "APPROVE":

            return (
                provider_approval_service
                .approve_provider(
                    provider_id=provider_id,
                )
            )

        # ----------------------------------------------------
        # REJECT
        # ----------------------------------------------------

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
                provider_approval_service
                .reject_provider(
                    provider_id=provider_id,
                    reason=request.reason,
                )
            )

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
                    "PROVIDER_DECISION_FAILED",

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
            "Provider approval/rejection failed."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "PROVIDER_DECISION_ERROR",

                "message":
                    "Unable to process provider decision.",
            },
        ) from exc


__all__ = [
    "router",
]