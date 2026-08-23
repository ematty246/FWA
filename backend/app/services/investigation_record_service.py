"""
ClaimGuard AI
Investigation Record Service
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from app.services.supabase_service import (
    supabase_service,
)

from app.services.investigation_report_storage_service import (
    investigation_report_storage_service,
)


logger = logging.getLogger(__name__)


class InvestigationRecordService:

    TABLE_NAME = "investigation_records"

    # ============================================================
    # NORMALIZE IDs
    # ============================================================

    @staticmethod
    def _normalize_id(value: str, field_name: str) -> str:

        if value is None:
            raise ValueError(
                f"{field_name} is required."
            )

        value = str(value).strip().upper()

        if not value:
            raise ValueError(
                f"{field_name} is required."
            )

        return value

    # ============================================================
    # CREATE INVESTIGATION RECORD
    # ============================================================

    def create_record(
        self,
        investigation_id: str,
        investigator_id: str,
        provider_id: str,
        overall_fwa_risk: float,
    ) -> dict:

        # Normalize ALL IDs consistently.
        investigation_id = self._normalize_id(
            investigation_id,
            "Investigation ID",
        )

        investigator_id = self._normalize_id(
            investigator_id,
            "Investigator ID",
        )

        provider_id = self._normalize_id(
            provider_id,
            "Provider ID",
        )

        if overall_fwa_risk is None:
            raise ValueError(
                "Overall FWA risk is required."
            )

        payload = {
            "investigation_id": investigation_id,
            "investigator_id": investigator_id,
            "provider_id": provider_id,
            "overall_fwa_risk": overall_fwa_risk,
        }

        try:

            response = (
                supabase_service
                .client
                .table(self.TABLE_NAME)
                .insert(payload)
                .execute()
            )

            if not response.data:
                raise RuntimeError(
                    "Investigation record was not created."
                )

            logger.info(
                "Investigation record created: %s",
                investigation_id,
            )

            return response.data[0]

        except Exception as exc:

            logger.exception(
                "Failed to create investigation record: %s",
                investigation_id,
            )

            raise RuntimeError(
                f"Unable to create investigation record: {exc}"
            ) from exc

    # ============================================================
    # GET INVESTIGATION RECORD
    # ============================================================

    def get_record(
        self,
        investigation_id: str,
    ) -> dict:

        investigation_id = self._normalize_id(
            investigation_id,
            "Investigation ID",
        )

        try:

            response = (
                supabase_service
                .client
                .table(self.TABLE_NAME)
                .select("*")
                .eq(
                    "investigation_id",
                    investigation_id,
                )
                .limit(1)
                .execute()
            )

            if not response.data:
                raise ValueError(
                    f"Investigation record "
                    f"'{investigation_id}' not found."
                )

            return response.data[0]

        except ValueError:
            raise

        except Exception as exc:

            logger.exception(
                "Failed to get investigation record: %s",
                investigation_id,
            )

            raise RuntimeError(
                f"Unable to retrieve investigation record: {exc}"
            ) from exc

    # ============================================================
    # SAVE REPORT STORAGE PATH
    # ============================================================

    def save_report_path(
        self,
        investigation_id: str,
        storage_path: str,
    ) -> dict:

        investigation_id = self._normalize_id(
            investigation_id,
            "Investigation ID",
        )

        if not storage_path:
            raise ValueError(
                "Report storage path is required."
            )

        storage_path = storage_path.strip()

        try:

            # ----------------------------------------------------
            # 1. Confirm record exists
            # ----------------------------------------------------

            existing_response = (
                supabase_service
                .client
                .table(self.TABLE_NAME)
                .select(
                    "id,"
                    "investigation_id,"
                    "investigator_id,"
                    "provider_id,"
                    "overall_fwa_risk"
                )
                .eq(
                    "investigation_id",
                    investigation_id,
                )
                .limit(1)
                .execute()
            )

            if not existing_response.data:
                raise ValueError(
                    f"Investigation record "
                    f"'{investigation_id}' not found."
                )

            # ----------------------------------------------------
            # 2. Update Storage path
            # ----------------------------------------------------

            response = (
                supabase_service
                .client
                .table(self.TABLE_NAME)
                .update(
                    {
                        "summary_document_url": storage_path,
                        "updated_at": (
                            datetime.now(
                                timezone.utc
                            ).isoformat()
                        ),
                    }
                )
                .eq(
                    "investigation_id",
                    investigation_id,
                )
                .execute()
            )

            if not response.data:
                raise RuntimeError(
                    "Investigation report path "
                    "was not updated."
                )

            logger.info(
                "Investigation report path saved: "
                "%s -> %s",
                investigation_id,
                storage_path,
            )

            return response.data[0]

        except ValueError:
            raise

        except Exception as exc:

            logger.exception(
                "Failed to save report path for %s: %s",
                investigation_id,
                exc,
            )

            raise RuntimeError(
                f"Unable to save investigation report path: {exc}"
            ) from exc

    # ============================================================
    # UPDATE DECISION
    # ============================================================
    #
    # decision = optional until investigator makes a decision
    # reason   = optional
    #
    # ============================================================

    def update_decision(
        self,
        investigation_id: str,
        decision: str,
        decision_by: str,
        reason: Optional[str] = None,
    ) -> dict:

        investigation_id = self._normalize_id(
            investigation_id,
            "Investigation ID",
        )

        decision_by = self._normalize_id(
            decision_by,
            "Decision by",
        )

        if decision is None:
            raise ValueError(
                "Decision is required."
            )

        decision = decision.strip().upper()

        allowed_decisions = {
            "CONTINUE_REVIEW",
            "ESCALATE",
            "REJECT",
        }

        if decision not in allowed_decisions:
            raise ValueError(
                "Invalid decision. "
                "Use CONTINUE_REVIEW, ESCALATE, or REJECT."
            )

        payload = {
            "decision": decision,
            "decision_by": decision_by,
            "decision_at": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
            "updated_at": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
        }

        # Reason remains optional.
        if reason is not None:
            payload["reason"] = reason.strip()

        try:

            response = (
                supabase_service
                .client
                .table(self.TABLE_NAME)
                .update(payload)
                .eq(
                    "investigation_id",
                    investigation_id,
                )
                .execute()
            )

            if not response.data:
                raise ValueError(
                    f"Investigation record "
                    f"'{investigation_id}' not found."
                )

            return response.data[0]

        except ValueError:
            raise

        except Exception as exc:

            logger.exception(
                "Failed to update decision for %s",
                investigation_id,
            )

            raise RuntimeError(
                f"Unable to update investigation decision: {exc}"
            ) from exc

    # ============================================================
    # GET REPORT URL
    # ============================================================

    def get_report_url(
        self,
        investigation_id: str,
    ) -> dict:

        investigation_id = self._normalize_id(
            investigation_id,
            "Investigation ID",
        )

        try:

            response = (
                supabase_service
                .client
                .table(self.TABLE_NAME)
                .select(
                    "investigation_id,"
                    "summary_document_url"
                )
                .eq(
                    "investigation_id",
                    investigation_id,
                )
                .limit(1)
                .execute()
            )

            if not response.data:
                raise ValueError(
                    f"Investigation record "
                    f"'{investigation_id}' not found."
                )

            data = response.data[0]

            storage_path = data.get(
                "summary_document_url"
            )

            if not storage_path:
                raise ValueError(
                    "Investigation report "
                    "has not been generated."
                )

            signed_url = (
                investigation_report_storage_service
                .create_signed_url(
                    storage_path
                )
            )

            return {
                "investigation_id":
                    investigation_id,

                "summary_document_url":
                    storage_path,

                "signed_url":
                    signed_url,

                "expires_in":
                    investigation_report_storage_service
                    .SIGNED_URL_EXPIRY,
            }

        except ValueError:
            raise

        except Exception as exc:

            logger.exception(
                "Failed to get investigation report URL."
            )

            raise RuntimeError(
                f"Unable to retrieve investigation report: {exc}"
            ) from exc

    # ============================================================
    # GET RECORDS BY INVESTIGATOR
    # ============================================================

    def get_records_by_investigator(
        self,
        investigator_id: str,
    ) -> list[dict]:

        investigator_id = self._normalize_id(
            investigator_id,
            "Investigator ID",
        )

        try:

            response = (
                supabase_service
                .client
                .table(self.TABLE_NAME)
                .select(
                    "investigation_id,"
                    "provider_id,"
                    "overall_fwa_risk,"
                    "summary_document_url,"
                    "decision,"
                    "reason,"
                    "created_at,"
                    "updated_at,"
                    "decision_by,"
                    "decision_at"
                )
                .eq(
                    "investigator_id",
                    investigator_id,
                )
                .order(
                    "created_at",
                    desc=True,
                )
                .execute()
            )

            records = response.data or []

            return records

        except Exception as exc:

            logger.exception(
                "Failed to get investigation records for investigator %s",
                investigator_id,
            )

            raise RuntimeError(
                f"Unable to retrieve investigation records: {exc}"
            ) from exc

    # ============================================================
    # MAKE DECISION
    # ============================================================

    def make_decision(
        self,
        investigation_id: str,
        decision: str,
        decision_by: str,
        reason: Optional[str] = None,
    ) -> dict:

        investigation_id = (
            investigation_id
            .strip()
            .upper()
        )

        decision = (
            decision
            .strip()
            .upper()
        )

        decision_by = (
            decision_by
            .strip()
            .upper()
        )

        allowed_decisions = {
            "CONTINUE_REVIEW",
            "ESCALATE",
            "REJECT",
        }

        if decision not in allowed_decisions:
            raise ValueError(
                "Invalid investigation decision."
            )

        payload = {
            "decision": decision,
            "decision_by": decision_by,
            "decision_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if reason is not None:
            payload["reason"] = reason.strip()

        try:

            response = (
                supabase_service
                .client
                .table(self.TABLE_NAME)
                .update(payload)
                .eq(
                    "investigation_id",
                    investigation_id,
                )
                .execute()
            )

            if not response.data:
                raise ValueError(
                    f"Investigation record "
                    f"'{investigation_id}' not found."
                )

            return response.data[0]

        except ValueError:
            raise

        except Exception as exc:

            logger.exception(
                "Failed to save decision for %s",
                investigation_id,
            )

            raise RuntimeError(
                "Unable to save investigation decision."
            ) from exc


# ============================================================
# SINGLETON
# ============================================================

investigation_record_service = (
    InvestigationRecordService()
)


__all__ = [
    "InvestigationRecordService",
    "investigation_record_service",
]