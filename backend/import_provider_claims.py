"""
ClaimGuard AI
Import Claim-Level Historical Data

Source:
    data/claim_risk.csv

Imports the fields required for:
1. Historical Claims
2. Claim Details
3. Claim Anomaly Explainability
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.services.supabase_service import (
    supabase_service,
)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

CSV_FILE = (
    BASE_DIR
    / "data"
    / "claim_risk.csv"
)

BATCH_SIZE = 500


# ============================================================
# IMPORT FUNCTION
# ============================================================

def import_provider_claims():

    print("=" * 60)
    print("PROVIDER CLAIMS IMPORT")
    print("=" * 60)

    # ========================================================
    # CHECK FILE
    # ========================================================

    if not CSV_FILE.exists():

        raise FileNotFoundError(
            f"CSV file not found: {CSV_FILE}"
        )

    # ========================================================
    # LOAD CSV
    # ========================================================

    print(
        f"Reading: {CSV_FILE}"
    )

    df = pd.read_csv(
        CSV_FILE
    )

    print(
        f"CSV rows: {len(df)}"
    )

    # ========================================================
    # REQUIRED COLUMNS
    # ========================================================

    required_columns = [
        "ClaimID",
        "Provider",
        "ClaimType",
        "ClaimStartDt",
        "TotalClaimCost",
        "ClaimReimbursement",
        "ClaimDurationDays",
        "BeneficiaryAge",
        "ClaimRiskTier",

        # Claim anomaly information
        "ClaimAnomalyScore",
        "DiagnosisCodeCount",
        "ProcedureCodeCount",
        "PhysicianCount",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            "Missing required columns: "
            f"{missing_columns}"
        )

    # ========================================================
    # SELECT REQUIRED COLUMNS
    # ========================================================

    claims = df[
        required_columns
    ].copy()

    # ========================================================
    # RENAME COLUMNS
    # ========================================================

    claims = claims.rename(
        columns={

            "ClaimID":
                "claim_id",

            "Provider":
                "provider_id",

            "ClaimType":
                "claim_type",

            "ClaimStartDt":
                "claim_start_dt",

            "TotalClaimCost":
                "total_claim_cost",

            "ClaimReimbursement":
                "claim_reimbursement",

            "ClaimDurationDays":
                "claim_duration",

            "BeneficiaryAge":
                "beneficiary_age",

            "ClaimRiskTier":
                "claim_risk_tier",

            "ClaimAnomalyScore":
                "claim_anomaly_score",

            "DiagnosisCodeCount":
                "diagnosis_count",

            "ProcedureCodeCount":
                "procedure_count",

            "PhysicianCount":
                "physician_count",
        }
    )

    # ========================================================
    # CLAIM ID VALIDATION
    # ========================================================

    if claims["claim_id"].isna().any():

        raise ValueError(
            "Found claims with missing ClaimID."
        )

    duplicate_count = (
        claims["claim_id"]
        .duplicated()
        .sum()
    )

    if duplicate_count > 0:

        raise ValueError(
            f"Found {duplicate_count} "
            "duplicate ClaimID values."
        )

    # ========================================================
    # PROVIDER VALIDATION
    # ========================================================

    if claims["provider_id"].isna().any():

        raise ValueError(
            "Found claims with missing Provider ID."
        )

    # ========================================================
    # DATE CONVERSION
    # ========================================================

    claims[
        "claim_start_dt"
    ] = pd.to_datetime(
        claims[
            "claim_start_dt"
        ],
        errors="coerce",
    )

    # ========================================================
    # NUMERIC CONVERSION
    # ========================================================

    numeric_columns = [
        "total_claim_cost",
        "claim_reimbursement",
        "claim_duration",
        "beneficiary_age",
        "claim_anomaly_score",
        "diagnosis_count",
        "procedure_count",
        "physician_count",
    ]

    for column in numeric_columns:

        claims[column] = pd.to_numeric(
            claims[column],
            errors="coerce",
        )

    # ========================================================
    # BENEFICIARY AGE
    #
    # Example:
    # 66.3 -> 66
    # 66.7 -> 67
    # ========================================================

    claims[
        "beneficiary_age"
    ] = (
        claims[
            "beneficiary_age"
        ]
        .round()
        .astype("Int64")
    )

    # ========================================================
    # CLAIM DURATION
    # ========================================================

    claims[
        "claim_duration"
    ] = (
        claims[
            "claim_duration"
        ]
        .round()
        .astype("Int64")
    )

    # ========================================================
    # COUNT FIELDS
    # ========================================================

    count_columns = [
        "diagnosis_count",
        "procedure_count",
        "physician_count",
    ]

    for column in count_columns:

        claims[column] = (
            claims[column]
            .round()
            .astype("Int64")
        )

    # ========================================================
    # DATE FORMAT
    # ========================================================

    claims[
        "claim_start_dt"
    ] = (
        claims[
            "claim_start_dt"
        ]
        .dt.strftime(
            "%Y-%m-%d"
        )
    )

    # ========================================================
    # REPLACE NaN / NA WITH NONE
    # ========================================================

    claims = claims.where(
        pd.notnull(claims),
        None,
    )

    # ========================================================
    # CONVERT TO RECORDS
    # ========================================================

    records = claims.to_dict(
        orient="records"
    )

    total = len(records)

    print(
        f"Claims to import: {total}"
    )

    # ========================================================
    # UPSERT IN BATCHES
    # ========================================================

    for start in range(
        0,
        total,
        BATCH_SIZE,
    ):

        batch = records[
            start:
            start + BATCH_SIZE
        ]

        end = min(
            start + BATCH_SIZE,
            total
        )

        print(
            f"Upserting "
            f"{start + 1}-{end} "
            f"of {total}..."
        )

        result = (
            supabase_service.client
            .table(
                "provider_claims"
            )
            .upsert(
                batch,
                on_conflict="claim_id",
            )
            .execute()
        )

        if result.data is None:

            raise RuntimeError(
                "Provider claims import failed."
            )

    # ========================================================
    # COMPLETE
    # ========================================================

    print()
    print("=" * 60)
    print("IMPORT COMPLETED")
    print("=" * 60)

    print(
        f"Imported: {total} claim records"
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    import_provider_claims()