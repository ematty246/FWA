"""
ClaimGuard AI
Investigation Record API
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel

from app.core.security import get_current_user

from app.services.investigation_report_storage_service import (
    investigation_report_storage_service,
)

from app.services.investigation_record_service import (
    investigation_record_service,
)

from app.schemas.investigation_record import (
    InvestigationRecordCreateRequest,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/investigation-records",
    tags=["Investigation Records"],
)


# ============================================================
# REQUEST SCHEMA
# ============================================================

class InvestigationDecisionRequest(BaseModel):
    decision: str
    reason: Optional[str] = None


# ============================================================
# CREATE INVESTIGATION RECORD
# ============================================================

@router.post("")
def create_investigation_record(
    request: InvestigationRecordCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    try:

        return (
            investigation_record_service
            .create_record(
                investigation_id=request.investigation_id,
                investigator_id=request.investigator_id,
                provider_id=request.provider_id,
                overall_fwa_risk=request.overall_fwa_risk,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:

        logger.exception(
            "Failed to create investigation record."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


# ============================================================
# UPLOAD / SAVE INVESTIGATION REPORT
# ============================================================

@router.post(
    "/{investigation_id}/report",
)
async def upload_investigation_report(
    investigation_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    try:

        if not file.filename:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Report file is required.",
            )

        if file.content_type != "application/pdf":

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are allowed.",
            )

        pdf_bytes = await file.read()

        if not pdf_bytes:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded PDF is empty.",
            )

        investigation_id = (
            investigation_id
            .strip()
            .upper()
        )

        # ----------------------------------------------------
        # 1. Upload PDF to Supabase Storage
        # ----------------------------------------------------

        storage_path = (
            investigation_report_storage_service
            .upload_report(
                pdf_bytes=pdf_bytes,
                investigation_id=investigation_id,
            )
        )

        # ----------------------------------------------------
        # 2. Save Storage path in database
        # ----------------------------------------------------

        record = (
            investigation_record_service
            .save_report_path(
                investigation_id=investigation_id,
                storage_path=storage_path,
            )
        )

        # ----------------------------------------------------
        # 3. Generate temporary signed URL
        # ----------------------------------------------------

        signed_url = (
            investigation_report_storage_service
            .create_signed_url(
                storage_path
            )
        )

        return {
            "success": True,
            "investigation_id": investigation_id,
            "summary_document_url": storage_path,
            "signed_url": signed_url,
            "expires_in": (
                investigation_report_storage_service
                .SIGNED_URL_EXPIRY
            ),
            "record": record,
        }

    except HTTPException:
        raise

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:

        logger.exception(
            "Investigation report upload failed."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        logger.exception(
            "Unexpected investigation report upload error."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INVESTIGATION_REPORT_UPLOAD_FAILED",
                "message": (
                    "Unable to upload investigation report."
                ),
            },
        ) from exc


# ============================================================
# GET REPORT URL
# ============================================================

@router.get(
    "/{investigation_id}/report",
)
def get_investigation_report(
    investigation_id: str,
    current_user: dict = Depends(get_current_user),
):

    try:

        return (
            investigation_record_service
            .get_report_url(
                investigation_id=investigation_id,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:

        logger.exception(
            "Failed to retrieve investigation report."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        logger.exception(
            "Unexpected investigation report retrieval error."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INVESTIGATION_REPORT_RETRIEVAL_FAILED",
                "message": (
                    "Unable to retrieve investigation report."
                ),
            },
        ) from exc


# ============================================================
# GET MY INVESTIGATION RECORDS
# ============================================================

@router.get("/")
def get_my_investigation_records(
    current_user: dict = Depends(get_current_user),
):
    try:

        # ----------------------------------------------------
        # Get investigator ID from authenticated user
        # ----------------------------------------------------

        investigator_id = (
            current_user.get("investigator_id")
            or current_user.get("user_id")
            or current_user.get("id")
        )

        if not investigator_id:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Investigator ID not found.",
            )

        investigator_id = (
            str(investigator_id)
            .strip()
            .upper()
        )

        # ----------------------------------------------------
        # Return only this investigator's records
        # ----------------------------------------------------

        return (
            investigation_record_service
            .get_records_by_investigator(
                investigator_id
            )
        )

    except HTTPException:
        raise

    except RuntimeError as exc:

        logger.exception(
            "Failed to retrieve investigator records."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        logger.exception(
            "Unexpected investigator records error."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INVESTIGATION_RECORDS_RETRIEVAL_FAILED",
                "message": (
                    "Unable to retrieve investigation records."
                ),
            },
        ) from exc


# ============================================================
# MAKE INVESTIGATION DECISION
# ============================================================

@router.patch(
    "/{investigation_id}/decision",
)
def make_investigation_decision(
    investigation_id: str,
    request: InvestigationDecisionRequest,
    current_user: dict = Depends(get_current_user),
):
    try:

        # ----------------------------------------------------
        # 1. Get authenticated investigator ID
        # ----------------------------------------------------

        investigator_id = (
            current_user.get("investigator_id")
            or current_user.get("user_id")
            or current_user.get("id")
        )

        if not investigator_id:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Investigator ID not found.",
            )

        # ----------------------------------------------------
        # 2. Normalize values
        # ----------------------------------------------------

        investigation_id = (
            investigation_id
            .strip()
            .upper()
        )

        investigator_id = (
            str(investigator_id)
            .strip()
            .upper()
        )

        decision = (
            request.decision
            .strip()
            .upper()
        )

        reason = (
            request.reason.strip()
            if request.reason
            else None
        )

        # ----------------------------------------------------
        # 3. Validate decision
        # ----------------------------------------------------

        allowed_decisions = {
            "CONTINUE_REVIEW",
            "ESCALATE",
            "REJECT",
        }

        if decision not in allowed_decisions:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Invalid decision. Allowed values are: "
                    "CONTINUE_REVIEW, ESCALATE, REJECT."
                ),
            )

        # ----------------------------------------------------
        # 4. Save decision
        # ----------------------------------------------------

        record = (
            investigation_record_service
            .make_decision(
                investigation_id=investigation_id,
                decision=decision,
                decision_by=investigator_id,
                reason=reason,
            )
        )

        # ----------------------------------------------------
        # 5. Return updated record
        # ----------------------------------------------------

        return {
            "success": True,
            "message": (
                "Investigation decision saved successfully."
            ),
            "record": record,
        }

    except HTTPException:
        raise

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:

        logger.exception(
            "Failed to save investigation decision."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        logger.exception(
            "Unexpected investigation decision error."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INVESTIGATION_DECISION_FAILED",
                "message": (
                    "Unable to save investigation decision."
                ),
            },
        ) from exc


# ============================================================
# EXPORT
# ============================================================

__all__ = [
    "router",
]