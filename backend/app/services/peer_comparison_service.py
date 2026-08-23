"""
ClaimGuard AI
Peer Comparison Service
"""

from __future__ import annotations

import logging

from app.services.supabase_service import (
    supabase_service,
)


logger = logging.getLogger(__name__)


class PeerComparisonService:

    SERVICE_NAME = "peer_comparison_service"

    # ========================================================
    # NEW PROVIDER PEER-GROUP SIZE BOUNDARIES
    # ========================================================

    SMALL_MAX_CLAIMS = 15
    MEDIUM_MAX_CLAIMS = 61

    # ========================================================
    # NEW PROVIDER SERVICE-MIX BOUNDARIES
    # ========================================================

    MOSTLY_OUTPATIENT_MAX = 0.25
    MIXED_MAX = 0.75

    # ========================================================
    # GET PEER COMPARISON
    # ========================================================

    def get_peer_comparison(
        self,
        provider_id: str,
    ) -> dict:

        # ====================================================
        # NORMALIZE PROVIDER ID
        # ====================================================

        provider_id = (
            provider_id
            .strip()
            .upper()
        )

        # ====================================================
        # CHECK PROVIDER FEATURES
        #
        # If provider_features exists:
        #
        #     HISTORICAL PROVIDER
        #
        # If provider_features does not exist:
        #
        #     NEW PROVIDER
        # ====================================================

        provider_result = (
            supabase_service.client
            .table("provider_features")
            .select(
                """
                provider_id,
                peer_group,
                total_claims,
                average_claim_reimbursement
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
        # NEW PROVIDER
        # ====================================================

        if not provider_result.data:

            return (
                self
                ._get_new_provider_peer_comparison(
                    provider_id=provider_id
                )
            )

        # ====================================================
        # HISTORICAL PROVIDER
        #
        # DO NOT CHANGE THIS LOGIC.
        # ====================================================

        provider = (
            provider_result.data[0]
        )

        peer_group = provider.get(
            "peer_group"
        )

        # ====================================================
        # GET PROVIDER RISK
        #
        # Historical provider's actual FWA score comes from
        # provider_risk.
        # ====================================================

        risk_result = (
            supabase_service.client
            .table("provider_risk")
            .select(
                """
                provider_id,
                overall_fwa_score
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        current_risk = (
            risk_result.data[0]
            if risk_result.data
            else {}
        )

        overall_fwa_risk = (
            current_risk.get(
                "overall_fwa_score"
            )
        )

        # ====================================================
        # NO PEER GROUP
        # ====================================================

        if not peer_group:

            return {

                "provider_id":
                    provider_id,

                "overall_fwa_risk":
                    overall_fwa_risk,

                "peer_group":
                    None,

                "peers":
                    [],

                "status":
                    "INSUFFICIENT_HISTORY",

                "comparison_available":
                    False,

                "claim_count":
                    provider.get(
                        "total_claims"
                    ),

                "message":
                    "Peer group is not available "
                    "for this provider.",
            }

        # ====================================================
        # FETCH HISTORICAL PEERS
        # ====================================================

        peers_result = (
            supabase_service.client
            .table("provider_features")
            .select(
                """
                provider_id,
                peer_group,
                total_claims,
                average_claim_reimbursement
                """
            )
            .eq(
                "peer_group",
                peer_group,
            )
            .neq(
                "provider_id",
                provider_id,
            )
            .execute()
        )

        peer_records = (
            peers_result.data
            or []
        )

        # ====================================================
        # NO PEERS
        # ====================================================

        if not peer_records:

            return {

                "provider_id":
                    provider_id,

                "overall_fwa_risk":
                    overall_fwa_risk,

                "peer_group":
                    peer_group,

                "peers":
                    [],

                "status":
                    "NO_PEERS",

                "comparison_available":
                    False,

                "claim_count":
                    provider.get(
                        "total_claims"
                    ),

                "message":
                    "No peer providers found "
                    "in the assigned peer group.",
            }

        # ====================================================
        # PEER PROVIDER IDS
        # ====================================================

        peer_provider_ids = [

            peer.get(
                "provider_id"
            )

            for peer in peer_records

            if peer.get(
                "provider_id"
            )
        ]

        # ====================================================
        # FETCH PEER FWA SCORES
        # ====================================================

        peer_risk_records = []

        if peer_provider_ids:

            peer_risk_result = (
                supabase_service.client
                .table("provider_risk")
                .select(
                    """
                    provider_id,
                    overall_fwa_score
                    """
                )
                .in_(
                    "provider_id",
                    peer_provider_ids,
                )
                .execute()
            )

            peer_risk_records = (
                peer_risk_result.data
                or []
            )

        # ====================================================
        # RISK LOOKUP
        # ====================================================

        risk_by_provider = {

            record.get(
                "provider_id"
            ):
                record.get(
                    "overall_fwa_score"
                )

            for record in peer_risk_records
        }

        # ====================================================
        # BUILD PEERS
        # ====================================================

        peers = []

        for peer in peer_records:

            peer_provider_id = (
                peer.get(
                    "provider_id"
                )
            )

            peers.append({

                "provider_id":
                    peer_provider_id,

                "overall_fwa_score":
                    risk_by_provider.get(
                        peer_provider_id
                    ),

                "total_claims":
                    peer.get(
                        "total_claims"
                    ),

                "average_claim_reimbursement":
                    peer.get(
                        "average_claim_reimbursement"
                    ),
            })

        # ====================================================
        # SORT PEERS
        # ====================================================

        peers.sort(
            key=lambda item: (
                item.get(
                    "overall_fwa_score"
                )
                if item.get(
                    "overall_fwa_score"
                ) is not None
                else float("-inf")
            ),
            reverse=True,
        )

        # ====================================================
        # HISTORICAL PROVIDER RESPONSE
        # ====================================================

        return {

            "provider_id":
                provider_id,

            "overall_fwa_risk":
                overall_fwa_risk,

            "peer_group":
                peer_group,

            "peers":
                peers,

            "status":
                "AVAILABLE",

            "comparison_available":
                True,

            "claim_count":
                provider.get(
                    "total_claims"
                ),

            "message":
                "Peer comparison available.",
        }

    # ========================================================
    # NEW PROVIDER PEER COMPARISON
    # ========================================================

    def _get_new_provider_peer_comparison(
        self,
        provider_id: str,
    ) -> dict:

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
        # GET NEW PROVIDER FWA SCORE
        #
        # IMPORTANT:
        #
        # We DO NOT calculate FWA score from peers.
        #
        # We directly fetch:
        #
        #     provider_risk.overall_fwa_score
        #
        # for this provider.
        # ====================================================

        risk_result = (
            supabase_service.client
            .table("provider_risk")
            .select(
                """
                provider_id,
                overall_fwa_score,
                fraud_risk_score,
                waste_risk_score,
                abuse_risk_score,
                fwa_risk_level
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .limit(1)
            .execute()
        )

        provider_risk = (
            risk_result.data[0]
            if risk_result.data
            else {}
        )

        overall_fwa_risk = (
            provider_risk.get(
                "overall_fwa_score"
            )
        )

        # ====================================================
        # FETCH NEW PROVIDER CLAIMS
        #
        # IMPORTANT:
        #
        # New provider claims come from:
        #
        #     claims
        #
        # NEVER:
        #
        #     provider_claims
        # ====================================================

        claims_result = (
            supabase_service.client
            .table("claims")
            .select(
                """
                claim_id,
                provider_id,
                claim_type,
                claim_reimbursement,
                beneficiary_id
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .execute()
        )

        claims = (
            claims_result.data
            or []
        )

        claim_count = len(
            claims
        )

        # ====================================================
        # NO CLAIMS
        # ====================================================

        if claim_count == 0:

            return {

                "provider_id":
                    provider_id,

                "overall_fwa_risk":
                    overall_fwa_risk,

                "peer_group":
                    None,

                "peers":
                    [],

                "status":
                    "COLD_START",

                "comparison_available":
                    False,

                "claim_count":
                    0,

                "message":
                    "Peer comparison is not available "
                    "until the provider submits claims.",
            }

        # ====================================================
        # TOTAL REIMBURSEMENT
        # ====================================================

        total_reimbursement = 0.0

        for claim in claims:

            try:

                total_reimbursement += float(
                    claim.get(
                        "claim_reimbursement"
                    )
                    or 0
                )

            except (
                TypeError,
                ValueError,
            ):

                continue

        # ====================================================
        # AVERAGE REIMBURSEMENT
        # ====================================================

        average_claim_reimbursement = (
            total_reimbursement
            / claim_count
        )

        # ====================================================
        # UNIQUE BENEFICIARIES
        # ====================================================

        beneficiary_ids = set()

        for claim in claims:

            beneficiary_id = (
                claim.get(
                    "beneficiary_id"
                )
            )

            if beneficiary_id:

                beneficiary_ids.add(
                    str(
                        beneficiary_id
                    )
                )

        beneficiary_count = len(
            beneficiary_ids
        )

        # ====================================================
        # FALLBACK
        #
        # Some of your current claims have NULL
        # beneficiary_id.
        # ====================================================

        if beneficiary_count == 0:

            beneficiary_count = (
                claim_count
            )

        # ====================================================
        # CLAIMS PER BENEFICIARY
        # ====================================================

        claims_per_beneficiary = (
            claim_count
            / beneficiary_count
        )

        # ====================================================
        # REIMBURSEMENT PER BENEFICIARY
        # ====================================================

        reimbursement_per_beneficiary = (
            total_reimbursement
            / beneficiary_count
        )

        # ====================================================
        # INPATIENT / OUTPATIENT
        # ====================================================

        inpatient_claims = 0

        for claim in claims:

            claim_type = str(
                claim.get(
                    "claim_type"
                )
                or ""
            ).strip().lower()

            if claim_type == "inpatient":

                inpatient_claims += 1

        # ====================================================
        # INPATIENT RATIO
        # ====================================================

        inpatient_claim_ratio = (
            inpatient_claims
            / claim_count
        )

        # ====================================================
        # PROVIDER SIZE
        # ====================================================

        if (
            claim_count
            <= self.SMALL_MAX_CLAIMS
        ):

            provider_size_band = (
                "Small"
            )

        elif (
            claim_count
            <= self.MEDIUM_MAX_CLAIMS
        ):

            provider_size_band = (
                "Medium"
            )

        else:

            provider_size_band = (
                "Large"
            )

        # ====================================================
        # SERVICE MIX
        # ====================================================

        if (
            inpatient_claim_ratio
            <= self.MOSTLY_OUTPATIENT_MAX
        ):

            service_mix_band = (
                "Mostly_Outpatient"
            )

        elif (
            inpatient_claim_ratio
            <= self.MIXED_MAX
        ):

            service_mix_band = (
                "Mixed"
            )

        else:

            service_mix_band = (
                "Mostly_Inpatient"
            )

        # ====================================================
        # TEMPORARY PEER GROUP
        #
        # IMPORTANT:
        #
        # This is NOT stored in provider_features.
        # ====================================================

        peer_group = (
            f"{provider_size_band}_"
            f"{service_mix_band}"
        )

        logger.info(
            "New provider %s temporary peer group=%s "
            "claims=%s inpatient_ratio=%.4f",
            provider_id,
            peer_group,
            claim_count,
            inpatient_claim_ratio,
        )

        # ====================================================
        # FIND HISTORICAL PEERS
        #
        # Historical peer population comes exclusively from:
        #
        #     provider_features
        #
        # The new provider is NOT inserted into that table.
        # ====================================================

        peers_result = (
            supabase_service.client
            .table("provider_features")
            .select(
                """
                provider_id,
                peer_group,
                total_claims,
                average_claim_reimbursement
                """
            )
            .eq(
                "peer_group",
                peer_group,
            )
            .execute()
        )

        peer_records = (
            peers_result.data
            or []
        )

        # ====================================================
        # NO HISTORICAL PEERS
        # ====================================================

        if not peer_records:

            return {

                "provider_id":
                    provider_id,

                "overall_fwa_risk":
                    overall_fwa_risk,

                "peer_group":
                    peer_group,

                "peers":
                    [],

                "status":
                    "NO_PEERS",

                "comparison_available":
                    False,

                "claim_count":
                    claim_count,

                "provider_size_band":
                    provider_size_band,

                "service_mix_band":
                    service_mix_band,

                "inpatient_claim_ratio":
                    inpatient_claim_ratio,

                "provider_metrics": {

                    "average_claim_reimbursement":
                        average_claim_reimbursement,

                    "claims_per_beneficiary":
                        claims_per_beneficiary,

                    "reimbursement_per_beneficiary":
                        reimbursement_per_beneficiary,
                },

                "message":
                    "Provider peer group was identified, "
                    "but no historical peer providers "
                    "were found in this group.",
            }

        # ====================================================
        # PEER IDS
        # ====================================================

        peer_provider_ids = [

            peer.get(
                "provider_id"
            )

            for peer in peer_records

            if peer.get(
                "provider_id"
            )
        ]

        # ====================================================
        # FETCH PEER RISK
        # ====================================================

        peer_risk_records = []

        if peer_provider_ids:

            peer_risk_result = (
                supabase_service.client
                .table("provider_risk")
                .select(
                    """
                    provider_id,
                    overall_fwa_score
                    """
                )
                .in_(
                    "provider_id",
                    peer_provider_ids,
                )
                .execute()
            )

            peer_risk_records = (
                peer_risk_result.data
                or []
            )

        # ====================================================
        # RISK LOOKUP
        # ====================================================

        risk_by_provider = {

            record.get(
                "provider_id"
            ):
                record.get(
                    "overall_fwa_score"
                )

            for record in peer_risk_records
        }

        # ====================================================
        # BUILD PEERS
        # ====================================================

        peers = []

        for peer in peer_records:

            peer_provider_id = (
                peer.get(
                    "provider_id"
                )
            )

            peers.append({

                "provider_id":
                    peer_provider_id,

                "overall_fwa_score":
                    risk_by_provider.get(
                        peer_provider_id
                    ),

                "total_claims":
                    peer.get(
                        "total_claims"
                    ),

                "average_claim_reimbursement":
                    peer.get(
                        "average_claim_reimbursement"
                    ),
            })

        # ====================================================
        # SORT PEERS
        # ====================================================

        peers.sort(
            key=lambda item: (
                item.get(
                    "overall_fwa_score"
                )
                if item.get(
                    "overall_fwa_score"
                ) is not None
                else float("-inf")
            ),
            reverse=True,
        )

        # ====================================================
        # FINAL NEW PROVIDER RESPONSE
        # ====================================================

        return {

            "provider_id":
                provider_id,

            # =================================================
            # ACTUAL PROVIDER FWA SCORE
            #
            # DIRECTLY FROM provider_risk
            # =================================================

            "overall_fwa_risk":
                overall_fwa_risk,

            # Optional explicit source so frontend knows this
            # is an actual provider risk score.
            "overall_fwa_risk_source":
                "PROVIDER_RISK",

            "peer_group":
                peer_group,

            "peers":
                peers,

            "status":
                "AVAILABLE",

            "comparison_available":
                True,

            "claim_count":
                claim_count,

            "provider_size_band":
                provider_size_band,

            "service_mix_band":
                service_mix_band,

            "inpatient_claim_ratio":
                inpatient_claim_ratio,

            "provider_metrics": {

                "average_claim_reimbursement":
                    average_claim_reimbursement,

                "claims_per_beneficiary":
                    claims_per_beneficiary,

                "reimbursement_per_beneficiary":
                    reimbursement_per_beneficiary,
            },

            "message":
                "Peer comparison available using "
                "the provider's submitted claims and "
                "historical peer providers.",
        }


# ============================================================
# SINGLETON
# ============================================================

peer_comparison_service = (
    PeerComparisonService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "PeerComparisonService",
    "peer_comparison_service",
]