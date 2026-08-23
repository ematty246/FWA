"""
ClaimGuard AI
Investigator Registration Service
"""

from __future__ import annotations

from uuid import uuid4

from app.services.email_service import (
    email_service,
)

from app.services.supabase_service import (
    supabase_service,
)


class InvestigatorService:

    SERVICE_NAME = "investigator_service"

    # ========================================================
    # INVESTIGATOR REGISTRATION
    # ========================================================

    def register_investigator(
        self,
        full_name: str,
        email: str,
        phone_number: str | None = None,
    ):

        full_name = full_name.strip()
        email = email.strip().lower()

        if not full_name:
            raise ValueError(
                "Investigator name is required."
            )

        if not email:
            raise ValueError(
                "Investigator email is required."
            )

        # ====================================================
        # CHECK APPROVED INVESTIGATOR
        # ====================================================

        existing = (
            supabase_service.client
            .table("investigators")
            .select(
                "investigator_id,email,is_active"
            )
            .eq(
                "email",
                email,
            )
            .limit(1)
            .execute()
        )

        if existing.data:

            raise ValueError(
                "Investigator with this email "
                "is already registered."
            )

        # ====================================================
        # CHECK PENDING INVESTIGATOR
        # ====================================================

        pending = (
            supabase_service.client
            .table("pending_investigators")
            .select(
                "investigator_id,email"
            )
            .eq(
                "email",
                email,
            )
            .limit(1)
            .execute()
        )

        if pending.data:

            raise ValueError(
                "An investigator registration "
                "for this email is already pending."
            )

        # ====================================================
        # GENERATE INVESTIGATOR ID
        # ====================================================

        investigator_id = str(uuid4())

        # ====================================================
        # CREATE PENDING RECORD
        # ====================================================

        pending_record = {

            "investigator_id":
                investigator_id,

            "full_name":
                full_name,

            "email":
                email,

            "phone_number":
                phone_number,
        }

        result = (
            supabase_service.client
            .table("pending_investigators")
            .insert(
                pending_record
            )
            .execute()
        )

        if not result.data:

            raise RuntimeError(
                "Failed to create pending "
                "investigator registration."
            )

        # ====================================================
        # NOTIFY ADMIN
        # ====================================================

        email_service.send_investigator_registration_to_admin(

            investigator_id=investigator_id,

            full_name=full_name,

            email=email,

            phone_number=phone_number,
        )

        # ====================================================
        # RESPONSE
        # ====================================================

        return {

            "message": (
                "Investigator registration submitted "
                "successfully. Awaiting administrator "
                "approval."
            ),

            "investigator_id":
                investigator_id,

            "status":
                "PENDING",
        }


# ============================================================
# SINGLETON
# ============================================================

investigator_service = (
    InvestigatorService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "InvestigatorService",
    "investigator_service",
]