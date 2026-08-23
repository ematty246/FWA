"""
ClaimGuard AI
Executive Dashboard API
"""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from app.core.security import (
    get_current_user,
)

from app.services.executive_dashboard_service import (
    executive_dashboard_service,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/executive",
    tags=["Executive Dashboard"],
)


# ============================================================
# EXECUTIVE SUMMARY
# ============================================================

@router.get(
    "/summary",
)
def get_executive_summary(
    current_user: dict = Depends(
        get_current_user
    ),
):

    try:

        return (
            executive_dashboard_service
            .get_summary()
        )

    except FileNotFoundError as exc:

        logger.exception(
            "Executive dashboard CSV missing."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "EXECUTIVE_DATA_NOT_FOUND",

                "message":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Failed to load executive summary."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "EXECUTIVE_SUMMARY_FAILED",

                "message":
                    "Unable to load executive summary.",
            },
        ) from exc


# ============================================================
# PROVIDER RISK DISTRIBUTION
# ============================================================

@router.get(
    "/provider-risk-distribution",
)
def get_provider_risk_distribution(
    current_user: dict = Depends(
        get_current_user
    ),
):

    try:

        return (
            executive_dashboard_service
            .get_provider_risk_distribution()
        )

    except Exception as exc:

        logger.exception(
            "Failed to load provider risk distribution."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "PROVIDER_RISK_DISTRIBUTION_FAILED",

                "message":
                    "Unable to load provider risk distribution.",
            },
        ) from exc


# ============================================================
# CLAIM RISK DISTRIBUTION
# ============================================================

@router.get(
    "/claim-risk-distribution",
)
def get_claim_risk_distribution(
    current_user: dict = Depends(
        get_current_user
    ),
):

    try:

        return (
            executive_dashboard_service
            .get_claim_risk_distribution()
        )

    except Exception as exc:

        logger.exception(
            "Failed to load claim risk distribution."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "CLAIM_RISK_DISTRIBUTION_FAILED",

                "message":
                    "Unable to load claim risk distribution.",
            },
        ) from exc


# ============================================================
# CLAIM TYPE DISTRIBUTION
# ============================================================

@router.get(
    "/claim-type-distribution",
)
def get_claim_type_distribution(
    current_user: dict = Depends(
        get_current_user
    ),
):

    try:

        return (
            executive_dashboard_service
            .get_claim_type_distribution()
        )

    except Exception as exc:

        logger.exception(
            "Failed to load claim type distribution."
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "CLAIM_TYPE_DISTRIBUTION_FAILED",

                "message":
                    "Unable to load claim type distribution.",
            },
        ) from exc


__all__ = [
    "router",
]