"""
ClaimGuard AI
Claim Submission Service
"""

from __future__ import annotations

import logging

from app.services.supabase_service import (
    supabase_service,
)

from app.services.claim_anomaly_service import (
    claim_anomaly_service,
)

from app.services.provider_risk_service import (
    provider_risk_service,
)


logger = logging.getLogger(__name__)


class ClaimSubmissionService:

    SERVICE_NAME = "claim_submission_service"

    # ========================================================
    # CHECK PROVIDER CLAIM HISTORY
    # ========================================================

    def _get_provider_claim_count(
        self,
        provider_id: str,
    ) -> int:

        result = (
            supabase_service.client
            .table("claims")
            .select(
                "claim_id",
                count="exact",
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .execute()
        )

        return result.count or 0

    # ========================================================
    # SAVE SUBMITTED CLAIM TO HISTORICAL CLAIMS
    #
    # Every successfully submitted claim is copied to
    # provider_claims so the Historical Claims screen contains
    # the claims submitted by the provider.
    #
    # claims and provider_claims have different schemas, so
    # fields are mapped explicitly.
    # ========================================================

    def _save_claim_to_historical(
        self,
        claim_record: dict,
    ) -> None:

        historical_record = {

              "claim_id":
        claim_record["claim_id"],

    "provider_id":
        claim_record["provider_id"],

    "claim_type":
        claim_record.get("claim_type"),

    "claim_start_dt":
        claim_record.get("claim_start_date"),

    "total_claim_cost":
        claim_record.get("total_claim_cost"),

    "claim_reimbursement":
        claim_record.get("claim_reimbursement"),

    "claim_duration":
        claim_record.get("claim_duration"),

    "beneficiary_age":
        claim_record.get("beneficiary_age"),

    "claim_risk_tier": None,

    "claim_anomaly_score": None,

    "diagnosis_count":
        claim_record.get("diagnosis_count"),

    "procedure_count":
        claim_record.get("procedure_count"),

    "physician_count":
        claim_record.get("physician_count"),
        }

        try:

            result = (
                supabase_service.client
                .table("provider_claims")
                .upsert(
                    historical_record,
                    on_conflict="claim_id",
                )
                .execute()
            )

        except Exception as exc:

            logger.exception(
                "Failed to save claim %s to provider_claims.",
                claim_record["claim_id"],
            )

            raise ValueError(
                "Claim was submitted but could not be added "
                "to historical claims."
            ) from exc

        if not result.data:

            raise ValueError(
                "Claim was submitted but could not be added "
                "to historical claims."
            )

        logger.info(
            "Claim %s copied to provider_claims for provider %s.",
            claim_record["claim_id"],
            claim_record["provider_id"],
        )

    # ========================================================
    # SAVE CLAIM RISK ASSESSMENT
    #
    # ML fields are saved to claims. The fields that actually
    # exist in provider_claims are synchronized there as well.
    # provider_claims does not contain fraud_probability or
    # combined_risk_score, so those are never written there.
    # ========================================================

    def _save_claim_risk_assessment(
        self,
        claim_id: str,
        anomaly_result: dict,
    ) -> None:

        update_data = {

            "fraud_probability":
                anomaly_result.get(
                    "fraud_probability"
                ),

            "claim_anomaly_score":
                anomaly_result.get(
                    "claim_anomaly_score"
                ),

            "combined_risk_score":
                anomaly_result.get(
                    "combined_risk_score"
                ),

            "claim_risk_tier":
                anomaly_result.get(
                    "claim_risk_tier"
                ),
        }

        (
            supabase_service.client
            .table("claims")
            .update(update_data)
            .eq(
                "claim_id",
                claim_id,
            )
            .execute()
        )

        historical_update = {

            "claim_anomaly_score":
                anomaly_result.get(
                    "claim_anomaly_score"
                ),

            "claim_risk_tier":
                anomaly_result.get(
                    "claim_risk_tier"
                ),
        }

        historical_result = (
            supabase_service.client
            .table("provider_claims")
            .update(historical_update)
            .eq(
                "claim_id",
                claim_id,
            )
            .execute()
        )

        if not historical_result.data:

            logger.warning(
                "Historical claim %s was not updated with risk data.",
                claim_id,
            )

    # ========================================================
    # SUBMIT CLAIM
    # ========================================================

    def submit_claim(
        self,
        claim_data,
        provider_id: str,
    ) -> dict:

        # ====================================================
        # PROVIDER ID
        # ====================================================

        provider_id = (
            provider_id
            .strip()
            .upper()
        )

        # ====================================================
        # CLAIM ID
        # ====================================================

        claim_id = (
            claim_data.claim_id
            .strip()
            .upper()
        )

        # ====================================================
        # CHECK DUPLICATE CLAIM
        # ====================================================

        existing_claim = (
            supabase_service.client
            .table("claims")
            .select(
                "claim_id",
            )
            .eq(
                "claim_id",
                claim_id,
            )
            .limit(1)
            .execute()
        )

        if existing_claim.data:

            raise ValueError(
                "Claim ID already exists."
            )

        # ====================================================
        # CHECK PROVIDER HISTORY
        # ====================================================

        previous_claim_count = (
            self._get_provider_claim_count(
                provider_id
            )
        )

        # ====================================================
        # CALCULATE CLAIM DURATION
        # ====================================================

        claim_duration = (
            claim_data.claim_end_dt
            - claim_data.claim_start_dt
        ).days

        if claim_duration < 0:

            raise ValueError(
                "Claim end date cannot be "
                "before claim start date."
            )

        # ====================================================
        # STORE CLAIM
        # ====================================================

        claim_record = {

            "claim_id":
                claim_id,

            "provider_id":
                provider_id,

            "claim_type":
                claim_data.claim_type,

            "beneficiary_id":
                claim_data.beneficiary_id,

            "claim_reimbursement":
                claim_data.claim_reimbursement,

            "claim_deductible":
                claim_data.claim_deductible,

            "total_claim_cost":
                claim_data.total_claim_cost,

            "claim_start_date":
                claim_data.claim_start_dt.isoformat(),

            "claim_duration":
                claim_duration,

            "beneficiary_age":
                claim_data.beneficiary_age,

            "chronic_condition_count":
                claim_data.chronic_condition_count,

            "diagnosis_count":
                claim_data.diagnosis_count,

            "procedure_count":
                claim_data.procedure_count,

            "physician_count":
                claim_data.physician_count,

            "attending_physician_id":
                claim_data.attending_physician_id,

            "operating_physician_id":
                claim_data.operating_physician_id,

            "other_physician_id":
                claim_data.other_physician_id,
        }

        # ====================================================
        # INSERT CLAIM
        # ====================================================

        claim_result = (
            supabase_service.client
            .table("claims")
            .insert(
                claim_record
            )
            .execute()
        )

        if not claim_result.data:

            raise ValueError(
                "Unable to store claim."
            )

        # ====================================================
        # COPY SUBMITTED CLAIM TO HISTORICAL CLAIMS
        # ====================================================

        self._save_claim_to_historical(
            claim_record
        )

        # ====================================================
        # CURRENT CLAIM COUNT
        # ====================================================

        current_claim_count = (
            previous_claim_count + 1
        )

        # ====================================================
        # ====================================================
        # COLD-START PERIOD
        # ====================================================
        #
        # Claims 1 - 4
        #
        # ====================================================

        if current_claim_count < 5:

            # =================================================
            # CLAIM 1
            # =================================================

            if current_claim_count == 1:

                return {

                    "message":
                        "Claim submitted successfully. "
                        "Provider is in cold-start period.",

                    "claim_id":
                        claim_id,

                    "provider_id":
                        provider_id,

                    "beneficiary_id":
                        claim_data.beneficiary_id,

                    "provider_status":
                        "COLD_START",

                    "previous_claim_count":
                        previous_claim_count,

                    "current_claim_count":
                        current_claim_count,

                    "fraud_probability":
                        None,

                    "claim_anomaly_score":
                        None,

                    "claim_anomaly_score_100":
                        None,

                    "combined_risk_score":
                        None,

                    "claim_risk_tier":
                        "COLD_START",

                    "investigation_created":
                        False,

                    "investigation_id":
                        None,

                    "investigation_priority":
                        None,

                    "investigation_status":
                        None,

                    "claim_anomaly_assessed":
                        False,
                }

            # =================================================
            # CLAIMS 2 - 4
            # =================================================

            anomaly_result = None

            if (
                current_claim_count
                >= claim_anomaly_service.MINIMUM_CLAIMS
            ):

                try:

                    anomaly_result = (
                        claim_anomaly_service
                        .predict_claim(
                            provider_id=provider_id,
                            claim_id=claim_id,
                        )
                    )

                    # =========================================
                    # SAVE CLAIM-LEVEL RISK
                    # =========================================

                    self._save_claim_risk_assessment(
                        claim_id=claim_id,
                        anomaly_result=anomaly_result,
                    )

                except Exception as exc:

                    logger.exception(
                        "Claim anomaly assessment failed "
                        "for claim %s.",
                        claim_id,
                    )

                    return {

                        "message":
                            "Claim submitted successfully, "
                            "but claim anomaly assessment "
                            "could not be completed.",

                        "claim_id":
                            claim_id,

                        "provider_id":
                            provider_id,

                        "beneficiary_id":
                            claim_data.beneficiary_id,

                        "provider_status":
                            "COLD_START",

                        "previous_claim_count":
                            previous_claim_count,

                        "current_claim_count":
                            current_claim_count,

                        "fraud_probability":
                            None,

                        "claim_anomaly_score":
                            None,

                        "claim_anomaly_score_100":
                            None,

                        "combined_risk_score":
                            None,

                        "claim_risk_tier":
                            "ASSESSMENT_FAILED",

                        "investigation_created":
                            False,

                        "investigation_id":
                            None,

                        "investigation_priority":
                            None,

                        "investigation_status":
                            None,

                        "claim_anomaly_assessed":
                            False,

                        "claim_anomaly_error":
                            str(exc),
                    }

            # =================================================
            # BUILD RESPONSE
            # =================================================

            response = {

                "message":
                    "Claim submitted successfully. "
                    "Provider is still in "
                    "cold-start period.",

                "claim_id":
                    claim_id,

                "provider_id":
                    provider_id,

                "beneficiary_id":
                    claim_data.beneficiary_id,

                "provider_status":
                    "COLD_START",

                "previous_claim_count":
                    previous_claim_count,

                "current_claim_count":
                    current_claim_count,

                "fraud_probability":
                    None,

                "claim_anomaly_score":
                    None,

                "claim_anomaly_score_100":
                    None,

                "combined_risk_score":
                    None,

                "claim_risk_tier":
                    "COLD_START",

                "investigation_created":
                    False,

                "investigation_id":
                    None,

                "investigation_priority":
                    None,

                "investigation_status":
                    None,

                "claim_anomaly_assessed":
                    anomaly_result is not None,
            }

            # =================================================
            # ADD ANOMALY RESULT
            # =================================================

            if anomaly_result is not None:

                response[
                    "fraud_probability"
                ] = anomaly_result.get(
                    "fraud_probability"
                )

                response[
                    "claim_anomaly_score"
                ] = anomaly_result.get(
                    "claim_anomaly_score"
                )

                response[
                    "claim_anomaly_score_100"
                ] = anomaly_result.get(
                    "claim_anomaly_score_100"
                )

                response[
                    "combined_risk_score"
                ] = anomaly_result.get(
                    "combined_risk_score"
                )

                response[
                    "claim_risk_tier"
                ] = (
                    anomaly_result.get(
                        "claim_risk_tier"
                    )
                    or "COLD_START"
                )

                response[
                    "claim_anomaly"
                ] = {

                    "prediction":
                        anomaly_result.get(
                            "prediction"
                        ),

                    "is_anomalous":
                        anomaly_result.get(
                            "is_anomalous"
                        ),

                    "isolation_score":
                        anomaly_result.get(
                            "isolation_score"
                        ),

                    "claim_anomaly_score":
                        anomaly_result.get(
                            "claim_anomaly_score"
                        ),

                    "claim_anomaly_score_100":
                        anomaly_result.get(
                            "claim_anomaly_score_100"
                        ),

                    "claim_risk_tier":
                        anomaly_result.get(
                            "claim_risk_tier"
                        ),
                }

            return response

        # ====================================================
        # ====================================================
        # CLAIM #5
        # ====================================================
        #
        # Claim #5 activates provider-level assessment.
        #
        # BUT claim #5 must ALSO receive its own
        # claim-level anomaly assessment first.
        #
        # ====================================================

        if current_claim_count == 5:

            # =================================================
            # CLAIM #5 CLAIM-LEVEL ANOMALY ASSESSMENT
            # =================================================

            anomaly_result = None

            try:

                anomaly_result = (
                    claim_anomaly_service
                    .predict_claim(
                        provider_id=provider_id,
                        claim_id=claim_id,
                    )
                )

                # =============================================
                # SAVE CLAIM #5 RISK
                # =============================================

                self._save_claim_risk_assessment(
                    claim_id=claim_id,
                    anomaly_result=anomaly_result,
                )

            except Exception as exc:

                logger.exception(
                    "Claim #5 anomaly assessment failed "
                    "for claim %s.",
                    claim_id,
                )

                return {

                    "message":
                        "Claim submitted successfully, "
                        "but claim anomaly assessment "
                        "could not be completed.",

                    "claim_id":
                        claim_id,

                    "provider_id":
                        provider_id,

                    "beneficiary_id":
                        claim_data.beneficiary_id,

                    "provider_status":
                        "ASSESSMENT_FAILED",

                    "previous_claim_count":
                        previous_claim_count,

                    "current_claim_count":
                        current_claim_count,

                    "fraud_probability":
                        None,

                    "claim_anomaly_score":
                        None,

                    "claim_anomaly_score_100":
                        None,

                    "combined_risk_score":
                        None,

                    "claim_risk_tier":
                        "ASSESSMENT_FAILED",

                    "investigation_created":
                        False,

                    "investigation_id":
                        None,

                    "investigation_priority":
                        None,

                    "investigation_status":
                        None,

                    "claim_anomaly_assessed":
                        False,

                    "claim_anomaly_error":
                        str(exc),
                }

            # =================================================
            # RUN PROVIDER RISK ASSESSMENT
            # =================================================

            try:

                provider_assessment = (
                    provider_risk_service
                    .assess_submitted_provider(
                        provider_id
                    )
                )

            except Exception as exc:

                logger.exception(
                    "Provider risk assessment failed "
                    "for provider %s.",
                    provider_id,
                )

                return {

                    "message":
                        "Claim submitted successfully, "
                        "but provider risk assessment "
                        "could not be completed.",

                    "claim_id":
                        claim_id,

                    "provider_id":
                        provider_id,

                    "beneficiary_id":
                        claim_data.beneficiary_id,

                    "provider_status":
                        "ASSESSMENT_FAILED",

                    "previous_claim_count":
                        previous_claim_count,

                    "current_claim_count":
                        current_claim_count,

                    "fraud_probability":
                        None,

                    "claim_anomaly_score":
                        anomaly_result.get(
                            "claim_anomaly_score"
                        ),

                    "claim_anomaly_score_100":
                        anomaly_result.get(
                            "claim_anomaly_score_100"
                        ),

                    "combined_risk_score":
                        anomaly_result.get(
                            "combined_risk_score"
                        ),

                    "claim_risk_tier":
                        anomaly_result.get(
                            "claim_risk_tier"
                        ),

                    "investigation_created":
                        False,

                    "investigation_id":
                        None,

                    "investigation_priority":
                        None,

                    "investigation_status":
                        None,

                    "claim_anomaly_assessed":
                        True,

                    "claim_anomaly_error":
                        None,

                    "provider_risk_assessment_required":
                        True,

                    "provider_risk_error":
                        str(exc),
                }

            # =================================================
            # PROVIDER MODEL RESULT
            # =================================================

            fraud_probability = (
                provider_assessment.get(
                    "fraud_probability"
                )
            )

            predicted_fraud = (
                provider_assessment.get(
                    "predicted_fraud"
                )
            )

            provider_risk_tier = (
                provider_assessment.get(
                    "risk_tier"
                )
            )

            # =================================================
            # INVESTIGATION DEFAULTS
            # =================================================

            investigation_created = False

            investigation_id = None

            investigation_priority = None

            investigation_status = None

            # =================================================
            # INVESTIGATION THRESHOLD
            #
            # Provider fraud probability >= 0.60
            # =================================================

            if (
                fraud_probability is not None
                and fraud_probability >= 0.60
            ):

                # =============================================
                # CHECK EXISTING ACTIVE INVESTIGATION
                # =============================================

                existing_investigation = (
                    supabase_service.client
                    .table("investigations")
                    .select(
                        """
                        investigation_id,
                        status
                        """
                    )
                    .eq(
                        "provider_id",
                        provider_id,
                    )
                    .eq(
                        "status",
                        "ASSIGNED",
                    )
                    .limit(1)
                    .execute()
                )

                if existing_investigation.data:

                    existing = (
                        existing_investigation
                        .data[0]
                    )

                    investigation_id = (
                        existing[
                            "investigation_id"
                        ]
                    )

                    investigation_status = (
                        existing[
                            "status"
                        ]
                    )

                    investigation_created = False

                else:

                    # =========================================
                    # DETERMINE INVESTIGATION PRIORITY
                    # =========================================

                    if fraud_probability >= 0.75:

                        investigation_priority = (
                            "High"
                        )

                    elif fraud_probability >= 0.30:

                        investigation_priority = (
                            "Medium"
                        )

                    else:

                        investigation_priority = (
                            "Low"
                        )

                    # =========================================
                    # CREATE INVESTIGATION
                    # =========================================

                    investigation_insert = (
                        supabase_service.client
                        .table("investigations")
                        .insert(
                            {
                                "provider_id":
                                    provider_id,

                                "status":
                                    "UNASSIGNED",
                            }
                        )
                        .execute()
                    )

                    if investigation_insert.data:

                        investigation = (
                            investigation_insert
                            .data[0]
                        )

                        investigation_id = (
                            investigation[
                                "investigation_id"
                            ]
                        )

                        investigation_status = (
                            investigation[
                                "status"
                            ]
                        )

                        investigation_created = True

            # =================================================
            # FINAL CLAIM #5 RESPONSE
            # =================================================

            return {

                "message":
                    "Claim submitted successfully. "
                    "Provider risk assessment completed.",

                "claim_id":
                    claim_id,

                "provider_id":
                    provider_id,

                "beneficiary_id":
                    claim_data.beneficiary_id,

                "provider_status":
                    "ASSESSED",

                "previous_claim_count":
                    previous_claim_count,

                "current_claim_count":
                    current_claim_count,

                # =============================================
                # PROVIDER-LEVEL RISK
                # =============================================

                "fraud_probability":
                    fraud_probability,

                # =============================================
                # CLAIM-LEVEL RISK
                # =============================================

                "claim_anomaly_score":
                    anomaly_result.get(
                        "claim_anomaly_score"
                    ),

                "claim_anomaly_score_100":
                    anomaly_result.get(
                        "claim_anomaly_score_100"
                    ),

                "combined_risk_score":
                    anomaly_result.get(
                        "combined_risk_score"
                    ),

                "claim_risk_tier":
                    anomaly_result.get(
                        "claim_risk_tier"
                    ),

                # =============================================
                # INVESTIGATION
                # =============================================

                "investigation_created":
                    investigation_created,

                "investigation_id":
                    investigation_id,

                "investigation_priority":
                    investigation_priority,

                "investigation_status":
                    investigation_status,

                # =============================================
                # ASSESSMENT FLAGS
                # =============================================

                "claim_anomaly_assessed":
                    True,

                "provider_risk_assessment_required":
                    False,

                "predicted_fraud":
                    predicted_fraud,

                "claim_anomaly":
                    {
                        "prediction":
                            anomaly_result.get(
                                "prediction"
                            ),

                        "is_anomalous":
                            anomaly_result.get(
                                "is_anomalous"
                            ),

                        "isolation_score":
                            anomaly_result.get(
                                "isolation_score"
                            ),

                        "claim_anomaly_score":
                            anomaly_result.get(
                                "claim_anomaly_score"
                            ),

                        "claim_anomaly_score_100":
                            anomaly_result.get(
                                "claim_anomaly_score_100"
                            ),

                        "claim_risk_tier":
                            anomaly_result.get(
                                "claim_risk_tier"
                            ),
                    },
            }

        # ====================================================
        # ====================================================
        # EXISTING PROVIDER — 6+ CLAIMS
        # ====================================================
        #
        # Existing providers continue to receive claim-level
        # anomaly assessment.
        #
        # ====================================================

        anomaly_result = None

        if (
            current_claim_count
            >= claim_anomaly_service.MINIMUM_CLAIMS
        ):

            try:

                anomaly_result = (
                    claim_anomaly_service
                    .predict_claim(
                        provider_id=provider_id,
                        claim_id=claim_id,
                    )
                )

                # =============================================
                # SAVE CLAIM-LEVEL RISK
                # =============================================

                self._save_claim_risk_assessment(
                    claim_id=claim_id,
                    anomaly_result=anomaly_result,
                )

            except Exception as exc:

                logger.exception(
                    "Claim anomaly assessment failed "
                    "for existing provider claim %s.",
                    claim_id,
                )

                return {

                    "message":
                        "Claim submitted successfully, "
                        "but claim anomaly assessment "
                        "could not be completed.",

                    "claim_id":
                        claim_id,

                    "provider_id":
                        provider_id,

                    "beneficiary_id":
                        claim_data.beneficiary_id,

                    "provider_status":
                        "EXISTING",

                    "previous_claim_count":
                        previous_claim_count,

                    "current_claim_count":
                        current_claim_count,

                    "fraud_probability":
                        None,

                    "claim_anomaly_score":
                        None,

                    "claim_anomaly_score_100":
                        None,

                    "combined_risk_score":
                        None,

                    "claim_risk_tier":
                        "ASSESSMENT_FAILED",

                    "investigation_created":
                        False,

                    "investigation_id":
                        None,

                    "investigation_priority":
                        None,

                    "investigation_status":
                        None,

                    "claim_anomaly_assessed":
                        False,

                    "claim_anomaly_error":
                        str(exc),
                }

        # ====================================================
        # EXISTING PROVIDER RESPONSE
        # ====================================================

        response = {

            "message":
                "Claim submitted successfully.",

            "claim_id":
                claim_id,

            "provider_id":
                provider_id,

            "beneficiary_id":
                claim_data.beneficiary_id,

            "provider_status":
                "EXISTING",

            "previous_claim_count":
                previous_claim_count,

            "current_claim_count":
                current_claim_count,

            "fraud_probability":
                None,

            "claim_anomaly_score":
                None,

            "claim_anomaly_score_100":
                None,

            "combined_risk_score":
                None,

            "claim_risk_tier":
                "LOW",

            "investigation_created":
                False,

            "investigation_id":
                None,

            "investigation_priority":
                None,

            "investigation_status":
                None,

            "claim_anomaly_assessed":
                anomaly_result is not None,
        }

        # ====================================================
        # INCLUDE ANOMALY RESULT
        # ====================================================

        if anomaly_result is not None:

            response[
                "fraud_probability"
            ] = anomaly_result.get(
                "fraud_probability"
            )

            response[
                "claim_anomaly_score"
            ] = anomaly_result.get(
                "claim_anomaly_score"
            )

            response[
                "claim_anomaly_score_100"
            ] = anomaly_result.get(
                "claim_anomaly_score_100"
            )

            response[
                "combined_risk_score"
            ] = anomaly_result.get(
                "combined_risk_score"
            )

            response[
                "claim_risk_tier"
            ] = (
                anomaly_result.get(
                    "claim_risk_tier"
                )
                or "LOW"
            )

            response[
                "claim_anomaly"
            ] = {

                "prediction":
                    anomaly_result.get(
                        "prediction"
                    ),

                "is_anomalous":
                    anomaly_result.get(
                        "is_anomalous"
                    ),

                "isolation_score":
                    anomaly_result.get(
                        "isolation_score"
                    ),

                "claim_anomaly_score":
                    anomaly_result.get(
                        "claim_anomaly_score"
                    ),

                "claim_anomaly_score_100":
                    anomaly_result.get(
                        "claim_anomaly_score_100"
                    ),

                "claim_risk_tier":
                    anomaly_result.get(
                        "claim_risk_tier"
                    ),
            }

        return response

    # ========================================================
    # ASSESS EXISTING PROVIDER
    # ========================================================

    def assess_existing_provider(
        self,
        provider_id: str,
    ) -> dict:

        provider_id = (
            provider_id
            .strip()
            .upper()
        )

        # ====================================================
        # CHECK CLAIM COUNT
        # ====================================================

        claim_count = (
            self._get_provider_claim_count(
                provider_id
            )
        )

        if claim_count < 5:

            raise ValueError(
                "Provider must have at least "
                "5 claims before assessment."
            )

        # ====================================================
        # RUN PROVIDER RISK MODEL
        # ====================================================

        assessment = (
            provider_risk_service
            .assess_submitted_provider(
                provider_id
            )
        )

        fraud_probability = (
            assessment.get(
                "fraud_probability"
            )
        )

        predicted_fraud = (
            assessment.get(
                "predicted_fraud"
            )
        )

        risk_tier = (
            assessment.get(
                "risk_tier"
            )
        )

        # ====================================================
        # INVESTIGATION DEFAULTS
        # ====================================================

        investigation_created = False

        investigation_id = None

        investigation_priority = None

        investigation_status = None

        # ====================================================
        # INVESTIGATION THRESHOLD
        # ====================================================

        if (
            fraud_probability is not None
            and fraud_probability >= 0.60
        ):

            # =================================================
            # CHECK ACTIVE INVESTIGATION
            # =================================================

            existing = (
                supabase_service.client
                .table("investigations")
                .select(
                    """
                    investigation_id,
                    status
                    """
                )
                .eq(
                    "provider_id",
                    provider_id,
                )
                .limit(1)
                .execute()
            )

            if existing.data:

                investigation = (
                    existing.data[0]
                )

                investigation_id = (
                    investigation[
                        "investigation_id"
                    ]
                )

                investigation_status = (
                    investigation[
                        "status"
                    ]
                )

            else:

                # =================================================
                # PRIORITY
                # =================================================

                if fraud_probability >= 0.60:

                    investigation_priority = (
                        "High"
                    )

                elif fraud_probability >= 0.30:

                    investigation_priority = (
                        "Medium"
                    )

                else:

                    investigation_priority = (
                        "Low"
                    )

                # =================================================
                # CREATE INVESTIGATION
                # =================================================

                result = (
                    supabase_service.client
                    .table("investigations")
                    .insert(
                        {
                            "provider_id":
                                provider_id,

                            "status":
                                "UNASSIGNED",
                        }
                    )
                    .execute()
                )

                if result.data:

                    investigation = (
                        result.data[0]
                    )

                    investigation_id = (
                        investigation[
                            "investigation_id"
                        ]
                    )

                    investigation_status = (
                        investigation[
                            "status"
                        ]
                    )

                    investigation_created = True

        # ====================================================
        # RETURN
        # ====================================================

        return {

            "provider_id":
                provider_id,

            "claim_count":
                claim_count,

            "provider_risk_assessed":
                True,

            "fraud_probability":
                fraud_probability,

            "predicted_fraud":
                predicted_fraud,

            "risk_tier":
                risk_tier,

            "investigation_created":
                investigation_created,

            "investigation_id":
                investigation_id,

            "investigation_priority":
                investigation_priority,

            "investigation_status":
                investigation_status,
        }


# ============================================================
# SINGLETON
# ============================================================

claim_service = (
    ClaimSubmissionService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "ClaimSubmissionService",
    "claim_service",
]