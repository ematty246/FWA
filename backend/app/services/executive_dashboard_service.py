"""
ClaimGuard AI
Executive Dashboard Analytics Service
"""

from __future__ import annotations

import logging
from typing import Any

from app.services.supabase_service import (
    supabase_service,
)


logger = logging.getLogger(__name__)


class ExecutiveDashboardService:

    SERVICE_NAME = "executive_dashboard_service"

    # ========================================================
    # SAFE NUMBER
    # ========================================================

    @staticmethod
    def _safe_number(
        value: Any,
        default: float = 0.0,
    ) -> float:

        if value is None:
            return default

        try:
            return float(value)

        except (
            TypeError,
            ValueError,
        ):
            return default

    # ========================================================
    # TOTAL PROVIDERS
    #
    # SOURCE:
    #     providers
    #
    # REAL-TIME
    # ========================================================

    @classmethod
    def _get_total_providers(
        cls,
    ) -> int:

        result = (
            supabase_service.client
            .table("providers")
            .select(
                "provider_id",
                count="exact",
            )
            .execute()
        )

        return int(
            result.count or 0
        )

    # ========================================================
    # TOTAL HISTORICAL CLAIMS
    #
    # SOURCE:
    #     provider_claims
    #
    # IMPORTANT:
    #     provider_claims = historical claims
    #
    # count="exact" avoids the normal 1000-row response limit.
    # ========================================================

    @classmethod
    def _get_total_claims(
        cls,
    ) -> int:

        result = (
            supabase_service.client
            .table("provider_claims")
            .select(
                "claim_id",
                count="exact",
            )
            .execute()
        )

        return int(
            result.count or 0
        )

    # ========================================================
    # TOTAL BENEFICIARIES
    #
    # SOURCE:
    #     provider_features
    #
    # FIELD:
    #     total_beneficiaries
    #
    # Each provider_features row represents one provider.
    #
    # Therefore:
    #
    #     SUM(total_beneficiaries)
    #
    # IMPORTANT:
    #     provider_features is provider-level historical data.
    # ========================================================

    @classmethod
    def _get_total_beneficiaries(
        cls,
    ) -> int:

        result = (
            supabase_service.client
            .table("provider_features")
            .select(
                "provider_id,total_beneficiaries"
            )
            .execute()
        )

        rows = (
            result.data or []
        )

        total = 0

        for row in rows:

            value = row.get(
                "total_beneficiaries"
            )

            try:

                total += int(
                    float(
                        value or 0
                    )
                )

            except (
                TypeError,
                ValueError,
            ):

                continue

        return total

    # ========================================================
    # HIGH-RISK PROVIDERS
    #
    # SOURCE:
    #     provider_risk
    #
    # FIELD:
    #     investigation_priority
    #
    # CONDITION:
    #     investigation_priority = High
    #
    # IMPORTANT:
    #     DO NOT use investigations table.
    # ========================================================

    @classmethod
    def _get_high_risk_providers(
        cls,
    ) -> int:

        result = (
            supabase_service.client
            .table("provider_risk")
            .select(
                "provider_id,investigation_priority"
            )
            .eq(
                "investigation_priority",
                "High",
            )
            .execute()
        )

        rows = (
            result.data or []
        )

        provider_ids = set()

        for row in rows:

            provider_id = row.get(
                "provider_id"
            )

            if provider_id:

                provider_ids.add(
                    str(
                        provider_id
                    )
                    .strip()
                    .upper()
                )

        return len(
            provider_ids
        )

    # ========================================================
    # HIGH-RISK CLAIMS
    #
    # SOURCE:
    #     provider_claims
    #
    # HIGH + VERY HIGH
    #
    # ========================================================

    @classmethod
    def _get_high_risk_claims(
        cls,
    ) -> int:

        result = (
            supabase_service.client
            .table("provider_claims")
            .select(
                "claim_id"
            )
            .in_(
                "claim_risk_tier",
                [
                    "High Risk",
                    "Very High Risk",
                ],
            )
            .execute()
        )

        rows = (
            result.data or []
        )

        claim_ids = set()

        for row in rows:

            claim_id = row.get(
                "claim_id"
            )

            if claim_id:

                claim_ids.add(
                    str(
                        claim_id
                    )
                )

        return len(
            claim_ids
        )

    # ========================================================
    # TOTAL REIMBURSEMENT / CLAIM COST
    #
    # SOURCE:
    #     provider_claims
    #
    # ACTUAL AVAILABLE MONEY FIELD:
    #     total_claim_cost
    #
    # IMPORTANT:
    #
    # provider_claims DOES NOT contain:
    #
    #     claim_reimbursement
    #
    # Therefore total_claim_cost is used.
    #
    # PAGINATION IS REQUIRED.
    #
    # Supabase normally returns maximum 1000 rows per request.
    # ========================================================

    @classmethod
    def _get_total_reimbursement(
        cls,
    ) -> float:

        total = 0.0

        page_size = 1000
        page = 0

        while True:

            start = (
                page
                * page_size
            )

            end = (
                start
                + page_size
                - 1
            )

            result = (
                supabase_service.client
                .table("provider_claims")
                .select(
                    "claim_id,total_claim_cost"
                )
                .range(
                    start,
                    end,
                )
                .execute()
            )

            rows = (
                result.data or []
            )

            if not rows:
                break

            for row in rows:

                total += (
                    cls._safe_number(
                        row.get(
                            "total_claim_cost"
                        )
                    )
                )

            if len(rows) < page_size:
                break

            page += 1

        return round(
            total,
            2,
        )

    # ========================================================
    # TOTAL FRAUDULENT PROVIDERS
    #
    # SOURCE:
    #     provider_risk
    #
    # FIELD:
    #     fraud_risk_score
    #
    # THRESHOLD:
    #     >= 0.60
    # ========================================================

    @classmethod
    def _get_total_fraudulent_providers(
        cls,
    ) -> int:

        result = (
            supabase_service.client
            .table("provider_risk")
            .select(
                "provider_id,fraud_risk_score"
            )
            .execute()
        )

        rows = (
            result.data or []
        )

        provider_ids = set()

        for row in rows:

            score = row.get(
                "fraud_risk_score"
            )

            try:

                if (
                    score is not None
                    and float(score) >= 0.60
                ):

                    provider_id = row.get(
                        "provider_id"
                    )

                    if provider_id:

                        provider_ids.add(
                            str(
                                provider_id
                            )
                            .strip()
                            .upper()
                        )

            except (
                TypeError,
                ValueError,
            ):

                continue

        return len(
            provider_ids
        )

    # ========================================================
    # EXECUTIVE SUMMARY
    #
    # EVERY REQUEST:
    #
    #     Supabase
    #          ↓
    #     fresh values
    #          ↓
    #     API response
    #
    # NO CSV
    # NO CACHE
    # NO STATIC VALUES
    # ========================================================

    @classmethod
    def get_summary(
        cls,
    ) -> dict:

        total_providers = (
            cls._get_total_providers()
        )

        total_claims = (
            cls._get_total_claims()
        )

        total_beneficiaries = (
            cls._get_total_beneficiaries()
        )

        high_risk_providers = (
            cls._get_high_risk_providers()
        )

        high_risk_claims = (
            cls._get_high_risk_claims()
        )

        total_fraudulent_providers = (
            cls._get_total_fraudulent_providers()
        )

        total_reimbursement = (
            cls._get_total_reimbursement()
        )

        return {

            "total_providers":
                total_providers,

            "total_claims":
                total_claims,

            "total_beneficiaries":
                total_beneficiaries,

            "high_risk_providers":
                high_risk_providers,

            "high_risk_claims":
                high_risk_claims,

            "total_fraudulent_providers":
                total_fraudulent_providers,

            "total_reimbursement":
                total_reimbursement,
        }

    # ========================================================
    # PROVIDER RISK DISTRIBUTION
    #
    # SOURCE:
    #     provider_risk
    # ========================================================

    @classmethod
    def get_provider_risk_distribution(
        cls,
    ) -> dict:

        result = (
            supabase_service.client
            .table("provider_risk")
            .select(
                "provider_id,fwa_risk_level"
            )
            .execute()
        )

        rows = (
            result.data or []
        )

        counts = {

            "Low": 0,

            "Medium": 0,

            "High": 0,

            "Very High": 0,
        }

        for row in rows:

            risk_level = (
                str(
                    row.get(
                        "fwa_risk_level"
                    )
                    or ""
                )
                .strip()
                .lower()
            )

            if risk_level in {
                "low",
                "low risk",
            }:

                counts[
                    "Low"
                ] += 1

            elif risk_level in {
                "medium",
                "medium risk",
            }:

                counts[
                    "Medium"
                ] += 1

            elif risk_level in {
                "high",
                "high risk",
            }:

                counts[
                    "High"
                ] += 1

            elif risk_level in {
                "very high",
                "very high risk",
            }:

                counts[
                    "Very High"
                ] += 1

        return {

            "distribution": [

                {
                    "risk_level":
                        "Low",

                    "count":
                        counts["Low"],
                },

                {
                    "risk_level":
                        "Medium",

                    "count":
                        counts["Medium"],
                },

                {
                    "risk_level":
                        "High",

                    "count":
                        counts["High"],
                },

                {
                    "risk_level":
                        "Very High",

                    "count":
                        counts["Very High"],
                },
            ]
        }

    # ========================================================
    # CLAIM RISK DISTRIBUTION
    #
    # SOURCE:
    #     provider_claims
    # ========================================================

    @classmethod
    def get_claim_risk_distribution(
        cls,
    ) -> dict:

        result = (
            supabase_service.client
            .table("provider_claims")
            .select(
                "claim_id,claim_risk_tier"
            )
            .execute()
        )

        rows = (
            result.data or []
        )

        counts = {

            "Low Risk": 0,

            "Medium Risk": 0,

            "High Risk": 0,

            "Very High Risk": 0,
        }

        for row in rows:

            risk_tier = (
                str(
                    row.get(
                        "claim_risk_tier"
                    )
                    or ""
                )
                .strip()
                .lower()
            )

            if risk_tier == "low risk":

                counts[
                    "Low Risk"
                ] += 1

            elif risk_tier == "medium risk":

                counts[
                    "Medium Risk"
                ] += 1

            elif risk_tier == "high risk":

                counts[
                    "High Risk"
                ] += 1

            elif risk_tier == "very high risk":

                counts[
                    "Very High Risk"
                ] += 1

        return {

            "distribution": [

                {
                    "risk_tier":
                        "Low Risk",

                    "count":
                        counts["Low Risk"],
                },

                {
                    "risk_tier":
                        "Medium Risk",

                    "count":
                        counts["Medium Risk"],
                },

                {
                    "risk_tier":
                        "High Risk",

                    "count":
                        counts["High Risk"],
                },

                {
                    "risk_tier":
                        "Very High Risk",

                    "count":
                        counts["Very High Risk"],
                },
            ]
        }

    # ========================================================
    # CLAIM TYPE DISTRIBUTION
    #
    # SOURCE:
    #     provider_claims
    #
    # INPATIENT / OUTPATIENT
    #
    # PAGINATION INCLUDED
    # ========================================================

    @classmethod
    def get_claim_type_distribution(
        cls,
    ) -> dict:

        grouped = {

            "Inpatient": {

                "count": 0,

                "reimbursement": 0.0,
            },

            "Outpatient": {

                "count": 0,

                "reimbursement": 0.0,
            },
        }

        page_size = 1000
        page = 0

        while True:

            start = (
                page
                * page_size
            )

            end = (
                start
                + page_size
                - 1
            )

            result = (
                supabase_service.client
                .table("provider_claims")
                .select(
                    """
                    claim_id,
                    claim_type,
                    total_claim_cost
                    """
                )
                .range(
                    start,
                    end,
                )
                .execute()
            )

            rows = (
                result.data or []
            )

            if not rows:
                break

            for row in rows:

                claim_type = (
                    str(
                        row.get(
                            "claim_type"
                        )
                        or ""
                    )
                    .strip()
                    .lower()
                )

                if claim_type == "inpatient":

                    key = "Inpatient"

                elif claim_type == "outpatient":

                    key = "Outpatient"

                else:

                    continue

                grouped[
                    key
                ]["count"] += 1

                grouped[
                    key
                ]["reimbursement"] += (
                    cls._safe_number(
                        row.get(
                            "total_claim_cost"
                        )
                    )
                )

            if len(rows) < page_size:
                break

            page += 1

        return {

            "distribution": [

                {
                    "claim_type":
                        "Inpatient",

                    "count":
                        grouped[
                            "Inpatient"
                        ]["count"],

                    "reimbursement":
                        round(
                            grouped[
                                "Inpatient"
                            ]["reimbursement"],
                            2,
                        ),
                },

                {
                    "claim_type":
                        "Outpatient",

                    "count":
                        grouped[
                            "Outpatient"
                        ]["count"],

                    "reimbursement":
                        round(
                            grouped[
                                "Outpatient"
                            ]["reimbursement"],
                            2,
                        ),
                },
            ]
        }


# ============================================================
# SINGLETON
# ============================================================

executive_dashboard_service = (
    ExecutiveDashboardService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ExecutiveDashboardService",
    "executive_dashboard_service",
]