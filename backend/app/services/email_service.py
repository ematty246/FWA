"""
ClaimGuard AI
Email Service

Handles:
1. Provider registration notification to Admin
2. Provider approval credentials
3. Provider rejection notification
4. Investigator registration notification to Admin
5. Investigator approval credentials
6. Investigator rejection notification
7. Health check
"""

from __future__ import annotations

import logging
import smtplib

from email.message import EmailMessage
from typing import Optional

from app.core.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    ADMIN_EMAIL,
)


logger = logging.getLogger(__name__)


class EmailService:

    SERVICE_NAME = "email_service"

    # ========================================================
    # GENERIC EMAIL SENDER
    # ========================================================

    def _send(
        self,
        to_email: str,
        subject: str,
        body: str,
    ) -> None:

        if not to_email:
            raise RuntimeError(
                "Recipient email is required."
            )

        if not SMTP_USERNAME:
            raise RuntimeError(
                "SMTP username is not configured."
            )

        if not SMTP_PASSWORD:
            raise RuntimeError(
                "SMTP password is not configured."
            )

        message = EmailMessage()

        message["Subject"] = subject

        message["From"] = (
            f"{SMTP_FROM_NAME} "
            f"<{SMTP_FROM_EMAIL}>"
        )

        message["To"] = to_email

        message.set_content(body)

        try:

            with smtplib.SMTP(
                SMTP_HOST,
                SMTP_PORT,
                timeout=15,
            ) as server:

                server.starttls()

                server.login(
                    SMTP_USERNAME,
                    SMTP_PASSWORD,
                )

                server.send_message(
                    message
                )

        except Exception as exc:

            logger.exception(
                "Failed to send email to %s",
                to_email,
            )

            raise RuntimeError(
                "Email notification could not be sent."
            ) from exc

    # ========================================================
    # PROVIDER REGISTRATION → ADMIN
    # ========================================================

    def send_provider_registration_to_admin(
        self,
        provider_id: str,
        full_name: Optional[str],
        email: str,
        hospital_address: str,
        latitude: float,
        longitude: float,
    ) -> None:

        subject = (
            "ClaimGuard AI - "
            "New Provider Registration"
        )

        body = f"""
ClaimGuard AI
Administrator Notification

A new Provider registration requires
administrator review and approval.

----------------------------------------
PROVIDER DETAILS
----------------------------------------

Provider ID:
{provider_id}

Provider Name:
{full_name or "Not provided"}

Provider Email:
{email}

Hospital Address:
{hospital_address}

Latitude:
{latitude}

Longitude:
{longitude}

Registration Status:
PENDING

----------------------------------------

Please log into the ClaimGuard AI
Administrator Dashboard to review the
provider registration.

The provider will NOT be able to log in
until the registration is approved.

After approval, the administrator will
generate the provider's password.

ClaimGuard AI
"""

        self._send(
            ADMIN_EMAIL,
            subject,
            body.strip(),
        )

    # ========================================================
    # PROVIDER APPROVAL → PROVIDER
    # ========================================================

    def send_provider_approval_email(
        self,
        provider_id: str,
        provider_name: Optional[str],
        email: str,
        password: str,
    ) -> None:

        subject = (
            "ClaimGuard AI - "
            "Provider Registration Approved"
        )

        body = f"""
Hello {provider_name or "Provider"},

Your ClaimGuard AI provider registration
has been APPROVED by the administrator.

----------------------------------------
LOGIN DETAILS
----------------------------------------

Provider ID:
{provider_id}

Email:
{email}

Temporary Password:
{password}

----------------------------------------

You can now log in to ClaimGuard AI using
the credentials above.

Please keep your password secure and do
not share it with anyone.

ClaimGuard AI
"""

        self._send(
            email,
            subject,
            body.strip(),
        )

    # ========================================================
    # PROVIDER REJECTION → PROVIDER
    # ========================================================

    def send_provider_rejection_email(
        self,
        provider_id: str,
        provider_name: Optional[str],
        email: str,
        reason: str,
    ) -> None:

        subject = (
            "ClaimGuard AI - "
            "Provider Registration Rejected"
        )

        body = f"""
Hello {provider_name or "Provider"},

Your ClaimGuard AI provider registration
has been REJECTED by the administrator.

----------------------------------------
REGISTRATION DETAILS
----------------------------------------

Provider ID:
{provider_id}

Email:
{email}

Reason:
{reason}

----------------------------------------

If you believe this decision was made in
error, please contact the ClaimGuard AI
administrator.

ClaimGuard AI
"""

        self._send(
            email,
            subject,
            body.strip(),
        )

    # ========================================================
    # INVESTIGATOR REGISTRATION → ADMIN
    # ========================================================

    def send_investigator_registration_to_admin(
        self,
        investigator_id: str,
        full_name: str,
        email: str,
        phone_number: Optional[str],
    ) -> None:

        subject = (
            "ClaimGuard AI - "
            "New Investigator Registration"
        )

        body = f"""
ClaimGuard AI
Administrator Notification

A new Investigator registration requires
administrator review and approval.

----------------------------------------
INVESTIGATOR DETAILS
----------------------------------------

Investigator ID:
{investigator_id}

Full Name:
{full_name}

Email:
{email}

Phone Number:
{phone_number or "Not provided"}

Role:
INVESTIGATOR

Registration Status:
PENDING

----------------------------------------

Please log into the ClaimGuard AI
Administrator Dashboard to review this
investigator registration.

The investigator will NOT be able to log in
until the registration is approved.

If approved, the system will generate a
password and send the login credentials
to the investigator's registered email.

ClaimGuard AI
"""

        self._send(
            ADMIN_EMAIL,
            subject,
            body.strip(),
        )

    # ========================================================
    # INVESTIGATOR APPROVAL → INVESTIGATOR
    # ========================================================

    def send_investigator_credentials(
        self,
        investigator_id: str,
        full_name: str,
        email: str,
        phone_number: Optional[str],
        password: str,
    ) -> None:

        subject = (
            "ClaimGuard AI - "
            "Investigator Registration Approved"
        )

        body = f"""
Hello {full_name},

Your ClaimGuard AI Investigator
registration has been APPROVED by the
administrator.

----------------------------------------
INVESTIGATOR DETAILS
----------------------------------------

Investigator ID:
{investigator_id}

Full Name:
{full_name}

Email:
{email}

Phone Number:
{phone_number or "Not provided"}

Role:
INVESTIGATOR

----------------------------------------
LOGIN CREDENTIALS
----------------------------------------

Temporary Password:
{password}

----------------------------------------

You can now log in to ClaimGuard AI using
the credentials provided above.

Important:
- Keep your password confidential.
- Do not share your credentials with anyone.
- Contact the administrator if you have
  problems accessing your account.

ClaimGuard AI
"""

        self._send(
            email,
            subject,
            body.strip(),
        )

    # ========================================================
    # INVESTIGATOR REJECTION → INVESTIGATOR
    # ========================================================

    def send_investigator_rejection_email(
        self,
        investigator_id: str,
        full_name: str,
        email: str,
        reason: str,
    ) -> None:

        subject = (
            "ClaimGuard AI - "
            "Investigator Registration Rejected"
        )

        body = f"""
Hello {full_name},

Your ClaimGuard AI Investigator
registration has been REJECTED by the
administrator.

----------------------------------------
REGISTRATION DETAILS
----------------------------------------

Investigator ID:
{investigator_id}

Full Name:
{full_name}

Email:
{email}

Role:
INVESTIGATOR

Reason:
{reason}

----------------------------------------

If you believe this decision was made in
error, please contact the ClaimGuard AI
administrator.

ClaimGuard AI
"""

        self._send(
            email,
            subject,
            body.strip(),
        )

    # ========================================================
    # HEALTH CHECK
    # ========================================================

    def health_check(self) -> dict:

        return {
            "service": self.SERVICE_NAME,

            "status": (
                "healthy"
                if (
                    SMTP_USERNAME
                    and SMTP_PASSWORD
                )
                else "degraded"
            ),
        }


# ============================================================
# SINGLETON
# ============================================================

email_service = EmailService()


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "EmailService",
    "email_service",
]