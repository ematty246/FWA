import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * ReportDataContext
 * ------------------------------------------------------------------
 * Six independently-routed pages — Executive Dashboard, Investigation
 * Queue, Risk Profile, Peer Comparison, Investigation Report, and
 * Human Review — don't share state today. This context is a thin,
 * session-only accumulator each page writes into as the investigator
 * naturally uses the app. It powers two consumers:
 *
 *   1. Investigation Report (needs providerRisk + claim minimum)
 *   2. ChatbotWidget (reads the whole `report` object to ground its
 *      answers in real field names/values from whatever pages the
 *      investigator has actually opened this session)
 *
 * It does not trigger any extra network calls itself, and it does
 * not touch or wrap any existing API/service calls — pages call it
 * with data they already fetched, right after they fetch it.
 * ------------------------------------------------------------------
 */

const ReportDataContext = createContext(null);

const initialState = {
  investigation: null,      // { investigationId, providerId, priority, status, date }
  providerRisk: null,       // { overallFwaScore, riskTier, totalClaims, totalBeneficiaries, totalReimbursement, ... }
  claim: null,               // { claimId, claimType, reimbursement, riskScore, riskTier, anomalyScore }
  aiClaimAnalysis: null,    // string
  peerComparison: null,     // { peerGroup, metrics: [...] }
  aiPeerSummary: null,      // string
  dashboardSummary: null,   // Executive Dashboard KPIs + chart data (field:value, as fetched from Supabase views)
  investigationRecord: null, // Human Review — the currently selected investigation record + decision fields
  reportSaveInfo: null,     // Investigation Report — result of the last "Save Report" action
};

export const ReportDataProvider = ({ children }) => {
  const [report, setReport] = useState(initialState);

  // ---- Investigation Queue writes this when a case is assigned/opened ----
  const setInvestigationInfo = useCallback((investigation) => {
    setReport((prev) => ({ ...prev, investigation }));
  }, []);

  // ---- Risk Profile writes this once the profile loads ----
  const setProviderRisk = useCallback((providerRisk) => {
    setReport((prev) => ({ ...prev, providerRisk }));
  }, []);

  // ---- Risk Profile writes this when a specific claim is opened ----
  const setSelectedClaim = useCallback((claim) => {
    setReport((prev) => ({ ...prev, claim }));
  }, []);

  // ---- Risk Profile writes this once "Generate Summary" succeeds ----
  const setAiClaimAnalysis = useCallback((text) => {
    setReport((prev) => ({ ...prev, aiClaimAnalysis: text }));
  }, []);

  // ---- Peer Comparison writes this once the detailed table loads ----
  const setPeerComparison = useCallback((peerComparison) => {
    setReport((prev) => ({ ...prev, peerComparison }));
  }, []);

  // ---- Peer Comparison writes this once "Generate Summary" succeeds ----
  const setAiPeerSummary = useCallback((text) => {
    setReport((prev) => ({ ...prev, aiPeerSummary: text }));
  }, []);

  // ---- Executive Dashboard writes this once its Supabase queries resolve ----
  // Shape is intentionally loose (whatever the dashboard already computed:
  // summary KPIs, provider/claim risk distributions, trend data) since this
  // is read-only context for the chatbot, not validated/required anywhere.
  const setDashboardSummary = useCallback((dashboardSummary) => {
    setReport((prev) => ({ ...prev, dashboardSummary }));
  }, []);

  // ---- Human Review writes this when an investigator selects a record ----
  const setInvestigationRecord = useCallback((investigationRecord) => {
    setReport((prev) => ({ ...prev, investigationRecord }));
  }, []);

  // ---- Investigation Report writes this after a successful "Save Report" ----
  const setReportSaveInfo = useCallback((reportSaveInfo) => {
    setReport((prev) => ({ ...prev, reportSaveInfo }));
  }, []);

  const resetReport = useCallback(() => setReport(initialState), []);

  // Report is considered ready (for PDF generation) once we have at
  // minimum a provider risk profile and a selected claim — the pieces
  // the queue/profile flow always produces first. Peer comparison, AI
  // text, dashboard data, and record/save info are optional additions
  // that only affect what the chatbot can talk about, not PDF readiness.
  const isReportReady = useMemo(
    () => Boolean(report.providerRisk && report.claim),
    [report.providerRisk, report.claim]
  );

  const value = useMemo(
    () => ({
      report,
      setInvestigationInfo,
      setProviderRisk,
      setSelectedClaim,
      setAiClaimAnalysis,
      setPeerComparison,
      setAiPeerSummary,
      setDashboardSummary,
      setInvestigationRecord,
      setReportSaveInfo,
      resetReport,
      isReportReady,
    }),
    [
      report,
      setInvestigationInfo,
      setProviderRisk,
      setSelectedClaim,
      setAiClaimAnalysis,
      setPeerComparison,
      setAiPeerSummary,
      setDashboardSummary,
      setInvestigationRecord,
      setReportSaveInfo,
      resetReport,
      isReportReady,
    ]
  );

  return <ReportDataContext.Provider value={value}>{children}</ReportDataContext.Provider>;
};

export const useReportData = () => {
  const ctx = useContext(ReportDataContext);
  if (!ctx) {
    throw new Error('useReportData must be used within a ReportDataProvider');
  }
  return ctx;
};

export default ReportDataContext;