"""
ClaimGuard AI
Provider Approval Service
"""

from __future__ import annotations

import secrets
import string
from datetime import datetime, timezone

from app.services.auth_service import (
    AuthService,
)

from app.services.email_service import (
    email_service,
)

from app.services.supabase_service import (
    supabase_service,
)


class ProviderApprovalService:

    SERVICE_NAME = "provider_approval_service"

    # ========================================================
    # GENERATE PROVIDER PASSWORD
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
    # GET PENDING PROVIDERS
    # ========================================================

    def get_pending_providers(self):
        result = (
            supabase_service.client
            .table("pending_providers")
            .select(
                """
                provider_id,
                provider_name,
                email,
                hospital_address,
                latitude,
                longitude,
                registered_at
                """
            )
            .order(
                "registered_at",
                desc=False,
            )
            .execute()
        )

        providers = result.data or []
        return {
            "providers": providers,
            "total": len(providers),
        }

    # ========================================================
    # APPROVE PROVIDER
    # ========================================================

    def approve_provider(
        self,
        provider_id: str,
    ):

        provider_id = provider_id.strip().upper()

        if not provider_id:
            raise ValueError(
                "Provider ID is required."
            )

        # ========================================================
        # GET PENDING PROVIDER
        # ========================================================

        result = (
            supabase_service.client
            .table("pending_providers")
            .select(
                """
                provider_id,
                provider_name,
                email,
                hospital_address,
                latitude,
                longitude
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        if not result.data:
            raise ValueError(
                "Pending provider registration not found."
            )

        provider = result.data[0]

        # ========================================================
        # GENERATE TEMPORARY PASSWORD
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
        # CHECK WHETHER PROVIDER ALREADY EXISTS
        # ========================================================

        existing_provider = (
            supabase_service.client
            .table("providers")
            .select(
                """
                provider_id
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        # ========================================================
        # PROVIDER ALREADY EXISTS
        # ========================================================

        if existing_provider.data:

            updated = (
                supabase_service.client
                .table("providers")
                .update(
                    {
                        "provider_name":
                            provider["provider_name"],

                        "email":
                            provider["email"],

                        "password_hash":
                            password_hash,

                        "is_active":
                            True,

                        "hospital_address":
                            provider["hospital_address"],

                        "latitude":
                            provider["latitude"],

                        "longitude":
                            provider["longitude"],
                    }
                )
                .eq(
                    "provider_id",
                    provider_id,
                )
                .execute()
            )

            if not updated.data:
                raise RuntimeError(
                    "Failed to activate existing provider."
                )

        # ========================================================
        # PROVIDER DOES NOT EXIST
        # ========================================================

        else:

            provider_record = {

                "provider_id":
                    provider["provider_id"],

                "provider_name":
                    provider["provider_name"],

                "email":
                    provider["email"],

                "password_hash":
                    password_hash,

                "is_active":
                    True,

                "registered_at":
                    datetime.now(
                        timezone.utc
                    ).isoformat(),

                "hospital_address":
                    provider["hospital_address"],

                "latitude":
                    provider["latitude"],

                "longitude":
                    provider["longitude"],
            }

            inserted = (
                supabase_service.client
                .table("providers")
                .insert(
                    provider_record
                )
                .execute()
            )

            if not inserted.data:
                raise RuntimeError(
                    "Failed to create approved provider."
                )

        # ========================================================
        # DELETE PENDING REGISTRATION
        # ========================================================

        deleted = (
            supabase_service.client
            .table("pending_providers")
            .delete()
            .eq(
                "provider_id",
                provider_id,
            )
            .execute()
        )

        if not deleted.data:
            raise RuntimeError(
                "Provider approved, but pending "
                "registration could not be removed."
            )

        # ========================================================
        # SEND LOGIN CREDENTIALS
        # ========================================================

        email_service.send_provider_approval_email(

            provider_id=
                provider["provider_id"],

            provider_name=
                provider["provider_name"],

            email=
                provider["email"],

            password=
                temporary_password,
        )

        # ========================================================
        # RESPONSE
        # ========================================================

        return {

            "message": (
                "Provider approved successfully. "
                "Login credentials have been sent "
                "to the provider's email."
            ),

            "provider_id":
                provider_id,

            "status":
                "APPROVED",
        }

    # ========================================================
    # REJECT PROVIDER
    # ========================================================

    def reject_provider(
        self,
        provider_id: str,
        reason: str,
    ):

        provider_id = provider_id.strip()
        reason = reason.strip()

        if not provider_id:
            raise ValueError(
                "Provider ID is required."
            )

        if not reason:
            raise ValueError(
                "Rejection reason is required."
            )

        # ========================================================
        # GET PENDING PROVIDER
        # ========================================================

        result = (
            supabase_service.client
            .table("pending_providers")
            .select(
                """
                provider_id,
                provider_name,
                email
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        if not result.data:
            raise ValueError(
                "Pending provider registration not found."
            )

        provider = result.data[0]

        # ========================================================
        # SEND REJECTION EMAIL
        # ========================================================

        email_service.send_provider_rejection_email(

            provider_id=
                provider["provider_id"],

            provider_name=
                provider.get("provider_name"),

            email=
                provider["email"],

            reason=
                reason,
        )

        # ========================================================
        # DELETE PENDING RECORD
        # ========================================================

        deleted = (
            supabase_service.client
            .table("pending_providers")
            .delete()
            .eq(
                "provider_id",
                provider_id,
            )
            .execute()
        )

        if not deleted.data:
            raise RuntimeError(
                "Provider rejection email sent, "
                "but pending registration could not "
                "be removed."
            )

        return {

            "message":
                "Provider registration rejected.",

            "provider_id":
                provider_id,

            "status":
                "REJECTED",
        }


# ============================================================
# SINGLETON
# ============================================================

provider_approval_service = (
    ProviderApprovalService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ProviderApprovalService",
    "provider_approval_service",
]