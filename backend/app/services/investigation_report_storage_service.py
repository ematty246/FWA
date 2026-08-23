"""
ClaimGuard AI
Investigation Report Storage Service

Responsibilities:
- Upload generated investigation PDF to Supabase Storage
- Return the Storage object path
- Generate a temporary signed URL for viewing/downloading
"""

from __future__ import annotations

import logging
from typing import Optional

from app.services.supabase_service import supabase_service


logger = logging.getLogger(__name__)


class InvestigationReportStorageService:

    BUCKET_NAME = "investigation-reports"
    SIGNED_URL_EXPIRY = 3600  # 1 hour

    # ============================================================
    # UPLOAD PDF
    # ============================================================

    def upload_report(
        self,
        pdf_bytes: bytes,
        investigation_id: str,
    ) -> str:

        if not pdf_bytes:
            raise ValueError(
                "Investigation report PDF is empty."
            )

        investigation_id = (
            investigation_id
            .strip()
            .upper()
        )

        if not investigation_id:
            raise ValueError(
                "Investigation ID is required."
            )

        file_path = (
            f"{investigation_id}/"
            f"ClaimGuard_{investigation_id}.pdf"
        )

        try:

            # Remove an existing report first.
            # This allows regeneration of the same report.
            try:
                (
                    supabase_service
                    .client
                    .storage
                    .from_(self.BUCKET_NAME)
                    .remove([file_path])
                )
            except Exception:
                # File may not exist. Ignore removal failure.
                pass

            (
                supabase_service
                .client
                .storage
                .from_(self.BUCKET_NAME)
                .upload(
                    file_path,
                    pdf_bytes,
                    {
                        "content-type": "application/pdf",
                        "upsert": "true",
                    },
                )
            )

            logger.info(
                "Investigation report uploaded: %s",
                file_path,
            )

            # IMPORTANT:
            # Store this path in PostgreSQL, not the signed URL.
            return file_path

        except Exception as exc:

            logger.exception(
                "Failed to upload investigation report."
            )

            raise RuntimeError(
                "Unable to upload investigation report."
            ) from exc

    # ============================================================
    # SIGNED URL
    # ============================================================

    def create_signed_url(
        self,
        file_path: str,
        expires_in: Optional[int] = None,
    ) -> str:

        if not file_path:
            raise ValueError(
                "Investigation report path is required."
            )

        expiry = (
            expires_in
            if expires_in is not None
            else self.SIGNED_URL_EXPIRY
        )

        try:

            response = (
                supabase_service
                .client
                .storage
                .from_(self.BUCKET_NAME)
                .create_signed_url(
                    file_path,
                    expiry,
                )
            )

            # Supabase Python clients can return:
            # {"signedURL": "..."}
            # or
            # {"signedUrl": "..."}
            signed_url = (
                response.get("signedURL")
                or response.get("signedUrl")
                or response.get("signed_url")
            )

            if not signed_url:
                raise RuntimeError(
                    "Supabase did not return a signed URL."
                )

            return signed_url

        except Exception as exc:

            logger.exception(
                "Failed to generate signed URL for %s",
                file_path,
            )

            raise RuntimeError(
                "Unable to generate investigation report URL."
            ) from exc


# ============================================================
# SINGLETON
# ============================================================

investigation_report_storage_service = (
    InvestigationReportStorageService()
)


__all__ = [
    "InvestigationReportStorageService",
    "investigation_report_storage_service",
]