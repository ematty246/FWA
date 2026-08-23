"""
ClaimGuard AI
Investigation Service
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.services.supabase_service import (
    supabase_service,
)


class InvestigationService:

    SERVICE_NAME = "investigation_service"

    # ========================================================
    # FETCH ALL ROWS FROM SUPABASE
    # ========================================================

    def _fetch_all_rows(
        self,
        table_name: str,
        columns: str,
        batch_size: int = 1000,
    ) -> list[dict]:

        all_rows: list[dict] = []

        offset = 0

        while True:

            result = (
                supabase_service.client
                .table(table_name)
                .select(columns)
                .range(
                    offset,
                    offset + batch_size - 1,
                )
                .execute()
            )

            rows = result.data or []

            all_rows.extend(rows)

            print(
                f"{table_name}: "
                f"fetched {len(all_rows)} rows"
            )

            # =================================================
            # LAST BATCH
            # =================================================

            if len(rows) < batch_size:
                break

            offset += batch_size

        return all_rows

    # ========================================================
    # GET INVESTIGATION QUEUE
    # ========================================================

    def get_queue(self) -> dict:

        # ====================================================
        # FETCH ALL INVESTIGATIONS
        # ====================================================

        investigations = self._fetch_all_rows(
            table_name="investigations",
            columns="""
                investigation_id,
                provider_id,
                assigned_investigator_id,
                status,
                assigned_at
            """,
        )

        # ====================================================
        # FETCH ALL PROVIDER RISK DATA
        # ====================================================

        risk_records = self._fetch_all_rows(
            table_name="provider_risk",
            columns="""
                provider_id,
                overall_fwa_score,
                anomalous_claims,
                investigation_priority
            """,
        )

        # ====================================================
        # CREATE PROVIDER RISK LOOKUP
        # ====================================================

        risk_by_provider = {
            record["provider_id"]: record
            for record in risk_records
        }

        # ====================================================
        # FETCH INVESTIGATOR NAMES FOR ASSIGNED ROWS
        # ====================================================

        # Collect all distinct assigned_investigator_id that are not null
        assigned_ids = {
            inv["assigned_investigator_id"]
            for inv in investigations
            if inv.get("assigned_investigator_id")
        }

        investigator_lookup = {}
        if assigned_ids:
            inv_result = (
                supabase_service.client
                .table("investigators")
                .select("investigator_id, full_name")
                .in_("investigator_id", list(assigned_ids))
                .execute()
            )
            for record in (inv_result.data or []):
                investigator_lookup[record["investigator_id"]] = record["full_name"]

        # ====================================================
        # COMBINE INVESTIGATION + RISK + INVESTIGATOR NAME
        # ====================================================

        queue = []

        for investigation in investigations:

            provider_id = (
                investigation["provider_id"]
            )

            risk = (
                risk_by_provider.get(
                    provider_id
                )
                or {}
            )

            assigned_inv_id = investigation.get("assigned_investigator_id")
            assigned_name = None
            if assigned_inv_id:
                assigned_name = investigator_lookup.get(assigned_inv_id)

            queue.append({
                "investigation_id": investigation["investigation_id"],
                "provider_id": provider_id,
                "overall_fwa_score": risk.get("overall_fwa_score"),
                "anomalous_claims": risk.get("anomalous_claims"),
                "investigation_priority": risk.get("investigation_priority"),
                "status": investigation["status"],
                "assigned_investigator_id": assigned_inv_id,
                "assigned_investigator_name": assigned_name,
            })

        # ====================================================
        # SORTING
        #
        # PRIMARY:
        #     High
        #     Medium
        #     Low
        #
        # SECONDARY:
        #     Overall FWA Score HIGH → LOW
        # ====================================================

        priority_order = {
            "High": 3,
            "Medium": 2,
            "Low": 1,
        }

        queue.sort(
            key=lambda item: (
                priority_order.get(
                    item[
                        "investigation_priority"
                    ],
                    0,
                ),
                item[
                    "overall_fwa_score"
                ]
                if item[
                    "overall_fwa_score"
                ] is not None
                else 0,
            ),
            reverse=True,
        )

        # ====================================================
        # ADD RANK
        # ====================================================

        final_queue = []

        for index, item in enumerate(
            queue,
            start=1,
        ):

            final_queue.append({

                "rank": index,
                "investigation_id": item["investigation_id"],
                "provider_id": item["provider_id"],
                "overall_fwa_score": item["overall_fwa_score"],
                "anomalous_claims": item["anomalous_claims"],
                "investigation_priority": item["investigation_priority"],
                "status": item["status"],
                "assigned_investigator_id": item["assigned_investigator_id"],
                "assigned_investigator_name": item["assigned_investigator_name"],
            })

        # ====================================================
        # FINAL RESPONSE
        # ====================================================

        return {

            "total":
                len(final_queue),

            "investigations":
                final_queue,
        }
        # ========================================================
    # CREATE INVESTIGATION
    # ========================================================

    def create_investigation(
        self,
        provider_id: str,
    ) -> dict:

        provider_id = (
            provider_id
            .strip()
            .upper()
        )

        if not provider_id:

            raise ValueError(
                "Provider ID is required."
            )

        # ====================================================
        # CHECK PROVIDER
        # ====================================================

        provider_result = (
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

        if not provider_result.data:

            raise ValueError(
                "Provider not found."
            )

        # ====================================================
        # CHECK EXISTING UNASSIGNED INVESTIGATION
        # ====================================================

        existing_result = (
            supabase_service.client
            .table("investigations")
            .select(
                """
                investigation_id,
                provider_id,
                assigned_investigator_id,
                status,
                assigned_at,
                created_at
                """
            )
            .eq(
                "provider_id",
                provider_id,
            )
            .eq(
                "status",
                "UNASSIGNED",
            )
            .limit(1)
            .execute()
        )

        # ====================================================
        # REUSE EXISTING INVESTIGATION
        # ====================================================

        if existing_result.data:

            existing = existing_result.data[0]

            return {
                "message":
                    "Existing investigation "
                    "already available.",

                "investigation_id":
                    existing[
                        "investigation_id"
                    ],

                "provider_id":
                    existing[
                        "provider_id"
                    ],

                "status":
                    existing[
                        "status"
                    ],

                "created":
                    False,
            }

        # ====================================================
        # CREATE NEW INVESTIGATION
        # ====================================================

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

        if not result.data:

            raise RuntimeError(
                "Failed to create investigation."
            )

        investigation = result.data[0]

        # ====================================================
        # RESPONSE
        # ====================================================

        return {
            "message":
                "Investigation created successfully.",

            "investigation_id":
                investigation[
                    "investigation_id"
                ],

            "provider_id":
                investigation[
                    "provider_id"
                ],

            "status":
                investigation[
                    "status"
                ],

            "created":
                True,
        }

    # ========================================================
    # ASSIGN INVESTIGATION
    # ========================================================

    def assign_investigation(
        self,
        investigation_id: str,
        investigator_id: str,
    ) -> dict:

        # ====================================================
        # CHECK INVESTIGATION EXISTS
        # ====================================================

        result = (
            supabase_service.client
            .table("investigations")
            .select(
                """
                investigation_id,
                provider_id,
                assigned_investigator_id,
                status,
                assigned_at
                """
            )
            .eq(
                "investigation_id",
                investigation_id,
            )
            .limit(1)
            .execute()
        )

        if not result.data:

            raise ValueError(
                "Investigation not found."
            )

        investigation = result.data[0]

        # ====================================================
        # CHECK CURRENT STATUS
        # ====================================================

        if investigation["status"] != "UNASSIGNED":

            raise ValueError(
                "Investigation is already assigned."
            )

        # ====================================================
        # ASSIGN TO CURRENT INVESTIGATOR
        # ====================================================

        assigned_at = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        update_result = (
            supabase_service.client
            .table("investigations")
            .update(
                {
                    "assigned_investigator_id":
                        investigator_id,

                    "status":
                        "ASSIGNED",

                    "assigned_at":
                        assigned_at,

                    "updated_at":
                        assigned_at,
                }
            )
            .eq(
                "investigation_id",
                investigation_id,
            )
            .eq(
                "status",
                "UNASSIGNED",
            )
            .execute()
        )

        # ====================================================
        # VERIFY UPDATE
        # ====================================================

        if not update_result.data:

            raise ValueError(
                "Investigation could not be assigned. "
                "It may have already been assigned "
                "by another investigator."
            )

        updated = update_result.data[0]

        # ====================================================
        # RETURN
        # ====================================================

        return {

            "message":
                "Investigation assigned successfully.",

            "investigation_id":
                updated[
                    "investigation_id"
                ],

            "provider_id":
                updated[
                    "provider_id"
                ],

            "assigned_investigator_id":
                updated[
                    "assigned_investigator_id"
                ],

            "status":
                updated[
                    "status"
                ],

            "assigned_at":
                updated[
                    "assigned_at"
                ],
        }


# ============================================================
# SINGLETON
# ============================================================

investigation_service = (
    InvestigationService()
)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    "InvestigationService",
    "investigation_service",
]