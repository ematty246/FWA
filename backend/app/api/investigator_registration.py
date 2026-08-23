"""
ClaimGuard AI
Investigator Registration API
"""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    HTTPException,
)

from app.schemas.investigator import (
    InvestigatorRegistrationRequest,
    InvestigatorRegistrationResponse,
)

from app.services.investigator_service import (
    investigator_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/investigator",
    tags=["Investigator Registration"],
)


# ============================================================
# INVESTIGATOR REGISTRATION
# ============================================================

@router.post(
    "/register",
    response_model=InvestigatorRegistrationResponse,
)
def register_investigator(
    request: InvestigatorRegistrationRequest,
):

    try:

        result = (
            investigator_service
            .register_investigator(
                full_name=request.full_name,
                email=str(request.email),
                phone_number=request.phone_number,
            )
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail={
                "error":
                    "REGISTRATION_FAILED",

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
            "Investigator registration failed."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "REGISTRATION_ERROR",

                "message":
                    (
                        "Unable to process investigator "
                        "registration."
                    ),
            },
        ) from exc


__all__ = [
    "router",
]