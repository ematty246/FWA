import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import SecurityRoundedIcon from "../SecurityRoundedIcon";

import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import LocalHospitalRoundedIcon from "@mui/icons-material/LocalHospitalRounded";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";

import { supabase } from "../../lib/supabase";

/* ============================================================
   COLORS
============================================================ */

const CLAIM_RISK_COLORS = {
  "Low Risk": "#2563EB",
  "Medium Risk": "#F59E0B",
  "High Risk": "#EF4444",
  "Very High Risk": "#B91C1C",
};

/* ============================================================
   NUMBER FORMATTERS
============================================================ */

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString("en-IN");
};

const formatDecimal = (value) => {
  return Number(value || 0).toFixed(2);
};

const formatCompact = (value) => {
  const number = Number(value || 0);

  if (number >= 10000000) {
    return `${(number / 10000000).toFixed(2)} Cr`;
  }

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(2)} M`;
  }

  if (number >= 100000) {
    return `${(number / 100000).toFixed(2)} L`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)} K`;
  }

  return number.toLocaleString("en-IN");
};

const formatMonth = (value) => {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

/* ============================================================
   KPI CARD
============================================================ */

const KpiCard = ({
  title,
  value,
  subtitle,
  icon,
  dark = false,
}) => {
  return (
    <div
      className={
        dark
          ? "bg-[#0A2A4A] p-5 rounded-xl shadow-sm text-white"
          : "bg-white p-5 rounded-xl border border-[#D5E7F3] shadow-sm"
      }
    >
      <div
        className={
          dark
            ? "flex items-center justify-between text-sky-100 text-xs font-bold uppercase tracking-wider"
            : "flex items-center justify-between text-[#627D98] text-xs font-bold uppercase tracking-wider"
        }
      >
        <span>{title}</span>

        {icon}
      </div>

      <div className="mt-3">
        <div
          className={
            dark
              ? "text-xl md:text-2xl font-black text-white leading-tight break-words"
              : "text-xl md:text-2xl font-black text-[#0A2A4A] leading-tight break-words"
          }
        >
          {value}
        </div>

        {subtitle && (
          <div
            className={
              dark
                ? "text-[10px] text-sky-100 mt-1"
                : "text-[10px] text-[#627D98] mt-1"
            }
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   PROVIDER ANALYTICS
============================================================ */

const ProviderAnalytics = () => {
  /* ==========================================================
     PROVIDERS
  ========================================================== */

  const [providers, setProviders] = useState([]);

  const [selectedProvider, setSelectedProvider] =
    useState("");

  /* ==========================================================
     CUSTOM PROVIDER DROPDOWN
  ========================================================== */

  const [providerDropdownOpen, setProviderDropdownOpen] =
    useState(false);

  /* ==========================================================
     PROVIDER SUMMARY
  ========================================================== */

  const [summary, setSummary] = useState(null);

  /* ==========================================================
     PROVIDER CLAIMS
  ========================================================== */

  const [claims, setClaims] = useState([]);

  /* ==========================================================
     INITIAL LOADING ONLY
  ========================================================== */

  const [loading, setLoading] = useState(true);

  /* ==========================================================
     ERROR
  ========================================================== */

  const [error, setError] = useState(null);

  /* ==========================================================
     REALTIME STATUS
  ========================================================== */

  const [realtimeStatus, setRealtimeStatus] =
    useState("CONNECTING");

  /* ==========================================================
     LOAD PROVIDERS
  ========================================================== */

 const SUPABASE_PAGE_SIZE = 1000;

const loadProviders = useCallback(async () => {
  console.log("Fetching ALL provider IDs from Supabase...");

  const allProviders = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;

    const {
      data,
      error: providerError,
    } = await supabase
      .from("providers")
      .select("provider_id")
      .order("provider_id", {
        ascending: true,
      })
      .range(from, to);

    if (providerError) {
      console.error(
        "PROVIDER FETCH ERROR:",
        providerError
      );

      throw providerError;
    }

    const page = (data || [])
      .filter(
        (row) =>
          row?.provider_id !== null &&
          row?.provider_id !== undefined
      )
      .map((row) => ({
        provider_id: String(row.provider_id),
      }));

    allProviders.push(...page);

    console.log(
      `Providers ${from}-${to}: ${page.length}`
    );

    if (
      page.length <
      SUPABASE_PAGE_SIZE
    ) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  const providerList = Array.from(
    new Map(
      allProviders.map((row) => [
        row.provider_id,
        row,
      ])
    ).values()
  );

  console.log(
    "TOTAL PROVIDERS:",
    providerList.length
  );

  setProviders(providerList);

  return providerList;
}, []);

  /* ==========================================================
     LOAD SUMMARY
  ========================================================== */

  const loadSummary = useCallback(
    async (providerId) => {
      if (!providerId) {
        return null;
      }

      const {
        data,
        error: summaryError,
      } = await supabase
        .from("provider_analytics_summary")
        .select("*")
        .eq("provider_id", providerId)
        .maybeSingle();

      if (summaryError) {
        throw summaryError;
      }

      return data;
    },
    []
  );

  /* ==========================================================
     LOAD CLAIMS
  ========================================================== */

 const loadClaims = useCallback(
  async (providerId) => {
    if (!providerId) {
      return [];
    }

    const allClaims = [];
    let from = 0;

    while (true) {
      const to =
        from + SUPABASE_PAGE_SIZE - 1;

      const {
        data,
        error: claimsError,
      } = await supabase
        .from("provider_analytics_claims")
        .select(`
          claim_id,
          provider_id,
          claim_type,
          claim_start_dt,
          total_claim_cost,
          claim_duration,
          beneficiary_age,
          claim_risk_tier,
          claim_anomaly_score,
          diagnosis_count,
          procedure_count,
          physician_count,
          claim_reimbursement
        `)
        .eq("provider_id", providerId)
        .order("claim_start_dt", {
          ascending: true,
        })
        .range(from, to);

      if (claimsError) {
        console.error(
          "CLAIMS FETCH ERROR:",
          claimsError
        );

        throw claimsError;
      }

      const page = data || [];

      allClaims.push(...page);

      console.log(
        `Claims ${providerId} ${from}-${to}:`,
        page.length
      );

      if (
        page.length <
        SUPABASE_PAGE_SIZE
      ) {
        break;
      }

      from += SUPABASE_PAGE_SIZE;
    }

    /*
     * Keep BOTH:
     * - Inpatient
     * - Outpatient
     */

    const inpatientCount =
      allClaims.filter(
        (claim) =>
          String(
            claim.claim_type || ""
          )
            .trim()
            .toLowerCase() ===
          "inpatient"
      ).length;

    const outpatientCount =
      allClaims.filter(
        (claim) =>
          String(
            claim.claim_type || ""
          )
            .trim()
            .toLowerCase() ===
          "outpatient"
      ).length;

    console.log(
      `[Claims] ${providerId}`,
      {
        total: allClaims.length,
        inpatient: inpatientCount,
        outpatient: outpatientCount,
      }
    );

    return allClaims;
  },
  []
);

  /* ==========================================================
     LOAD SELECTED PROVIDER
     
     IMPORTANT:
     NO setLoading(true) HERE.

     Changing provider therefore does NOT
     show the full page loading screen.
  ========================================================== */

  const loadProviderData = useCallback(
    async (providerId) => {
      if (!providerId) {
        return;
      }

      try {
        setError(null);

        const [
          summaryData,
          claimsData,
        ] = await Promise.all([
          loadSummary(providerId),
          loadClaims(providerId),
        ]);

        /*
         * Update both pieces of data together.
         */
        setSummary(summaryData);
        setClaims(claimsData);
      } catch (err) {
        console.error(
          "Provider Analytics update error:",
          err
        );

        setError(
          err?.message ||
            "Failed to update provider analytics."
        );
      }
    },
    [
      loadSummary,
      loadClaims,
    ]
  );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        const providerList =
          await loadProviders();

        if (cancelled) {
          return;
        }

        if (!providerList.length) {
          setLoading(false);
          return;
        }

        const firstProvider =
          providerList[0].provider_id;

        setSelectedProvider(
          firstProvider
        );

        const [
          summaryData,
          claimsData,
        ] = await Promise.all([
          loadSummary(firstProvider),
          loadClaims(firstProvider),
        ]);

        if (cancelled) {
          return;
        }

        setSummary(summaryData);
        setClaims(claimsData);
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Provider Analytics initialization error:",
            err
          );

          setError(
            err?.message ||
              "Failed to load provider analytics."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [
    loadProviders,
    loadSummary,
    loadClaims,
  ]);

  /* ==========================================================
     PROVIDER SELECTION
     
     NO FULL PAGE LOADER
  ========================================================== */

  const handleProviderSelect = async (
    providerId
  ) => {
    if (!providerId) {
      return;
    }

    /*
     * Close dropdown immediately.
     */
    setProviderDropdownOpen(false);

    /*
     * Change provider immediately.
     */
    setSelectedProvider(providerId);

    /*
     * Fetch provider-specific data.
     *
     * IMPORTANT:
     * This does NOT call setLoading(true).
     */
    await loadProviderData(providerId);
  };

  /* ==========================================================
     SUPABASE REALTIME
     
     LISTENS TO:
     
     provider_claims
     provider_risk
     provider_features
     provider_claim_summary
  ========================================================== */

  useEffect(() => {
    if (!selectedProvider) {
      return;
    }

    const channelName =
      `provider-analytics-${selectedProvider}`;

    console.log(
      "Creating realtime channel:",
      channelName
    );

    const channel =
      supabase
        .channel(channelName)

        /* ====================================================
           PROVIDER CLAIMS
        ==================================================== */

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "provider_claims",
            filter:
              `provider_id=eq.${selectedProvider}`,
          },
          async (payload) => {
            console.log(
              "Realtime provider_claims:",
              payload
            );

            await loadProviderData(
              selectedProvider
            );
          }
        )

        /* ====================================================
           PROVIDER RISK
        ==================================================== */

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "provider_risk",
            filter:
              `provider_id=eq.${selectedProvider}`,
          },
          async (payload) => {
            console.log(
              "Realtime provider_risk:",
              payload
            );

            await loadProviderData(
              selectedProvider
            );
          }
        )

        /* ====================================================
           PROVIDER FEATURES
        ==================================================== */

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "provider_features",
            filter:
              `provider_id=eq.${selectedProvider}`,
          },
          async (payload) => {
            console.log(
              "Realtime provider_features:",
              payload
            );

            await loadProviderData(
              selectedProvider
            );
          }
        )

        /* ====================================================
           PROVIDER CLAIM SUMMARY
        ==================================================== */

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "provider_claim_summary",
            filter:
              `provider_id=eq.${selectedProvider}`,
          },
          async (payload) => {
            console.log(
              "Realtime provider_claim_summary:",
              payload
            );

            await loadProviderData(
              selectedProvider
            );
          }
        )

        /* ====================================================
           SUBSCRIBE
        ==================================================== */

        .subscribe((status, err) => {
          console.log(
            "Provider Analytics Realtime:",
            status
          );

          setRealtimeStatus(status);

          if (err) {
            console.error(
              "Realtime error:",
              err
            );
          }
        });

    /* ========================================================
       CLEANUP
    ======================================================== */

    return () => {
      console.log(
        "Removing realtime channel:",
        channelName
      );

      supabase.removeChannel(
        channel
      );
    };
  }, [
    selectedProvider,
    loadProviderData,
  ]);

  /* ==========================================================
     LIVE CLAIM RISK COUNTS

     Calculate directly from provider_analytics_claims so the
     selected provider always reflects the actual claim-level
     records. This avoids stale/missing summary risk counts.
  ========================================================== */

  const liveRiskCounts = useMemo(() => {
    const counts = {
      low: 0,
      medium: 0,
      high: 0,
      veryHigh: 0,
    };

    claims.forEach((claim) => {
      const tier = String(
        claim.claim_risk_tier || ""
      )
        .trim()
        .toLowerCase();

      if (tier === "low risk" || tier === "low") {
        counts.low += 1;
      } else if (
        tier === "medium risk" ||
        tier === "medium"
      ) {
        counts.medium += 1;
      } else if (
        tier === "high risk" ||
        tier === "high"
      ) {
        counts.high += 1;
      } else if (
        tier === "very high risk" ||
        tier === "very high"
      ) {
        counts.veryHigh += 1;
      }
    });

    return counts;
  }, [claims]);
/* ==========================================================
   LIVE TOTAL CLAIM COST
   Calculate directly from selected provider claims
========================================================== */

const liveTotalClaimCost = useMemo(() => {
  return claims.reduce(
    (sum, claim) =>
      sum + Number(claim.total_claim_cost || 0),
    0
  );
}, [claims]);
  /* ==========================================================
     CLAIM RISK DISTRIBUTION
  ========================================================== */

  const riskDistribution = useMemo(() => {
    return [
      {
        name: "Low",
        count: liveRiskCounts.low,
        color:
          CLAIM_RISK_COLORS[
            "Low Risk"
          ],
      },
      {
        name: "Medium",
        count: liveRiskCounts.medium,
        color:
          CLAIM_RISK_COLORS[
            "Medium Risk"
          ],
      },
      {
        name: "High",
        count: liveRiskCounts.high,
        color:
          CLAIM_RISK_COLORS[
            "High Risk"
          ],
      },
      {
        name: "Very High",
        count: liveRiskCounts.veryHigh,
        color:
          CLAIM_RISK_COLORS[
            "Very High Risk"
          ],
      },
    ];
  }, [liveRiskCounts]);

  /* ==========================================================
     PROVIDER VS PEER REIMBURSEMENT
  ========================================================== */

  const reimbursementComparison =
    useMemo(() => {
      if (!summary) {
        return [];
      }

      return [
        {
          name: "Provider",
          value: Number(
            summary.average_claim_reimbursement ||
              summary.live_average_claim_reimbursement ||
              0
          ),
        },

        {
          name: "Peer Average",
          value: Number(
            summary.average_claim_reimbursement_peer_mean ||
              0
          ),
        },
      ];
    }, [summary]);

  /* ==========================================================
     CLAIMS & REIMBURSEMENT TREND
  ========================================================== */

  const trendData = useMemo(() => {
    const grouped = {};

    claims.forEach((claim) => {
      if (!claim.claim_start_dt) {
        return;
      }

      const month =
        `${claim.claim_start_dt.slice(0, 7)}-01`;

      if (!grouped[month]) {
        grouped[month] = {
          month,
          total_claim_count: 0,
          total_reimbursement: 0,
        };
      }

      grouped[month].total_claim_count += 1;

      grouped[month].total_reimbursement +=
        Number(
          claim.claim_reimbursement || 0
        );
    });

    return Object.values(grouped).sort(
      (a, b) =>
        new Date(a.month) -
        new Date(b.month)
    );
  }, [claims]);

  /* ==========================================================
     ANOMALY BY RISK
  ========================================================== */

  const anomalyData = useMemo(() => {
    const riskLevels = [
      {
        key: "low risk",
        name: "Low",
        color: CLAIM_RISK_COLORS[
          "Low Risk"
        ],
      },
      {
        key: "medium risk",
        name: "Medium",
        color: CLAIM_RISK_COLORS[
          "Medium Risk"
        ],
      },
      {
        key: "high risk",
        name: "High",
        color: CLAIM_RISK_COLORS[
          "High Risk"
        ],
      },
      {
        key: "very high risk",
        name: "Very High",
        color: CLAIM_RISK_COLORS[
          "Very High Risk"
        ],
      },
    ];

    return riskLevels.map((risk) => {
      const values = claims
        .filter((claim) => {
          const tier = String(
            claim.claim_risk_tier || ""
          )
            .trim()
            .toLowerCase();

          return tier === risk.key;
        })
        .map((claim) =>
          Number(
            claim.claim_anomaly_score
          )
        )
        .filter(Number.isFinite);

      const average = values.length
        ? values.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / values.length
        : 0;

      return {
        name: risk.name,
        average,
        color: risk.color,
      };
    });
  }, [claims]);

  /* ==========================================================
     INITIAL LOADING SCREEN ONLY
  ========================================================== */

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">

          <div className="w-10 h-10 border-4 border-[#0284C7] border-t-transparent rounded-full animate-spin" />

          <span className="text-xs font-bold text-[#627D98] uppercase tracking-wider">
            Loading provider analytics...
          </span>

        </div>
      </div>
    );
  }

  /* ==========================================================
     MAIN PAGE
  ========================================================== */

  return (
    <div className="p-8 space-y-6 bg-[#EAF4FA] min-h-[calc(100vh-5rem)] text-[#0A2A4A]">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-[#0A2A4A] via-[#0369A1] to-[#0284C7] text-white p-6 rounded-2xl shadow-sm border border-[#C6E2F5]">

        <div>

          <div className="flex items-center gap-2 text-cyan-200 font-bold text-xs uppercase tracking-wider">

            <SecurityRoundedIcon
              sx={{
                fontSize: 16,
                color: "#67e8f9",
              }}
            />

            Provider Intelligence Portal

          </div>

          <h1 className="text-2xl font-black tracking-tight mt-1">

            ClaimGuard
            <span className="text-cyan-300">
              {" "}AI
            </span>

          </h1>

          <p className="text-sky-100/90 text-xs mt-1">
            Real-time provider analytics,
            reimbursement comparison and
            FWA intelligence.
          </p>

        </div>

        {/* ====================================================
            REALTIME STATUS
        ==================================================== */}

        <div className="flex items-center gap-2">

          <span
            className={
              realtimeStatus === "SUBSCRIBED"
                ? "w-3 h-3 rounded-full bg-green-400"
                : "w-3 h-3 rounded-full bg-yellow-400 animate-pulse"
            }
          />

          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-100">

            {realtimeStatus ===
            "SUBSCRIBED"
              ? "Live"
              : realtimeStatus}

          </span>

        </div>

      </div>

      {/* ======================================================
          PROVIDER DROPDOWN
          
          COMPACT + SCROLLABLE
      ====================================================== */}

      <div className="bg-white p-4 rounded-2xl border border-[#D5E7F3] shadow-sm">

        <div className="flex items-center justify-between mb-2">
          <label className="block text-[10px] font-bold text-[#627D98] uppercase tracking-wider">
            provider_id
          </label>
          <span className="text-[10px] font-bold text-[#0284C7]">
            {providers.length.toLocaleString("en-IN")} providers
          </span>
        </div>

        <div className="relative w-full md:w-[350px]">

          {/* ==================================================
              SELECTED PROVIDER BUTTON
          ================================================== */}

          <button
            type="button"
            onClick={() =>
              setProviderDropdownOpen(
                (previous) =>
                  !previous
              )
            }
            className="
              w-full
              flex
              items-center
              justify-between
              px-4
              py-3
              rounded-xl
              border
              border-[#C6E2F5]
              bg-white
              text-sm
              font-semibold
              text-[#0A2A4A]
              hover:border-[#0284C7]
              focus:outline-none
              focus:ring-2
              focus:ring-[#0284C7]/20
              transition
            "
          >

            <span>
              {selectedProvider ||
                "Select Provider"}
            </span>

            <span
              className={`text-[#0284C7] transition-transform duration-200 ${
                providerDropdownOpen
                  ? "rotate-180"
                  : ""
              }`}
            >
              ▼
            </span>

          </button>

          {/* ==================================================
              SCROLLABLE PROVIDER LIST
          ================================================== */}

          {providerDropdownOpen && (

            <div
              className="
                absolute
                left-0
                right-0
                mt-2
                bg-white
                border
                border-[#D5E7F3]
                rounded-xl
                shadow-xl
                z-50
                overflow-hidden
              "
            >

              <div
                className="
                  max-h-[240px]
                  overflow-y-auto
                  overscroll-contain
                "
              >

                {providers.length === 0 ? (

                  <div className="px-4 py-3 text-xs text-[#627D98]">
                    No providers found.
                  </div>

                ) : (

                  providers.map(
                    (provider) => {

                      const isSelected =
                        provider.provider_id ===
                        selectedProvider;

                      return (
                        <button
                          key={
                            provider.provider_id
                          }
                          type="button"
                          onClick={() =>
                            handleProviderSelect(
                              provider.provider_id
                            )
                          }
                          className={`
                            w-full
                            text-left
                            px-4
                            py-3
                            text-sm
                            font-semibold
                            transition
                            ${
                              isSelected
                                ? "bg-[#E0F2FE] text-[#0369A1]"
                                : "text-[#0A2A4A] hover:bg-[#F1F5F9]"
                            }
                          `}
                        >

                          <div className="flex items-center justify-between">

                            <span>
                              {
                                provider.provider_id
                              }
                            </span>

                            {isSelected && (
                              <span className="text-[#0284C7] font-black">
                                ✓
                              </span>
                            )}

                          </div>

                        </button>
                      );
                    }
                  )

                )}

              </div>

            </div>

          )}

        </div>

      </div>

      {/* ======================================================
          PROVIDER INFORMATION
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <KpiCard
          title="Selected Provider"
          value={
            summary?.provider_id ||
            selectedProvider ||
            "—"
          }
          subtitle="Selected Provider"
          icon={
            <LocalHospitalRoundedIcon
              sx={{
                color: "#0284C7",
              }}
            />
          }
        />

        <KpiCard
          title="Selected Peer Group"
          value={
            summary?.peer_group ||
            "—"
          }
          subtitle="Selected Peer Group"
          icon={
            <GroupsRoundedIcon
              sx={{
                color: "#0284C7",
              }}
            />
          }
        />

        <KpiCard
          title="Selected FWA Risk"
          value={formatDecimal(
            summary?.overall_fwa_score
          )}
          subtitle={
            summary?.fwa_risk_level ||
            "FWA Risk"
          }
          icon={
            <WarningAmberRoundedIcon
              sx={{
                color: "#F59E0B",
              }}
            />
          }
        />

        <KpiCard
          title="Selected Fraud Risk"
          value={formatDecimal(
            summary?.fraud_risk_score
          )}
          subtitle="Selected Fraud Risk"
          icon={
            <WarningAmberRoundedIcon
              sx={{
                color: "#EF4444",
              }}
            />
          }
        />

        <KpiCard
          title="Selected Waste Risk"
          value={formatDecimal(
            summary?.waste_risk_score
          )}
          subtitle="Selected Waste Risk"
          icon={
            <TrendingUpRoundedIcon
              sx={{
                color: "#F59E0B",
              }}
            />
          }
        />

        <KpiCard
          title="Selected Abuse Risk"
          value={formatDecimal(
            summary?.abuse_risk_score
          )}
          subtitle="Selected Abuse Risk"
          icon={
            <WarningAmberRoundedIcon
              sx={{
                color: "#DC2626",
              }}
            />
          }
        />

      </div>

      {/* ======================================================
          CLAIM KPIs
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        <KpiCard
          title="Total Claims"
          value={formatNumber(
            claims.length
          )}
          subtitle="Selected Total Claims"
          dark
          icon={
            <DescriptionRoundedIcon
              sx={{
                color: "#67e8f9",
              }}
            />
          }
        />
<KpiCard
  title="High-Risk Claims"
  value={formatNumber(
    summary?.high_risk_claims
  )}
  subtitle="Selected High-Risk Claims"
  icon={
    <WarningAmberRoundedIcon
      sx={{
        color: "#EF4444",
      }}
    />
  }
/>

<KpiCard
  title="Very High-Risk Claims"
  value={formatNumber(
    summary?.very_high_risk_claims
  )}
  subtitle="Selected Very High-Risk Claims"
  icon={
    <WarningAmberRoundedIcon
      sx={{
        color: "#B91C1C",
      }}
    />
  }
/>
     <KpiCard
  title="Total Claim Cost"
  value={formatCompact(liveTotalClaimCost)}
  subtitle="Selected Total Claim Cost"
  dark
  
/>

      </div>

      {/* ======================================================
          CHART ROW
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ====================================================
            CLAIM RISK DISTRIBUTION
        ==================================================== */}

        <div className="bg-white p-6 rounded-2xl border border-[#D5E7F3] shadow-sm">

          <span className="text-[10px] font-bold text-[#627D98] uppercase tracking-wider">
            Claim Risk Model
          </span>

          <h3 className="text-sm font-bold text-[#0A2A4A] mt-1">
            Provider Claim Risk Distribution
          </h3>

          <p className="text-[10px] text-[#627D98]">
            Claims by risk level
          </p>

          <div className="h-64 mt-4">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={
                  riskDistribution
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  fontSize={11}
                />

                <YAxis
                  allowDecimals={false}
                  fontSize={11}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Claims"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                >

                  {riskDistribution.map(
                    (item, index) => (
                      <Cell
                        key={index}
                        fill={
                          item.color
                        }
                      />
                    )
                  )}

                </Bar>

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>

        {/* ====================================================
            PROVIDER VS PEER
        ==================================================== */}

        <div className="bg-white p-6 rounded-2xl border border-[#D5E7F3] shadow-sm">

          <span className="text-[10px] font-bold text-[#627D98] uppercase tracking-wider">
            Reimbursement Analytics
          </span>

          <h3 className="text-sm font-bold text-[#0A2A4A] mt-1">
            Provider vs Peer Average Reimbursement
          </h3>

          <p className="text-[10px] text-[#627D98]">
            Avg Reimbursement Comparison
          </p>

          <div className="h-64 mt-4">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={
                  reimbursementComparison
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  fontSize={11}
                />

                <YAxis
                  tickFormatter={
                    formatCompact
                  }
                  fontSize={11}
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  name="Average Reimbursement"
                  fill="#2563EB"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>

      {/* ======================================================
          CLAIMS & REIMBURSEMENT TREND
      ====================================================== */}

      <div className="bg-white p-6 rounded-2xl border border-[#D5E7F3] shadow-sm">

        <span className="text-[10px] font-bold text-[#627D98] uppercase tracking-wider">
          Claims Analytics
        </span>

        <h3 className="text-sm font-bold text-[#0A2A4A] mt-1">
          Claims & Reimbursement Trend
        </h3>

        <p className="text-[10px] text-[#627D98]">
          Selected provider over time
        </p>

        <div className="h-80 mt-4">

          <div
            className="w-full h-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
            style={{
              scrollbarWidth: "thin",
            }}
          >

            <div
              style={{
                width: `${Math.max(
                  900,
                  trendData.length * 110
                )}px`,
                height: "100%",
              }}
            >

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={trendData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 10,
                    bottom: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    interval={0}
                    tickFormatter={
                      formatMonth
                    }
                    fontSize={10}
                    tickLine={false}
                    height={45}
                  />

                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    width={60}
                  />

                  <Tooltip
                    labelFormatter={
                      formatMonth
                    }
                    formatter={(value, name) => [
                      name === "Reimbursement"
                        ? formatCompact(value)
                        : formatNumber(value),
                      name,
                    ]}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="total_claim_count"
                    name="Claims"
                    stroke="#0284C7"
                    strokeWidth={3}
                    dot={{
                      r: 3,
                    }}
                    activeDot={{
                      r: 5,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="total_reimbursement"
                    name="Reimbursement"
                    stroke="#0A2A4A"
                    strokeWidth={3}
                    dot={{
                      r: 3,
                    }}
                    activeDot={{
                      r: 5,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>

      </div>

{/* ======================================================
    ANOMALY SCORE
====================================================== */}

<div className="bg-white p-6 rounded-2xl border border-[#D5E7F3] shadow-sm">

  <span className="text-[10px] font-bold text-[#627D98] uppercase tracking-wider">
    Anomaly Analytics
  </span>

  <h3 className="text-sm font-bold text-[#0A2A4A] mt-1">
    Average Claim Anomaly Score by Risk Tier
  </h3>

  <p className="text-[10px] text-[#627D98]">
    Average Claim Anomaly Score by claim_risk_tier
  </p>

  <div className="h-72 mt-4">

    <ResponsiveContainer width="100%" height="100%">

      <BarChart
        data={anomalyData.map((item) => ({
          ...item,

          // Used only for drawing the bar.
          // Keeps negative anomaly scores visible upward.
          plotValue: Math.abs(Number(item.average || 0)),
        }))}
        margin={{
          top: 15,
          right: 20,
          left: 10,
          bottom: 10,
        }}
        barCategoryGap="18%"
      >

        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
        />

        <XAxis
          dataKey="name"
          fontSize={11}
          tickLine={false}
          axisLine={{
            stroke: "#94A3B8",
            strokeWidth: 1,
          }}
          tickMargin={8}
          interval={0}
        />

        <YAxis
          fontSize={10}
          tickLine={false}
          axisLine={{
            stroke: "#94A3B8",
            strokeWidth: 1,
          }}
          width={55}
          domain={[0, "auto"]}
          tickFormatter={(value) =>
            Number(value).toFixed(2)
          }
        />

        <Tooltip
          cursor={{ fill: "rgba(2,132,199,0.05)" }}
          formatter={(value, name, props) => {
            const originalValue =
              props?.payload?.average ?? 0;

            return [
              Number(originalValue).toFixed(4),
              "Average Anomaly",
            ];
          }}
          labelFormatter={(label) =>
            `${label} Risk`
          }
        />

        <Bar
          dataKey="plotValue"
          name="Average Anomaly"
          radius={[5, 5, 0, 0]}
          maxBarSize={90}
        >

          {anomalyData.map((item, index) => (
            <Cell
              key={index}
              fill={item.color}
            />
          ))}

        </Bar>

      </BarChart>

    </ResponsiveContainer>

  </div>

</div>

      {/* ======================================================
          BENEFICIARY METRICS
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <KpiCard
          title="Total Beneficiaries"
          value={formatNumber(
            summary?.total_beneficiaries
          )}
          subtitle="Selected provider"
          icon={
            <GroupsRoundedIcon
              sx={{
                color: "#0284C7",
              }}
            />
          }
        />

        <KpiCard
          title="Claims per Beneficiary"
          value={formatDecimal(
            summary?.claims_per_beneficiary
          )}
          subtitle="Selected provider"
          icon={
            <DescriptionRoundedIcon
              sx={{
                color: "#0284C7",
              }}
            />
          }
        />

        <KpiCard
          title="Reimbursement per Beneficiary"
          value={formatCompact(
            summary?.reimbursement_per_beneficiary
          )}
          subtitle="Selected provider"
          icon={
            <TrendingUpRoundedIcon
              sx={{
                color: "#0284C7",
              }}
            />
          }
        />

      </div>

      {/* ======================================================
          NON-BLOCKING ERROR
      ====================================================== */}

      {error && summary && (
        <div className="fixed bottom-5 right-5 bg-white border border-amber-200 rounded-xl shadow-lg px-4 py-3 z-50">

          <div className="flex items-center gap-2">

            <WarningAmberRoundedIcon
              sx={{
                color: "#F59E0B",
                fontSize: 18,
              }}
            />

            <span className="text-xs text-[#627D98]">
              {error}
            </span>

          </div>

        </div>
      )}

    </div>
  );
};

export default ProviderAnalytics;