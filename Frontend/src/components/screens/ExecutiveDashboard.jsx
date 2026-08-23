import React, { useEffect, useState } from 'react';

import SecurityRoundedIcon from '../SecurityRoundedIcon';

import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import { useReportData } from '../../context/ReportDataContext';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

import { supabase } from '../../lib/supabase';


/* ============================================================
   PROVIDER RISK COLORS
   ============================================================ */

const PROVIDER_RISK_COLORS = {
  Low: '#86EFAC',
  Medium: '#FDE68A',
  High: '#FCA5A5',
};


/* ============================================================
   CLAIM RISK COLORS
   IMPORTANT:
   These exactly match database values.
   ============================================================ */

const CLAIM_RISK_COLORS = {
  'Low Risk': '#86EFAC',
  'Medium Risk': '#FDE68A',
  'High Risk': '#FCA5A5',
  'Very High Risk': '#F87171',
};


/* ============================================================
   NUMBER FORMAT
   ============================================================ */

const formatIN = (value) => {
  return Number(value || 0).toLocaleString('en-IN');
};


/* ============================================================
   COMPACT NUMBER FORMAT
   ============================================================ */

const formatCompact = (value) => {
  const number = Number(value || 0);

  if (number >= 10000000) {
    return `${(number / 10000000).toFixed(2)} Cr`;
  }

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(2)} M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(0)} K`;
  }

  return number.toLocaleString('en-IN');
};


/* ============================================================
   CURRENCY FORMAT
   NO RUPEE / DOLLAR SYMBOL
   ============================================================ */

const formatCurrencyIN = (value) => {
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

  return number.toLocaleString('en-IN');
};


/* ============================================================
   MONTH FORMAT
   ============================================================ */

const formatMonth = (value) => {
  if (!value) return '';

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};


/* ============================================================
   EXECUTIVE DASHBOARD
   ============================================================ */

export const ExecutiveDashboard = ({
  onNavigateTo,
  onSearchProvider,
}) => {

  const { setDashboardSummary } = useReportData();
  /* ==========================================================
     SUMMARY STATE
     ========================================================== */

  const [summary, setSummary] = useState({
    total_claims: 0,
    high_risk_claims: 0,
    total_reimbursement: 0,
    average_fwa_risk: 0,
    open_investigations: 0,
  });


  /* ==========================================================
     CHART STATES
     ========================================================== */

  const [providerRiskData, setProviderRiskData] = useState([]);

  const [claimRiskData, setClaimRiskData] = useState([]);

  const [trendData, setTrendData] = useState([]);


  /* ==========================================================
     PAGE STATE
     ========================================================== */

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);


  /* ============================================================
     REIMBURSEMENT DOMAIN
     Used for fixed left Y-axis
     ============================================================ */

  const reimbursementMax =
    trendData.length > 0
      ? Math.max(
          ...trendData.map(
            (item) =>
              Number(
                item.total_reimbursement || 0
              )
          )
        )
      : 0;


  const reimbursementDomain = [
    0,
    reimbursementMax > 0
      ? reimbursementMax * 1.1
      : 1,
  ];


  /* ============================================================
     LOAD DASHBOARD DATA
     
     IMPORTANT:
     
     showLoader = true
       → only initial page load
     
     showLoader = false
       → realtime update
       → UI stays visible
       → NO loading screen
     ============================================================ */

  useEffect(() => {

    let cancelled = false;


    /* ==========================================================
       LOAD DASHBOARD
       ========================================================== */

    const loadDashboard = async (
      showLoader = false
    ) => {

      /* --------------------------------------------------------
         ONLY SHOW LOADING SCREEN ON INITIAL LOAD
         -------------------------------------------------------- */

      if (showLoader) {
        setLoading(true);
      }


      setError(null);


      try {

        /* ======================================================
           1. TOTAL CLAIMS
           SOURCE:
           v_dashboard_total_claims
           ====================================================== */

        const {
          data: totalClaims,
          error: totalClaimsError,
        } = await supabase
          .from('v_dashboard_total_claims')
          .select('total_claims')
          .single();


        if (totalClaimsError) {
          throw totalClaimsError;
        }


        /* ======================================================
           2. HIGH-RISK CLAIMS
           
           High Risk + Very High Risk
           
           SOURCE:
           v_dashboard_high_risk_claims
           ====================================================== */

        const {
          data: highRiskClaims,
          error: highRiskError,
        } = await supabase
          .from('v_dashboard_high_risk_claims')
          .select('high_risk_claims')
          .single();


        if (highRiskError) {
          throw highRiskError;
        }


        /* ======================================================
           3. TOTAL REIMBURSEMENT
           
           SOURCE:
           v_dashboard_total_reimbursement
           ====================================================== */

        const {
          data: reimbursement,
          error: reimbursementError,
        } = await supabase
          .from('v_dashboard_total_reimbursement')
          .select('total_reimbursement')
          .single();


        if (reimbursementError) {
          throw reimbursementError;
        }


        /* ======================================================
           4. AVERAGE FWA RISK
           
           SOURCE:
           v_dashboard_average_fwa_risk
           ====================================================== */

        const {
          data: fwaRisk,
          error: fwaRiskError,
        } = await supabase
          .from('v_dashboard_average_fwa_risk')
          .select('average_fwa_risk')
          .single();


        if (fwaRiskError) {
          throw fwaRiskError;
        }


        /* ======================================================
           5. OPEN INVESTIGATIONS
           
           SOURCE:
           v_dashboard_open_investigations
           ====================================================== */

        const {
          data: investigations,
          error: investigationsError,
        } = await supabase
          .from('v_dashboard_open_investigations')
          .select('open_investigations')
          .single();


        if (investigationsError) {
          throw investigationsError;
        }


        /* ======================================================
           6. PROVIDER FWA DISTRIBUTION
           
           SOURCE:
           v_dashboard_provider_risk
           ====================================================== */

        const {
          data: providerRisk,
          error: providerRiskError,
        } = await supabase
          .from('v_dashboard_provider_risk')
          .select(
            'risk_level, provider_count'
          );


        if (providerRiskError) {
          throw providerRiskError;
        }


        /* ======================================================
           7. CLAIM RISK DISTRIBUTION
           
           SOURCE:
           v_dashboard_claim_risk
           ====================================================== */

        const {
          data: claimRisk,
          error: claimRiskError,
        } = await supabase
          .from('v_dashboard_claim_risk')
          .select(
            'claim_risk_tier, claim_count'
          );


        if (claimRiskError) {
          throw claimRiskError;
        }


        /* ======================================================
           8. CLAIM TREND
           
           SOURCE:
           v_dashboard_claim_trend
           ====================================================== */

        const {
          data: claimTrend,
          error: claimTrendError,
        } = await supabase
          .from('v_dashboard_claim_trend')
          .select(
            'month, total_claim_count, total_reimbursement'
          )
          .order('month', {
            ascending: true,
          });


        if (claimTrendError) {
          throw claimTrendError;
        }


        /* ======================================================
           CANCEL IF COMPONENT UNMOUNTED
           ====================================================== */

        if (cancelled) {
          return;
        }


        /* ======================================================
           SUMMARY
           ====================================================== */

        setSummary({

          total_claims:
            Number(
              totalClaims?.total_claims || 0
            ),

          high_risk_claims:
            Number(
              highRiskClaims?.high_risk_claims || 0
            ),

          total_reimbursement:
            Number(
              reimbursement?.total_reimbursement || 0
            ),

          average_fwa_risk:
            Number(
              fwaRisk?.average_fwa_risk || 0
            ),

          open_investigations:
            Number(
              investigations?.open_investigations || 0
            ),

        });


        /* ======================================================
           PROVIDER RISK CHART
           ====================================================== */

        const providerOrder = [
          'Low',
          'Medium',
          'High',
        ];


        const providerChartData =
          providerOrder.map(
            (level) => {

              const row =
                (providerRisk || []).find(
                  (item) =>
                    item.risk_level === level
                );


              return {

                name: level,

                value:
                  Number(
                    row?.provider_count || 0
                  ),

                color:
                  PROVIDER_RISK_COLORS[level],

              };

            }
          );


        setProviderRiskData(
          providerChartData.filter(
            (item) =>
              item.value > 0
          )
        );


        /* ======================================================
           CLAIM RISK CHART
           ====================================================== */

        const claimOrder = [
          'Low Risk',
          'Medium Risk',
          'High Risk',
          'Very High Risk',
        ];


        const claimChartData =
          claimOrder.map(
            (tier) => {

              const row =
                (claimRisk || []).find(
                  (item) =>
                    item.claim_risk_tier === tier
                );


              return {

                name: tier,

                count:
                  Number(
                    row?.claim_count || 0
                  ),

                color:
                  CLAIM_RISK_COLORS[tier],

              };

            }
          );


        setClaimRiskData(
          claimChartData.filter(
            (item) =>
              item.count > 0
          )
        );


        /* ======================================================
           TREND
           ====================================================== */
        setTrendData(

          (claimTrend || []).map(
            (item) => ({

              month:
                item.month,

              total_claim_count:
                Number(
                  item.total_claim_count || 0
                ),

              total_reimbursement:
                Number(
                  item.total_reimbursement || 0
                ),

            })
          )

        );


        /* ======================================================
           NEW — SHARE WITH CHATBOT
           Flat field:value summary handed to ReportDataContext so
           ClaimGuard Vision can answer questions like "what's the
           total reimbursement" using real dashboard numbers.
           ====================================================== */

        setDashboardSummary({

          total_claims:
            Number(totalClaims?.total_claims || 0),

          high_risk_claims:
            Number(highRiskClaims?.high_risk_claims || 0),

          total_reimbursement:
            Number(reimbursement?.total_reimbursement || 0),

          average_fwa_risk:
            Number(fwaRisk?.average_fwa_risk || 0),

          open_investigations:
            Number(investigations?.open_investigations || 0),

          provider_risk_distribution:
            (providerRisk || []).map((r) => ({
              risk_level: r.risk_level,
              provider_count: r.provider_count,
            })),

          claim_risk_distribution:
            (claimRisk || []).map((r) => ({
              claim_risk_tier: r.claim_risk_tier,
              claim_count: r.claim_count,
            })),

          claim_trend:
            (claimTrend || []).map((t) => ({
              month: t.month,
              total_claim_count: t.total_claim_count,
              total_reimbursement: t.total_reimbursement,
            })),

        });



      } catch (err) {

        console.error(
          'Executive Dashboard Error:',
          err
        );


        if (!cancelled) {

          setError(
            err?.message ||
            'Unable to load executive dashboard data.'
          );

        }

      } finally {

        /* ======================================================
           IMPORTANT:
           
           Only initial load changes loading state.
           
           Realtime updates NEVER touch loading.
           ====================================================== */

        if (
          !cancelled &&
          showLoader
        ) {

          setLoading(false);

        }

      }

    };


    /* ==========================================================
       INITIAL DASHBOARD LOAD
       
       TRUE = show loading screen once
       ========================================================== */

    loadDashboard(true);


    /* ============================================================
       SUPABASE REALTIME
       
       IMPORTANT:
       
       Realtime updates call:
       
       loadDashboard(false)
       
       Therefore:
       
       NO LOADING SCREEN
       NO PAGE REFRESH
       UI remains visible
       ============================================================ */

    const channel = supabase
      .channel(
        'executive-dashboard-realtime-v2'
      )


      /* ========================================================
         PROVIDER CLAIMS
         ======================================================== */

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_claims',
        },
        (payload) => {

          console.log(
            '🔵 REALTIME provider_claims:',
            payload.eventType,
            payload
          );


          /*
           * IMPORTANT:
           * false = do NOT show loading screen
           */

          loadDashboard(false);

        }
      )


      /* ========================================================
         PROVIDER RISK
         ======================================================== */

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_risk',
        },
        (payload) => {

          console.log(
            '🟠 REALTIME provider_risk:',
            payload.eventType,
            payload
          );


          /*
           * IMPORTANT:
           * false = do NOT show loading screen
           */

          loadDashboard(false);

        }
      )


      /* ========================================================
         INVESTIGATIONS
         ======================================================== */

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investigations',
        },
        (payload) => {

          console.log(
            '🟢 REALTIME investigations:',
            payload.eventType,
            payload
          );


          /*
           * IMPORTANT:
           * false = do NOT show loading screen
           */

          loadDashboard(false);

        }
      )


      /* ========================================================
         SUBSCRIBE
         ======================================================== */

      .subscribe(
        (status, err) => {

          console.log(
            '🔥 EXECUTIVE DASHBOARD REALTIME STATUS:',
            status
          );


          if (err) {

            console.error(
              '❌ EXECUTIVE REALTIME ERROR:',
              err
            );

          }

        }
      );


    /* ==========================================================
       CLEANUP
       ========================================================== */

    return () => {

      cancelled = true;


      console.log(
        '🔴 Removing Executive Dashboard Realtime channel'
      );


      supabase.removeChannel(
        channel
      );

    };


  }, []);


  /* ============================================================
     LOADING
     
     ONLY INITIAL PAGE LOAD
     ============================================================ */

  if (loading) {

    return (

      <div className="p-8 min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">

        <div className="flex flex-col items-center gap-3">

          <div className="w-10 h-10 border-4 border-[#0284C7] border-t-transparent rounded-full animate-spin" />

          <span className="text-xs font-bold text-[#627D98] uppercase tracking-wider">

            Loading executive data...

          </span>

        </div>

      </div>

    );

  }


  /* ============================================================
     ERROR
     ============================================================ */

  if (error) {

    return (

      <div className="p-8 min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">

        <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md text-center">

          <WarningAmberRoundedIcon
            sx={{
              fontSize: 32,
              color: '#e11d48',
            }}
          />


          <h3 className="text-sm font-bold text-rose-600 mt-2">

            Failed to load dashboard

          </h3>


          <p className="text-xs text-[#627D98] mt-2">

            {error}

          </p>


          <button
            onClick={() =>
              window.location.reload()
            }
            className="mt-4 px-4 py-2 bg-[#0284C7] text-white rounded-lg text-xs font-bold"
          >

            Retry

          </button>

        </div>

      </div>

    );

  }


  /* ============================================================
     DASHBOARD UI
     ============================================================ */

  return (

    <div className="p-8 space-y-6 bg-[#EAF4FA] min-h-[calc(100vh-5rem)] text-[#0A2A4A]">


      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-[#0A2A4A] via-[#0369A1] to-[#0284C7] text-white p-6 rounded-2xl shadow-sm border border-[#C6E2F5]">

        <div className="space-y-1">

          <div className="flex items-center gap-2 text-cyan-200 font-bold text-xs uppercase tracking-wider">

            <SecurityRoundedIcon
              sx={{
                fontSize: 16,
                color: '#67e8f9',
              }}
            />

            Executive Intelligence Portal

          </div>


          <h1 className="text-2xl font-black tracking-tight text-white">

            ClaimGuard

            <span className="text-cyan-300">
              {' '}AI
            </span>

          </h1>


          <p className="text-sky-100/90 text-xs max-w-2xl">

            Real-time healthcare claims monitoring,
            hybrid provider ML risk prediction,
            claim anomaly scoring, and automated
            prevention workflow.

          </p>

        </div>


      </div>


      {/* ======================================================
          KPI CARDS
          ====================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">


        {/* ====================================================
            TOTAL CLAIMS
            ==================================================== */}

        <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between text-[#627D98] text-xs font-bold uppercase tracking-wider">

            <span>
              Total Claims
            </span>


            <DescriptionRoundedIcon
              sx={{
                fontSize: 17,
                color: '#0284C7',
              }}
            />

          </div>


          <div className="mt-2">

            <span className="text-xl font-bold text-[#0A2A4A]">

              {formatCompact(
                summary.total_claims
              )}

            </span>

          </div>

        </div>


        {/* ====================================================
            HIGH-RISK CLAIMS
            ==================================================== */}

        <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between text-[#627D98] text-xs font-bold uppercase tracking-wider">

            <span>
              High-Risk Claims
            </span>


            <WarningAmberRoundedIcon
              sx={{
                fontSize: 17,
                color: '#e11d48',
              }}
            />

          </div>


          <div className="mt-2">

            <span className="text-xl font-bold text-rose-600">

              {formatCompact(
                summary.high_risk_claims
              )}

            </span>


            <span className="block text-[10px] text-[#627D98] font-semibold mt-0.5">

              High + Very High

            </span>

          </div>

        </div>


        {/* ====================================================
            OPEN INVESTIGATIONS
            ==================================================== */}

        <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between text-[#627D98] text-xs font-bold uppercase tracking-wider">

            <span>
              Open Investigations
            </span>


            <SearchRoundedIcon
              sx={{
                fontSize: 17,
                color: '#0284C7',
              }}
            />

          </div>


          <div className="mt-2">

            <span className="text-xl font-bold text-[#0A2A4A]">

              {formatIN(
                summary.open_investigations
              )}

            </span>


            <span className="block text-[10px] text-[#627D98] font-semibold mt-0.5">

              Currently assigned

            </span>

          </div>

        </div>


        {/* ====================================================
            AVERAGE FWA RISK
            ==================================================== */}

        <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between text-[#627D98] text-xs font-bold uppercase tracking-wider">

            <span>
              Average FWA Risk
            </span>


            <WarningAmberRoundedIcon
              sx={{
                fontSize: 17,
                color: '#F59E0B',
              }}
            />

          </div>


          <div className="mt-2">

            <span className="text-xl font-bold text-[#0A2A4A]">

              {Number(
                summary.average_fwa_risk
              ).toFixed(2)}

            </span>


            <span className="block text-[10px] text-[#627D98] font-semibold mt-0.5">

              Provider FWA score

            </span>

          </div>

        </div>

      </div>


      {/* ======================================================
          TOTAL REIMBURSEMENT
          ====================================================== */}

      <div className="bg-gradient-to-tr from-[#0284C7] to-[#06B6D4] text-white p-6 rounded-2xl shadow-sm flex items-center justify-between">

        <div>

          <span className="text-[10px] font-bold text-sky-100 uppercase tracking-wider block">

            Financial Exposure

          </span>


          <h3 className="text-sm font-bold text-white mt-0.5">

            Total Reimbursement

          </h3>

        </div>


        <div className="flex items-center gap-2">

          <span className="text-3xl font-black">

            {formatCurrencyIN(
              summary.total_reimbursement
            )}

          </span>

        </div>

      </div>


      {/* ======================================================
          RISK DISTRIBUTION
          ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


        {/* ====================================================
            PROVIDER RISK
            ==================================================== */}

        <div className="bg-white p-6 rounded-2xl border border-[#D5E7F3] shadow-sm">

          <div>

            <span className="text-[10px] font-bold text-[#627D98] uppercase tracking-wider block">

              FWA Risk Model

            </span>


            <h3 className="text-sm font-bold text-[#0A2A4A] mt-0.5">

              Provider Risk Distribution

            </h3>

          </div>


          <div className="h-64 mt-4">

            {providerRiskData.length === 0 ? (

              <div className="h-full flex items-center justify-center text-xs text-[#627D98] font-semibold">

                No provider risk data available

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={providerRiskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >

                    {providerRiskData.map(
                      (entry, index) => (

                        <Cell
                          key={
                            `provider-cell-${index}`
                          }
                          fill={entry.color}
                        />

                      )
                    )}

                  </Pie>


                  <Tooltip
                    formatter={(value) =>
                      formatIN(value)
                    }
                  />


                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            )}

          </div>

        </div>


        {/* ====================================================
            CLAIM RISK
            ==================================================== */}

        <div className="bg-white p-6 rounded-2xl border border-[#D5E7F3] shadow-sm">

          <div>

            <span className="text-[10px] font-bold text-[#627D98] uppercase tracking-wider block">

              Claim Risk Model

            </span>


            <h3 className="text-sm font-bold text-[#0A2A4A] mt-0.5">

              Claim Risk Tier Distribution

            </h3>

          </div>


          <div className="h-64 mt-4">

            {claimRiskData.length === 0 ? (

              <div className="h-full flex items-center justify-center text-xs text-[#627D98] font-semibold">

                No claim risk data available

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={claimRiskData}
                  layout="vertical"
                  margin={{
                    left: 25,
                    right: 20,
                  }}
                >

                  <XAxis
                    type="number"
                    stroke="#627D98"
                    fontSize={12}
                    tickFormatter={
                      formatCompact
                    }
                  />


                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#627D98"
                    fontSize={11}
                    width={100}
                  />


                  <Tooltip
                    formatter={(value) =>
                      formatIN(value)
                    }
                  />


                  <Bar
                    dataKey="count"
                    radius={[
                      0,
                      6,
                      6,
                      0,
                    ]}
                  >

                    {claimRiskData.map(
                      (entry, index) => (

                        <Cell
                          key={
                            `claim-risk-cell-${index}`
                          }
                          fill={entry.color}
                        />

                      )
                    )}

                  </Bar>

                </BarChart>

              </ResponsiveContainer>

            )}

          </div>

        </div>

      </div>


      {/* ======================================================
          CLAIMS & REIMBURSEMENT TREND

          FIXED LEFT Y-AXIS
          HORIZONTALLY SCROLLABLE X-AXIS
          ====================================================== */}

      <div className="bg-white p-6 rounded-2xl border border-[#D5E7F3] shadow-sm">

        <div>

          <span className="text-[10px] font-bold text-[#627D98] uppercase tracking-wider block">

            Claims Analytics

          </span>


          <h3 className="text-sm font-bold text-[#0A2A4A] mt-0.5">

            Claims & Reimbursement Trend

          </h3>

        </div>


        <div className="mt-4">

          {trendData.length === 0 ? (

            <div className="h-72 flex items-center justify-center text-xs text-[#627D98] font-semibold">

              No trend data available

            </div>

          ) : (

            <div className="flex w-full h-80">


              {/* ==================================================
                  FIXED LEFT Y-AXIS
                  ================================================== */}

              <div
                className="flex-shrink-0 bg-white relative z-20"
                style={{
                  width: '100px',
                  overflow: 'visible',
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
                      right: 5,
                      left: 0,
                      bottom: 40,
                    }}
                  >

                    <Line
                      yAxisId="reimbursement"
                      type="monotone"
                      dataKey="total_reimbursement"
                      stroke="transparent"
                      dot={false}
                      activeDot={false}
                    />


                    <YAxis
                      yAxisId="reimbursement"
                      orientation="left"
                      stroke="#627D98"
                      fontSize={11}
                      width={90}
                      domain={
                        reimbursementDomain
                      }
                      tickFormatter={
                        formatCurrencyIN
                      }
                      tickCount={6}
                      axisLine={true}
                      tickLine={true}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>


              {/* ==================================================
                  SCROLLABLE CHART AREA
                  ================================================== */}

              <div
                className="flex-1 overflow-x-auto overflow-y-hidden"
                style={{
                  scrollbarWidth: 'thin',
                }}
              >

                <div
                  style={{
                    width: `${Math.max(
                      1200,
                      trendData.length * 120
                    )}px`,
                    height: '320px',
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
                        right: 20,
                        left: 0,
                        bottom: 40,
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />


                      {/* ==================================================
                          X AXIS
                          ================================================== */}

                      <XAxis
                        dataKey="month"
                        stroke="#627D98"
                        fontSize={11}
                        interval={0}
                        tickFormatter={
                          formatMonth
                        }
                        height={40}
                      />


                      {/* ==================================================
                          HIDDEN CLAIMS SCALE
                          ================================================== */}

                      <YAxis
                        yAxisId="claims"
                        hide
                        domain={[
                          'auto',
                          'auto',
                        ]}
                      />


                      {/* ==================================================
                          HIDDEN REIMBURSEMENT SCALE
                          SAME DOMAIN AS FIXED LEFT AXIS
                          ================================================== */}

                      <YAxis
                        yAxisId="reimbursement"
                        hide
                        domain={
                          reimbursementDomain
                        }
                      />


                      {/* ==================================================
                          TOOLTIP
                          ================================================== */}

                      <Tooltip
                        labelFormatter={
                          formatMonth
                        }
                        formatter={(
                          value,
                          name
                        ) => {

                          if (
                            name ===
                            'Reimbursement'
                          ) {

                            return [
                              formatCurrencyIN(
                                value
                              ),
                              'Reimbursement',
                            ];

                          }


                          return [
                            formatIN(value),
                            'Claims',
                          ];

                        }}
                      />


                      {/* ==================================================
                          LEGEND
                          ================================================== */}

                      <Legend />


                      {/* ==================================================
                          CLAIMS LINE
                          ================================================== */}

                      <Line
                        yAxisId="claims"
                        type="monotone"
                        dataKey="total_claim_count"
                        name="Claims"
                        stroke="#0284C7"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />


                      {/* ==================================================
                          REIMBURSEMENT LINE
                          ================================================== */}

                      <Line
                        yAxisId="reimbursement"
                        type="monotone"
                        dataKey="total_reimbursement"
                        name="Reimbursement"
                        stroke="#0A2A4A"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />

                    </LineChart>

                  </ResponsiveContainer>

                </div>

              </div>

            </div>

          )}

        </div>

      </div>


    </div>

  );
};


export default ExecutiveDashboard;