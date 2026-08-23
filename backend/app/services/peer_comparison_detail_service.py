"""
ClaimGuard AI
Peer Comparison Detail Service

Supports:
1. Existing historical providers
2. New providers with submitted claims

IMPORTANT:
- provider_claims = historical dataset only
- claims = newly submitted/current claims
- New-provider peer comparison is calculated from claims
- Peer benchmarks come from the historical/training peer statistics
"""

from __future__ import annotations

import logging
from typing import Any


from app.services.supabase_service import (
    supabase_service,
)


logger = logging.getLogger(__name__)


class PeerComparisonDetailService:

    SERVICE_NAME = (
        "peer_comparison_detail_service"
    )

    # ========================================================
    # FIXED PEER-GROUP SIZE BOUNDARIES
    #
    # These are the leakage-free boundaries used in the
    # notebook's train/validation peer-group construction.
    #
    # 1 - 15   -> Small
    # 16 - 61  -> Medium
    # 62+      -> Large
    # ========================================================

    SMALL_MAX_CLAIMS = 15
    MEDIUM_MAX_CLAIMS = 61

    # ========================================================
    # SERVICE MIX BOUNDARIES
    #
    # Same logic as notebook:
    #
    # 0 - 0.25       -> Mostly_Outpatient
    # >0.25 - 0.75   -> Mixed
    # >0.75 - 1.0    -> Mostly_Inpatient
    # ========================================================

    MOSTLY_OUTPATIENT_MAX = 0.25
    MIXED_MAX = 0.75

    # ========================================================
    # HELPERS
    # ========================================================

    @staticmethod
    def _number(
        value: Any,
    ) -> float:

        if value is None:
            return 0.0

        try:
            return float(value)

        except (
            TypeError,
            ValueError,
        ):
            return 0.0

    # ========================================================
    # GET CLAIMS FOR PROVIDER
    #
    # IMPORTANT:
    # This uses claims, NOT provider_claims.
    #
    # New submitted claims live in claims.
    # ========================================================

    def _get_provider_claims(
        self,
        provider_id: str,
    ) -> list[dict]:

        result = (
            supabase_service.client
            .table("claims")
            .select(
                """
                claim_id,
                provider_id,
                claim_type,
                claim_reimbursement,
                total_claim_cost,
                beneficiary_id,
                beneficiary_age
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .execute()
        )

        return result.data or []

    # ========================================================
    # CALCULATE CURRENT PROVIDER FEATURES
    #
    # These are calculated directly from claims.
    #
    # Used mainly for NEW providers.
    # ========================================================

    def _calculate_provider_features(
        self,
        claims: list[dict],
    ) -> dict:

        total_claims = len(claims)

        if total_claims == 0:

            return {
                "total_claims": 0,
                "total_beneficiaries": 0,
                "average_claim_reimbursement": 0.0,
                "claims_per_beneficiary": 0.0,
                "reimbursement_per_beneficiary": 0.0,
                "inpatient_claims": 0,
                "outpatient_claims": 0,
                "inpatient_claim_ratio": 0.0,
            }

        # ====================================================
        # REIMBURSEMENT
        # ====================================================

        reimbursements = []

        beneficiaries = set()

        inpatient_claims = 0
        outpatient_claims = 0

        for claim in claims:

            reimbursement = self._number(
                claim.get(
                    "claim_reimbursement"
                )
            )

            reimbursements.append(
                reimbursement
            )

            beneficiary_id = (
                claim.get(
                    "beneficiary_id"
                )
            )

            if beneficiary_id:
                beneficiaries.add(
                    str(
                        beneficiary_id
                    )
                )

            claim_type = str(
                claim.get(
                    "claim_type"
                )
                or ""
            ).strip().lower()

            if claim_type == "inpatient":

                inpatient_claims += 1

            elif claim_type == "outpatient":

                outpatient_claims += 1

            else:

                # Unknown claim type does not get
                # incorrectly classified.
                pass

        # ====================================================
        # BENEFICIARIES
        #
        # If beneficiary IDs are unavailable, use 1 as
        # denominator to avoid division by zero.
        # ====================================================

        total_beneficiaries = len(
            beneficiaries
        )

        if total_beneficiaries == 0:

            total_beneficiaries = total_claims

        # ====================================================
        # METRICS
        # ====================================================

        total_reimbursement = sum(
            reimbursements
        )

        average_claim_reimbursement = (
            total_reimbursement
            / total_claims
        )

        claims_per_beneficiary = (
            total_claims
            / total_beneficiaries
        )

        reimbursement_per_beneficiary = (
            total_reimbursement
            / total_beneficiaries
        )

        # ====================================================
        # INPATIENT RATIO
        # ====================================================

        inpatient_claim_ratio = (
            inpatient_claims
            / total_claims
        )

        return {

            "total_claims":
                total_claims,

            "total_beneficiaries":
                total_beneficiaries,

            "average_claim_reimbursement":
                average_claim_reimbursement,

            "claims_per_beneficiary":
                claims_per_beneficiary,

            "reimbursement_per_beneficiary":
                reimbursement_per_beneficiary,

            "inpatient_claims":
                inpatient_claims,

            "outpatient_claims":
                outpatient_claims,

            "inpatient_claim_ratio":
                inpatient_claim_ratio,
        }

    # ========================================================
    # DETERMINE PROVIDER SIZE
    #
    # Same fixed boundaries used by notebook validation /
    # leakage-free peer grouping.
    # ========================================================

    def _get_provider_size_band(
        self,
        total_claims: int,
    ) -> str:

        if total_claims <= 0:

            return "Small"

        if (
            total_claims
            <= self.SMALL_MAX_CLAIMS
        ):

            return "Small"

        if (
            total_claims
            <= self.MEDIUM_MAX_CLAIMS
        ):

            return "Medium"

        return "Large"

    # ========================================================
    # DETERMINE SERVICE MIX
    #
    # Same notebook thresholds.
    # ========================================================

    def _get_service_mix_band(
        self,
        inpatient_claim_ratio: float,
    ) -> str:

        if (
            inpatient_claim_ratio
            <= self.MOSTLY_OUTPATIENT_MAX
        ):

            return "Mostly_Outpatient"

        if (
            inpatient_claim_ratio
            <= self.MIXED_MAX
        ):

            return "Mixed"

        return "Mostly_Inpatient"

    # ========================================================
    # BUILD PEER GROUP
    # ========================================================

    def _get_peer_group(
        self,
        total_claims: int,
        inpatient_claim_ratio: float,
    ) -> tuple[str, str, str]:

        size_band = (
            self._get_provider_size_band(
                total_claims
            )
        )

        service_mix_band = (
            self._get_service_mix_band(
                inpatient_claim_ratio
            )
        )

        peer_group = (
            f"{size_band}_"
            f"{service_mix_band}"
        )

        return (
            size_band,
            service_mix_band,
            peer_group,
        )

    # ========================================================
    # GET PEER BENCHMARK
    #
    # IMPORTANT:
    # This table contains the historical/training peer
    # statistics.
    #
    # Replace "peer_statistics" below with the actual
    # Supabase table name if yours is different.
    # ========================================================

    def _get_peer_statistics(
        self,
        peer_group: str,
    ) -> dict | None:

        result = (
            supabase_service.client
            .table("provider_peer_stats")
            .select(
                """
                peer_group,

                average_claim_reimbursement_mean,
                average_claim_reimbursement_std,

                claims_per_beneficiary_mean,
                claims_per_beneficiary_std,

                reimbursement_per_beneficiary_mean,
                reimbursement_per_beneficiary_std
                """
            )
            .eq(
                "peer_group",
                peer_group,
            )
            .limit(1)
            .execute()
        )

        if not result.data:

            return None

        return result.data[0]

    # ========================================================
    # RATIO
    #
    # Same concept as notebook deviation calculation.
    # ========================================================

    @staticmethod
    def _ratio(
        difference: float,
        baseline: float,
    ) -> float:

        if baseline == 0:

            return 0.0

        return (
            difference
            / baseline
        )

    # ========================================================
    # Z-SCORE
    #
    # Same notebook formula:
    #
    # (provider_value - peer_mean) / peer_std
    # ========================================================

    @staticmethod
    def _zscore(
        value: float,
        mean: float,
        std: float,
    ) -> float:

        if std == 0:

            return 0.0

        return (
            value - mean
        ) / std

    # ========================================================
    # BUILD COMPARISON
    # ========================================================

    def _build_comparison(
        self,
        provider_features: dict,
        peer: dict,
    ) -> list[dict]:

        average_claim_reimbursement = (
            provider_features[
                "average_claim_reimbursement"
            ]
        )

        claims_per_beneficiary = (
            provider_features[
                "claims_per_beneficiary"
            ]
        )

        reimbursement_per_beneficiary = (
            provider_features[
                "reimbursement_per_beneficiary"
            ]
        )

        # ====================================================
        # PEER MEANS
        # ====================================================

        peer_claim_reimbursement_mean = (
            self._number(
                peer.get(
                    "average_claim_reimbursement_mean"
                )
            )
        )

        peer_claims_per_beneficiary_mean = (
            self._number(
                peer.get(
                    "claims_per_beneficiary_mean"
                )
            )
        )

        peer_reimbursement_per_beneficiary_mean = (
            self._number(
                peer.get(
                    "reimbursement_per_beneficiary_mean"
                )
            )
        )

        # ====================================================
        # PEER STANDARD DEVIATIONS
        # ====================================================

        peer_claim_reimbursement_std = (
            self._number(
                peer.get(
                    "average_claim_reimbursement_std"
                )
            )
        )

        peer_claims_per_beneficiary_std = (
            self._number(
                peer.get(
                    "claims_per_beneficiary_std"
                )
            )
        )

        peer_reimbursement_per_beneficiary_std = (
            self._number(
                peer.get(
                    "reimbursement_per_beneficiary_std"
                )
            )
        )

        # ====================================================
        # DEVIATIONS
        # ====================================================

        reimbursement_deviation = (
            self._ratio(
                (
                    average_claim_reimbursement
                    - peer_claim_reimbursement_mean
                ),
                peer_claim_reimbursement_mean,
            )
        )

        claims_deviation = (
            self._ratio(
                (
                    claims_per_beneficiary
                    - peer_claims_per_beneficiary_mean
                ),
                peer_claims_per_beneficiary_mean,
            )
        )

        reimbursement_beneficiary_deviation = (
            self._ratio(
                (
                    reimbursement_per_beneficiary
                    - peer_reimbursement_per_beneficiary_mean
                ),
                peer_reimbursement_per_beneficiary_mean,
            )
        )

        # ====================================================
        # Z-SCORES
        # ====================================================

        reimbursement_zscore = (
            self._zscore(
                average_claim_reimbursement,
                peer_claim_reimbursement_mean,
                peer_claim_reimbursement_std,
            )
        )

        claims_zscore = (
            self._zscore(
                claims_per_beneficiary,
                peer_claims_per_beneficiary_mean,
                peer_claims_per_beneficiary_std,
            )
        )

        reimbursement_beneficiary_zscore = (
            self._zscore(
                reimbursement_per_beneficiary,
                peer_reimbursement_per_beneficiary_mean,
                peer_reimbursement_per_beneficiary_std,
            )
        )

        # ====================================================
        # FINAL COMPARISON
        # ====================================================

        return [

            {
                "metric":
                    "Average Claim Reimbursement",

                "current_provider":
                    average_claim_reimbursement,

                "peer_mean":
                    peer_claim_reimbursement_mean,

                "difference":
                    reimbursement_deviation,

                "z_score":
                    reimbursement_zscore,
            },

            {
                "metric":
                    "Claims / Beneficiary",

                "current_provider":
                    claims_per_beneficiary,

                "peer_mean":
                    peer_claims_per_beneficiary_mean,

                "difference":
                    claims_deviation,

                "z_score":
                    claims_zscore,
            },

            {
                "metric":
                    "Reimbursement / Beneficiary",

                "current_provider":
                    reimbursement_per_beneficiary,

                "peer_mean":
                    peer_reimbursement_per_beneficiary_mean,

                "difference":
                    reimbursement_beneficiary_deviation,

                "z_score":
                    reimbursement_beneficiary_zscore,
            },
        ]

    # ========================================================
    # GET DETAILED COMPARISON
    # ========================================================

    def get_detailed_comparison(
        self,
        provider_id: str,
    ) -> dict:

        provider_id = (
            provider_id
            .strip()
            .upper()
        )

        # ====================================================
        # VERIFY PROVIDER
        # ====================================================

        provider_check = (
            supabase_service.client
            .table("providers")
            .select(
                "provider_id"
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        if not provider_check.data:

            raise ValueError(
                "Provider not found."
            )

        # ====================================================
        # FIRST:
        # TRY EXISTING provider_features
        #
        # This preserves the notebook-engineered values for
        # historical providers.
        # ====================================================

        feature_result = (
            supabase_service.client
            .table("provider_features")
            .select(
                """
                provider_id,
                peer_group,

                average_claim_reimbursement,
                claims_per_beneficiary,
                reimbursement_per_beneficiary,

                average_claim_reimbursement_peer_mean,
                claims_per_beneficiary_peer_mean,
                reimbursement_per_beneficiary_peer_mean,

                average_claim_reimbursement_peer_deviation,
                claims_per_beneficiary_peer_deviation,
                reimbursement_per_beneficiary_peer_deviation,

                average_claim_reimbursement_peer_zscore,
                claims_per_beneficiary_peer_zscore,
                reimbursement_per_beneficiary_peer_zscore
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        # ====================================================
        # EXISTING HISTORICAL PROVIDER
        # ====================================================

        if feature_result.data:

            provider = (
                feature_result.data[0]
            )

            peer_group = provider.get(
                "peer_group"
            )

            if not peer_group:

                return {

                    "provider_id":
                        provider_id,

                    "peer_group":
                        None,

                    "status":
                        "INSUFFICIENT_HISTORY",

                    "comparison_available":
                        False,

                    "claim_count":
                        None,

                    "comparison":
                        [],

                    "message":
                        "Peer comparison is not "
                        "available because the provider "
                        "does not have a peer group.",
                }

            return {

                "provider_id":
                    provider_id,

                "peer_group":
                    peer_group,

                "status":
                    "AVAILABLE",

                "comparison_available":
                    True,

                "source":
                    "provider_features",

                "comparison": [

                    {
                        "metric":
                            "Average Claim Reimbursement",

                        "current_provider":
                            provider.get(
                                "average_claim_reimbursement"
                            ),

                        "peer_mean":
                            provider.get(
                                "average_claim_reimbursement_peer_mean"
                            ),

                        "difference":
                            provider.get(
                                "average_claim_reimbursement_peer_deviation"
                            ),

                        "z_score":
                            provider.get(
                                "average_claim_reimbursement_peer_zscore"
                            ),
                    },

                    {
                        "metric":
                            "Claims / Beneficiary",

                        "current_provider":
                            provider.get(
                                "claims_per_beneficiary"
                            ),

                        "peer_mean":
                            provider.get(
                                "claims_per_beneficiary_peer_mean"
                            ),

                        "difference":
                            provider.get(
                                "claims_per_beneficiary_peer_deviation"
                            ),

                        "z_score":
                            provider.get(
                                "claims_per_beneficiary_peer_zscore"
                            ),
                    },

                    {
                        "metric":
                            "Reimbursement / Beneficiary",

                        "current_provider":
                            provider.get(
                                "reimbursement_per_beneficiary"
                            ),

                        "peer_mean":
                            provider.get(
                                "reimbursement_per_beneficiary_peer_mean"
                            ),

                        "difference":
                            provider.get(
                                "reimbursement_per_beneficiary_peer_deviation"
                            ),

                        "z_score":
                            provider.get(
                                "reimbursement_per_beneficiary_peer_zscore"
                            ),
                    },
                ],

                "message":
                    "Detailed peer comparison available.",
            }

        # ====================================================
        # NEW PROVIDER
        #
        # NO provider_features ROW
        #
        # Therefore calculate everything from claims.
        # ====================================================

        claims = (
            self._get_provider_claims(
                provider_id
            )
        )

        claim_count = len(
            claims
        )

        # ====================================================
        # NO SUBMITTED CLAIMS
        # ====================================================

        if claim_count == 0:

            return {

                "provider_id":
                    provider_id,

                "peer_group":
                    None,

                "status":
                    "COLD_START",

                "comparison_available":
                    False,

                "claim_count":
                    0,

                "comparison":
                    [],

                "message":
                    "Peer comparison is not available "
                    "until the provider submits claims.",
            }

        # ====================================================
        # CALCULATE FEATURES FROM claims
        # ====================================================

        provider_features = (
            self._calculate_provider_features(
                claims
            )
        )

        # ====================================================
        # DETERMINE PEER GROUP
        # ====================================================

        (
            size_band,
            service_mix_band,
            peer_group,
        ) = self._get_peer_group(
            total_claims=provider_features[
                "total_claims"
            ],
            inpatient_claim_ratio=provider_features[
                "inpatient_claim_ratio"
            ],
        )

        # ====================================================
        # GET HISTORICAL PEER BENCHMARK
        # ====================================================

        peer = (
            self._get_peer_statistics(
                peer_group
            )
        )

        # ====================================================
        # PEER GROUP NOT FOUND
        # ====================================================

        if peer is None:

            return {

                "provider_id":
                    provider_id,

                "peer_group":
                    peer_group,

                "status":
                    "PEER_GROUP_NOT_FOUND",

                "comparison_available":
                    False,

                "claim_count":
                    claim_count,

                "provider_size_band":
                    size_band,

                "service_mix_band":
                    service_mix_band,

                "inpatient_claim_ratio":
                    provider_features[
                        "inpatient_claim_ratio"
                    ],

                "comparison":
                    [],

                "message":
                    "Provider peer group was identified, "
                    "but no historical peer benchmark exists "
                    "for this group.",
            }

        # ====================================================
        # BUILD COMPARISON
        # ====================================================

        comparison = (
            self._build_comparison(
                provider_features,
                peer,
            )
        )

        # ====================================================
        # FINAL NEW PROVIDER RESPONSE
        # ====================================================

        return {

            "provider_id":
                provider_id,

            "peer_group":
                peer_group,

            "status":
                "AVAILABLE",

            "comparison_available":
                True,

            "source":
                "claims",

            "claim_count":
                claim_count,

            "provider_size_band":
                size_band,

            "service_mix_band":
                service_mix_band,

            "inpatient_claim_ratio":
                provider_features[
                    "inpatient_claim_ratio"
                ],

            "provider_metrics": {

                "average_claim_reimbursement":
                    provider_features[
                        "average_claim_reimbursement"
                    ],

                "claims_per_beneficiary":
                    provider_features[
                        "claims_per_beneficiary"
                    ],

                "reimbursement_per_beneficiary":
                    provider_features[
                        "reimbursement_per_beneficiary"
                    ],
            },

            "comparison":
                comparison,

            "message":
                "Detailed peer comparison calculated "
                "from submitted claims against the "
                "historical peer-group benchmark.",
        }


# ============================================================
# SINGLETON
# ============================================================

peer_comparison_detail_service = (
    PeerComparisonDetailService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "PeerComparisonDetailService",
    "peer_comparison_detail_service",
]