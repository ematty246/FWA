"""
ClaimGuard AI
Investigator Approval Service
"""

from __future__ import annotations

import secrets
import string

from app.services.auth_service import (
    AuthService,
)

from app.services.email_service import (
    email_service,
)

from app.services.supabase_service import (
    supabase_service,
)


class InvestigatorApprovalService:

    SERVICE_NAME = "investigator_approval_service"

    # ========================================================
    # GENERATE PASSWORD
    # ========================================================

    @staticmethod
    def generate_password(
        length: int = 12,
    ) -> str:

        characters = (
            string.ascii_letters
            + string.digits
            + "!@#$%"
        )

        return "".join(
            secrets.choice(characters)
            for _ in range(length)
        )

    # ========================================================
    # GET PENDING INVESTIGATORS
    # ========================================================

    def get_pending_investigators(self):
        result = (
        supabase_service.client
        .table("pending_investigators")
        .select(
            """
            investigator_id,
            full_name,
            email,
            phone_number,
            registered_at
            """
        )
        .order(
            "registered_at",
            desc=False,
        )
        .execute()
    )

        investigators = result.data or []

        return {
        "investigators": investigators,
        "total": len(investigators),
    }

    # ========================================================
    # APPROVE INVESTIGATOR
    # ========================================================

    def approve_investigator(
        self,
        investigator_id: str,
    ):

        investigator_id = investigator_id.strip()

        if not investigator_id:
            raise ValueError(
                "Investigator ID is required."
            )

        # ========================================================
        # GET PENDING INVESTIGATOR
        # ========================================================

        result = (
            supabase_service.client
            .table("pending_investigators")
            .select(
                """
                investigator_id,
                full_name,
                email,
                phone_number
                """
            )
            .eq(
                "investigator_id",
                investigator_id,
            )
            .limit(1)
            .execute()
        )

        if not result.data:
            raise ValueError(
                "Pending investigator registration not found."
            )

        investigator = result.data[0]

        # ========================================================
        # GENERATE PASSWORD
        # ========================================================

        temporary_password = (
            self.generate_password()
        )

        # ========================================================
        # HASH PASSWORD
        # ========================================================

        password_hash = (
            AuthService.hash_password(
                temporary_password
            )
        )

        # ========================================================
        # CREATE APPROVED INVESTIGATOR
        # ========================================================

        investigator_record = {

            "investigator_id":
                investigator["investigator_id"],

            "full_name":
                investigator["full_name"],

            "email":
                investigator["email"],

            "phone_number":
                investigator.get(
                    "phone_number"
                ),

            "password_hash":
                password_hash,

            "role":
                "INVESTIGATOR",

            "is_active":
                True,
        }

        inserted = (
            supabase_service.client
            .table("investigators")
            .insert(
                investigator_record
            )
            .execute()
        )

        if not inserted.data:
            raise RuntimeError(
                "Failed to create approved investigator."
            )

        # ========================================================
        # DELETE PENDING RECORD
        # ========================================================

        deleted = (
            supabase_service.client
            .table("pending_investigators")
            .delete()
            .eq(
                "investigator_id",
                investigator_id,
            )
            .execute()
        )

        if not deleted.data:
            raise RuntimeError(
                "Investigator approved, but pending "
                "registration could not be removed."
            )

        # ========================================================
        # SEND CREDENTIALS
        # ========================================================

        email_service.send_investigator_credentials(

            investigator_id=
                investigator_id,

            full_name=
                investigator["full_name"],

            email=
                investigator["email"],

            phone_number=
                investigator.get(
                    "phone_number"
                ),

            password=
                temporary_password,
        )

        return {

            "message": (
                "Investigator approved successfully. "
                "Login credentials have been sent "
                "to the investigator's email."
            ),

            "investigator_id":
                investigator_id,

            "status":
                "APPROVED",
        }

    # ========================================================
    # REJECT INVESTIGATOR
    # ========================================================

    def reject_investigator(
        self,
        investigator_id: str,
        reason: str,
    ):

        investigator_id = investigator_id.strip()
        reason = reason.strip()

        if not investigator_id:
            raise ValueError(
                "Investigator ID is required."
            )

        if not reason:
            raise ValueError(
                "Rejection reason is required."
            )

        # ========================================================
        # GET PENDING INVESTIGATOR
        # ========================================================

        result = (
            supabase_service.client
            .table("pending_investigators")
            .select(
                """
                investigator_id,
                full_name,
                email,
                phone_number
                """
            )
            .eq(
                "investigator_id",
                investigator_id,
            )
            .limit(1)
            .execute()
        )

        if not result.data:
            raise ValueError(
                "Pending investigator registration not found."
            )

        investigator = result.data[0]

        # ========================================================
        # SEND REJECTION EMAIL
        # ========================================================

        email_service.send_investigator_rejection_email(

            investigator_id=
                investigator_id,

            full_name=
                investigator["full_name"],

            email=
                investigator["email"],

            reason=
                reason,
        )

        # ========================================================
        # DELETE PENDING RECORD
        # ========================================================

        deleted = (
            supabase_service.client
            .table("pending_investigators")
            .delete()
            .eq(
                "investigator_id",
                investigator_id,
            )
            .execute()
        )

        if not deleted.data:
            raise RuntimeError(
                "Investigator rejection email sent, "
                "but pending registration could not "
                "be removed."
            )

        return {

            "message":
                "Investigator registration "
                "rejected successfully.",

            "investigator_id":
                investigator_id,

            "status":
                "REJECTED",
        }


# ============================================================
# SINGLETON
# ============================================================

investigator_approval_service = (
    InvestigatorApprovalService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "InvestigatorApprovalService",
    "investigator_approval_service",
]