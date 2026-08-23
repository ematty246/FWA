"""
ClaimGuard AI
Provider Registration API
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.provider import (
    ProviderRegistrationRequest,
    ProviderRegistrationResponse,
)

from app.services.provider_registration_service import (
    provider_registration_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/provider",
    tags=["Provider Registration"],
)


# ============================================================
# PROVIDER REGISTRATION
# ============================================================

@router.post(
    "/register",
    response_model=ProviderRegistrationResponse,
)
def register_provider(
    request: ProviderRegistrationRequest,
):

    try:

        result = (
            provider_registration_service
            .register_provider(
                provider_id=request.provider_id,
                provider_name=request.provider_name,
                email=str(request.email),
                hospital_address=request.hospital_address,
            )
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail={
                "error": "REGISTRATION_FAILED",
                "message": str(exc),
            },
        ) from exc

    except RuntimeError as exc:

        raise HTTPException(
            status_code=503,
            detail={
                "error": "SERVICE_UNAVAILABLE",
                "message": str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Provider registration failed."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "REGISTRATION_ERROR",
                "message": (
                    "Unable to process provider registration."
                ),
            },
        ) from exc


__all__ = [
    "router",
]