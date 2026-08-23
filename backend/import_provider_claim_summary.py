"""
ClaimGuard AI
Import Provider Claim Risk Summary

Source:
    data/claim_risk.csv

Creates one summary record per provider.
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

def import_provider_claim_summary():

    print("=" * 60)
    print("PROVIDER CLAIM SUMMARY IMPORT")
    print("=" * 60)

    # ========================================================
    # CHECK FILE
    # ========================================================

    if not CSV_FILE.exists():

        raise FileNotFoundError(
            f"CSV file not found: {CSV_FILE}"
        )

    print(
        f"Reading: {CSV_FILE}"
    )

    # ========================================================
    # LOAD CSV
    # ========================================================

    df = pd.read_csv(
        CSV_FILE
    )

    print(
        f"CSV rows: {len(df)}"
    )

    # ========================================================
    # VALIDATE COLUMNS
    # ========================================================

    required_columns = [
        "Provider",
        "ClaimRiskTier",
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
    # VALIDATE RISK TIERS
    # ========================================================

    expected_tiers = {
        "Very High Risk",
        "High Risk",
        "Medium Risk",
        "Low Risk",
    }

    actual_tiers = set(
        df["ClaimRiskTier"]
        .dropna()
        .unique()
    )

    unexpected_tiers = (
        actual_tiers
        - expected_tiers
    )

    if unexpected_tiers:

        raise ValueError(
            "Unexpected ClaimRiskTier values: "
            f"{unexpected_tiers}"
        )

    # ========================================================
    # CREATE SUMMARY
    # ========================================================

    summary = (
        df.groupby("Provider")
        .agg(
            total_claims=(
                "ClaimID",
                "count",
            ),

            very_high_risk_claims=(
                "ClaimRiskTier",
                lambda values:
                    (
                        values
                        == "Very High Risk"
                    ).sum(),
            ),

            high_risk_claims=(
                "ClaimRiskTier",
                lambda values:
                    (
                        values
                        == "High Risk"
                    ).sum(),
            ),

            medium_risk_claims=(
                "ClaimRiskTier",
                lambda values:
                    (
                        values
                        == "Medium Risk"
                    ).sum(),
            ),

            low_risk_claims=(
                "ClaimRiskTier",
                lambda values:
                    (
                        values
                        == "Low Risk"
                    ).sum(),
            ),
        )
        .reset_index()
    )

    # ========================================================
    # RENAME PROVIDER
    # ========================================================

    summary = summary.rename(
        columns={
            "Provider":
                "provider_id",
        }
    )

    # ========================================================
    # CONVERT NUMERIC TYPES
    # ========================================================

    summary[
        "total_claims"
    ] = summary[
        "total_claims"
    ].astype(int)

    summary[
        "very_high_risk_claims"
    ] = summary[
        "very_high_risk_claims"
    ].astype(int)

    summary[
        "high_risk_claims"
    ] = summary[
        "high_risk_claims"
    ].astype(int)

    summary[
        "medium_risk_claims"
    ] = summary[
        "medium_risk_claims"
    ].astype(int)

    summary[
        "low_risk_claims"
    ] = summary[
        "low_risk_claims"
    ].astype(int)

    # ========================================================
    # VALIDATE PROVIDER COUNT
    # ========================================================

    print(
        f"Unique providers in CSV: "
        f"{len(summary)}"
    )

    # ========================================================
    # CONVERT TO RECORDS
    # ========================================================

    records = summary.to_dict(
        orient="records"
    )

    # ========================================================
    # UPSERT INTO SUPABASE
    # ========================================================

    total = len(records)

    for start in range(
        0,
        total,
        BATCH_SIZE,
    ):

        batch = records[
            start:
            start + BATCH_SIZE
        ]

        print(
            f"Upserting "
            f"{start + 1}-"
            f"{min(start + BATCH_SIZE, total)} "
            f"of {total}..."
        )

        result = (
            supabase_service.client
            .table(
                "provider_claim_summary"
            )
            .upsert(
                batch,
                on_conflict="provider_id",
            )
            .execute()
        )

        if result.data is None:

            raise RuntimeError(
                "Failed to import "
                "provider claim summary."
            )

    # ========================================================
    # COMPLETED
    # ========================================================

    print()
    print("=" * 60)
    print("IMPORT COMPLETED")
    print("=" * 60)

    print(
        f"Imported providers: {total}"
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    import_provider_claim_summary()