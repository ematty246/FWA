"""
ClaimGuard AI
New Provider Claim Submission API
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
    get_current_provider,
)

from app.schemas.claim_submission import (
    ClaimSubmissionRequest,
    ClaimSubmissionResponse,
)

from app.services.claim_service import (
    claim_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/provider",
    tags=["Provider Claims"],
)


# ============================================================
# SUBMIT NEW CLAIM
# ============================================================
@router.post(
    "/claims",
    response_model=ClaimSubmissionResponse,
)
def submit_claim(
    request: ClaimSubmissionRequest,
    current_provider: dict = Depends(
        get_current_provider
    ),
):

    try:

        provider_id = (
            current_provider["id"]
            .strip()
            .upper()
        )

        return (
            claim_service
            .submit_claim(
                claim_data=request,
                provider_id=provider_id,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        logger.exception(
            "New claim submission failed."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to submit claim.",
        ) from exc

    except RuntimeError as exc:

        raise HTTPException(
            status_code=503,
            detail={
                "error":
                    "CLAIM_SERVICE_UNAVAILABLE",

                "message":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "New claim submission failed."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "CLAIM_SUBMISSION_ERROR",

                "message":
                    "Unable to process claim submission.",
            },
        ) from exc
    # ============================================================
# ASSESS EXISTING PROVIDER
# ============================================================
@router.post(
    "/assess",
)
def assess_existing_provider(
    current_provider: dict = Depends(
        get_current_provider
    ),
):

    try:

        provider_id = (
            current_provider["id"]
            .strip()
            .upper()
        )

        return (
            claim_service
            .assess_existing_provider(
                provider_id=provider_id,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error":
                    "PROVIDER_ASSESSMENT_UNAVAILABLE",

                "message":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Existing provider assessment failed."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error":
                    "PROVIDER_ASSESSMENT_ERROR",

                "message":
                    "Unable to assess provider.",
            },
        ) from exc


__all__ = [
    "router",
]