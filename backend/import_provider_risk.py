"""
ClaimGuard AI
Import ML Provider Risk Data into Supabase
"""

from __future__ import annotations

import os
import pandas as pd

from app.services.supabase_service import (
    supabase_service,
)


CSV_FILE =  "data/provider_risk.csv"

BATCH_SIZE = 500


def import_provider_risk():

    # ========================================================
    # LOAD CSV
    # ========================================================

    if not os.path.exists(CSV_FILE):

        raise FileNotFoundError(
            f"File not found: {CSV_FILE}"
        )

    df = pd.read_csv(CSV_FILE)

    print("=" * 60)
    print("PROVIDER RISK IMPORT")
    print("=" * 60)

    print(
        f"CSV rows: {len(df)}"
    )

    # ========================================================
    # REQUIRED COLUMNS
    # ========================================================

    required_columns = [
        "Provider",
        "FraudRiskScore",
        "WasteRiskScore",
        "AbuseRiskScore",
        "OverallFWAScore",
        "FWARiskLevel",
        "AnomalousClaims",
        "MaximumClaimAnomalyScore",
        "InvestigationPriorityScore",
        "InvestigationPriority",
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:

        raise ValueError(
            f"Missing columns: {missing}"
        )

    # ========================================================
    # RENAME COLUMNS
    # ========================================================

    df = df.rename(
        columns={
            "Provider":
                "provider_id",

            "FraudRiskScore":
                "fraud_risk_score",

            "WasteRiskScore":
                "waste_risk_score",

            "AbuseRiskScore":
                "abuse_risk_score",

            "OverallFWAScore":
                "overall_fwa_score",

            "FWARiskLevel":
                "fwa_risk_level",

            "AnomalousClaims":
                "anomalous_claims",

            "MaximumClaimAnomalyScore":
                "maximum_claim_anomaly_score",

            "InvestigationPriorityScore":
                "investigation_priority_score",

            "InvestigationPriority":
                "investigation_priority",
        }
    )

    # ========================================================
    # CONVERT NAN → NONE
    # ========================================================

    df = df.where(
        pd.notnull(df),
        None,
    )

    # ========================================================
    # CONVERT TO RECORDS
    # ========================================================

    records = df[
        [
            "provider_id",
            "fraud_risk_score",
            "waste_risk_score",
            "abuse_risk_score",
            "overall_fwa_score",
            "fwa_risk_level",
            "anomalous_claims",
            "maximum_claim_anomaly_score",
            "investigation_priority_score",
            "investigation_priority",
        ]
    ].to_dict(
        orient="records"
    )

    # ========================================================
    # INSERT IN BATCHES
    # ========================================================

    total = len(records)

    for start in range(
        0,
        total,
        BATCH_SIZE,
    ):

        batch = records[
            start:start + BATCH_SIZE
        ]

        print(
            f"Inserting "
            f"{start + 1}-{min(start + BATCH_SIZE, total)} "
            f"of {total}..."
        )

        result = (
            supabase_service.client
            .table("provider_risk")
            .upsert(
                batch,
                on_conflict="provider_id",
            )
            .execute()
        )

        if result.data is None:

            raise RuntimeError(
                "Supabase provider risk import failed."
            )

    print()
    print("=" * 60)
    print("IMPORT COMPLETED")
    print("=" * 60)

    print(
        f"Imported: {total} provider risk records"
    )


if __name__ == "__main__":
    import_provider_risk()