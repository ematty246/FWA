
import { useParams, useNavigate } from 'react-router-dom';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LocationOnIcon from '@mui/icons-material/LocationOnRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { getProviderRiskProfile, getProviderClaims, getClaimDetails } from '../../services/riskProfileService';
import React, { useEffect, useState, useMemo } from 'react';
import { useReportData } from '../../context/ReportDataContext';

const RISK_TIERS = ['All', 'Very High Risk', 'High Risk', 'Medium Risk', 'Low Risk'];

const RiskProfileView = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const {
    setProviderRisk,
    setSelectedClaim,
    setAiClaimAnalysis,
  } = useReportData();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showHistoricalClaims, setShowHistoricalClaims] = useState(false);
  const [historicalClaims, setHistoricalClaims] = useState(null);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState('All');
  const pageSize = 10;

  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [claimDetails, setClaimDetails] = useState(null);
  const [claimDetailsLoading, setClaimDetailsLoading] = useState(false);
  const [claimDetailsError, setClaimDetailsError] = useState(null);
  const [showClaimDetails, setShowClaimDetails] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!providerId) {
      setError('No provider ID provided.');
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
      const data = await getProviderRiskProfile(providerId);

setProfile(data);

setProviderRisk({
  overallFwaScore:
    data.overall_fwa_score ??
    data.overallFwaScore ??
    null,

  veryHighRiskClaims:
    data.very_high_risk_claims ?? 0,

  highRiskClaims:
    data.high_risk_claims ?? 0,

  mediumRiskClaims:
    data.medium_risk_claims ?? 0,

  lowRiskClaims:
    data.low_risk_claims ?? 0,

  totalClaims:
    data.total_claims ??
    data.totalClaims ??
    null,

  totalBeneficiaries:
    data.total_beneficiaries ??
    data.totalBeneficiaries ??
    null,

  totalReimbursement:
    data.total_reimbursement ??
    data.totalReimbursement ??
    data.average_claim_reimbursement ??
    null,
});
      } catch (err) {
        setError(err?.response?.data?.detail?.message || 'Failed to load risk profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [providerId]);

 const fetchHistoricalClaims = async () => {
  if (historicalClaims) return;

  setClaimsLoading(true);
  setClaimsError(null);

  try {
    const data = await getProviderClaims(providerId);

    console.log(
      'PROVIDER CLAIMS RESPONSE:',
      JSON.stringify(data, null, 2)
    );

    const normalizedData = {
      ...data,

      claims: (data.claims || []).map((claim) => ({
        ...claim,

        claim_start_date:
          claim.claim_start_date ??
          claim.claim_start_dt ??
          null,

        claim_risk_tier:
          claim.claim_risk_tier ??
          claim.status ??
          null,

        status:
          claim.claim_risk_tier ??
          claim.status ??
          null,
      })),
    };

    console.log(
      'NORMALIZED CLAIMS:',
      JSON.stringify(normalizedData, null, 2)
    );

    setHistoricalClaims(normalizedData);

  } catch (err) {

    setClaimsError(
      err?.response?.data?.detail?.message ||
      'Failed to load historical claims.'
    );

  } finally {

    setClaimsLoading(false);
  }
};

  const toggleHistoricalClaims = () => {
    if (!showHistoricalClaims) {
      fetchHistoricalClaims();
      setShowClaimDetails(false);
      setSelectedClaimId(null);
      setClaimDetails(null);
      setSummary(null);
    }
    setShowHistoricalClaims(!showHistoricalClaims);
    setCurrentPage(1);
  };

  const handleClaimClick = async (claimId) => {
    if (selectedClaimId === claimId && showClaimDetails) {
      setShowClaimDetails(false);
      setSelectedClaimId(null);
      setClaimDetails(null);
      setSummary(null);
      return;
    }

    setSelectedClaimId(claimId);
    setClaimDetailsLoading(true);
    setClaimDetailsError(null);
    setShowClaimDetails(true);
    setSummary(null);

    try {
    const data = await getClaimDetails(providerId, claimId);

setClaimDetails(data);

setSelectedClaim({
  claimId:
    data.claim_id ??
    data.claimId ??
    claimId,

  claimType:
    data.claim_type ??
    data.claimType ??
    null,

  reimbursement:
    data.total_claim_cost ??
    data.reimbursement ??
    data.claim_reimbursement ??
    null,

  riskScore:
    data.claim_risk_score ??
    data.risk_score ??
    data.claim_anomaly_score ??
    null,

  riskTier:
    data.claim_risk_tier ??
    data.risk_tier ??
    data.status ??
    null,

  anomalyScore:
    data.claim_anomaly_score ??
    data.anomaly_score ??
    null,
});
    } catch (err) {
      setClaimDetailsError(err?.response?.data?.detail?.message || 'Failed to load claim details.');
    } finally {
      setClaimDetailsLoading(false);
    }
  };

  const closeClaimDetails = () => {
    setShowClaimDetails(false);
    setSelectedClaimId(null);
    setClaimDetails(null);
    setSummary(null);
  };

  const generateSummary = async () => {
    if (!claimDetails) return;
    setGeneratingSummary(true);
    setSummary(null);

    try {
      const { claim_id, claim_anomaly_score, comparisons, top_unusual_factors } = claimDetails;

      let prompt = `You are a healthcare fraud analyst. Generate a concise, professional summary for the following claim:\n\n`;
      prompt += `Claim ID: ${claim_id}\n`;
      prompt += `Anomaly Score: ${claim_anomaly_score?.toFixed(2) ?? 'N/A'}\n\n`;
      prompt += `Comparison to Provider Median (where 1.0 = typical):\n`;
      const labels = {
        diagnosis_count: 'Diagnosis Count',
        procedure_count: 'Procedure Count',
        physician_count: 'Physician Count',
        total_claim_cost: 'Total Claim Cost',
        claim_duration: 'Claim Duration',
      };
      for (const [field, comp] of Object.entries(comparisons || {})) {
        prompt += `- ${labels[field] || field}: Claim = ${comp.claim_value ?? 'N/A'}, Median = ${comp.provider_median ?? 'N/A'}, Ratio = ${comp.ratio ?? 'N/A'}, Comparison = ${comp.comparison || 'N/A'}\n`;
      }

      if (top_unusual_factors && top_unusual_factors.length > 0) {
        prompt += `\nTop Unusual Factors (highest unusualness):\n`;
        top_unusual_factors.forEach((f, i) => {
          prompt += `${i+1}. ${f.feature}: Claim = ${f.claim_value}, Median = ${f.provider_median}, Ratio = ${f.ratio}, Unusualness = ${f.unusualness}\n`;
        });
      }

      prompt += `\nProvide a brief summary in bullet points (use dashes) highlighting any significant deviations from typical provider behavior and any potential fraud indicators. Keep it concise, 3-5 bullet points. Do not use bold markers or any markdown formatting.`;

      const response = await puter.ai.chat(prompt, {
        model: 'gpt-5.6-luna',
      });
const generatedSummary =
  response.message?.content ||
  response ||
  'No summary generated.';

setSummary(generatedSummary);
setAiClaimAnalysis(generatedSummary);
    } catch (err) {
      console.error('AI summarization error:', err);
      setSummary('Failed to generate summary. Please try again.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const highlightKeywords = (text) => {
    const keywords = [
      'fraud', 'risk', 'high', 'low', 'medium', 'deviation',
      'anomaly', 'typical', 'unusual', 'significant', 'elevated',
      'normal', 'abnormal', 'alert', 'concern', 'warning',
      'higher', 'lower', 'median', 'ratio', 'unusualness',
      'suspicious', 'attention', 'review', 'investigate'
    ];
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      const clean = word.replace(/[.,!?;:()"']/g, '');
      if (keywords.includes(clean.toLowerCase())) {
        return <span key={i} className="font-bold text-[#0284C7]">{word}</span>;
      }
      return <span key={i}>{word}</span>;
    });
  };

  const filteredClaims = useMemo(() => {
    if (!historicalClaims?.claims) return [];
    if (riskFilter === 'All') return historicalClaims.claims;
    return historicalClaims.claims.filter(
      (claim) => claim.status === riskFilter
    );
  }, [historicalClaims, riskFilter]);

  const totalFiltered = filteredClaims.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredClaims.slice(start, end);
  }, [filteredClaims, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [riskFilter]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="p-8 min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0284C7] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#627D98] uppercase tracking-wider">
            Loading risk profile...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl border border-rose-200 max-w-md text-center">
          <WarningAmberRoundedIcon sx={{ fontSize: 28, color: '#e11d48' }} className="mx-auto" />
          <h3 className="text-sm font-bold text-rose-600 mt-2">Failed to load risk profile</h3>
          <p className="text-xs text-[#627D98]">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl border border-[#D5E7F3] max-w-md text-center">
          <p className="text-sm text-[#627D98]">No data found for this provider.</p>
        </div>
      </div>
    );
  }

  const location = profile.location || {};
  const hasLocation = location.latitude != null && location.longitude != null;
  const mapsUrl =
    location.google_maps_url ||
    (hasLocation
      ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
      : null);

  const hasName = !!profile.provider_name;
  const nameMissing = !hasName;
  const locationMissing = !hasLocation;
  const bothMissing = nameMissing && locationMissing;

  const riskProfileWrapperClass = (showHistoricalClaims || showClaimDetails)
    ? 'grid transition-all duration-500 ease-in-out grid-rows-[0fr] opacity-0 -translate-y-4 pointer-events-none'
    : 'grid transition-all duration-500 ease-in-out grid-rows-[1fr] opacity-100 translate-y-0';

  const historicalClaimsWrapperClass = (showHistoricalClaims && !showClaimDetails)
    ? 'grid transition-all duration-500 ease-in-out grid-rows-[1fr] opacity-100'
    : 'grid transition-all duration-500 ease-in-out grid-rows-[0fr] opacity-0';

  const claimDetailsWrapperClass = showClaimDetails
    ? 'grid transition-all duration-500 ease-in-out grid-rows-[1fr] opacity-100'
    : 'grid transition-all duration-500 ease-in-out grid-rows-[0fr] opacity-0';

  return (
    <div className="p-8 space-y-6 bg-[#EAF4FA] min-h-[calc(100vh-5rem)] text-[#0A2A4A]">
      {/* ===== RISK PROFILE SECTION ===== */}
      <div className={riskProfileWrapperClass}>
        <div className="overflow-hidden">
          <div className="space-y-6 pb-1">
            <div className="bg-gradient-to-r from-[#0A2A4A] via-[#0369A1] to-[#0284C7] text-white p-6 rounded-2xl shadow-xs border border-[#C6E2F5]">
              <h1 className="text-2xl font-black tracking-tight">
                Risk Profile: {profile.provider_id}
              </h1>
              {hasName && <p className="text-sky-100/90 text-sm mt-1">{profile.provider_name}</p>}
              {bothMissing && (
                <p className="text-sky-100/80 text-sm mt-1 font-medium bg-sky-800/20 inline-block px-3 py-1 rounded-full">
                  Historical data is enriched during registration.
                </p>
              )}
              {nameMissing && !bothMissing && (
                <p className="text-sky-100/60 text-sm mt-1 italic">Name not provided</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Provider Info */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#D5E7F3]">
                <h2 className="text-sm font-bold text-[#627D98] uppercase tracking-wider mb-4">Provider Information</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-[#EAF4FA] pb-2">
                    <span className="font-semibold text-[#627D98]">Provider ID</span>
                    <span className="font-mono font-bold">{profile.provider_id}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#EAF4FA] pb-2">
                    <span className="font-semibold text-[#627D98]">Name</span>
                    <span className="font-medium">{profile.provider_name || 'N/A'}</span>
                  </div>

                  <div className="mt-3">
                    <span className="font-semibold text-[#627D98] block mb-2">Location</span>
                    {hasLocation ? (
                      <div className="space-y-2">
                        <div className="w-full aspect-[4/3] max-h-[180px] rounded-xl overflow-hidden border border-[#D5E7F3] bg-[#F4F9FD]">
                          <iframe
                            title={`${profile.provider_id} location map`}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`}
                          />
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs text-[#627D98] font-mono truncate max-w-[60%]">
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </span>
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#0284C7] font-medium hover:underline flex items-center gap-1 whitespace-nowrap"
                            >
                              <LocationOnIcon sx={{ fontSize: 14 }} />
                              Open in Maps
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#F8FAFC] border border-[#D5E7F3] rounded-xl p-4 text-center">
                        <p className="text-xs text-[#627D98]">
                          {bothMissing
                            ? 'Historical data is enriched during registration.'
                            : 'No location data available'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Risk Scores */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#D5E7F3]">
                <h2 className="text-sm font-bold text-[#627D98] uppercase tracking-wider mb-4">FWA Risk Scores</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-[#EAF4FA] pb-2">
                    <span className="font-semibold text-[#627D98]">Overall FWA Score</span>
                    <span
                      className={`font-bold ${
                        profile.overall_fwa_score >= 0.7
                          ? 'text-rose-600'
                          : profile.overall_fwa_score >= 0.4
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {profile.overall_fwa_score != null ? profile.overall_fwa_score.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#EAF4FA] pb-2">
                    <span className="font-semibold text-[#627D98]">Fraud Risk</span>
                    <span className="font-bold text-rose-600">
                      {profile.fraud_risk_score != null ? profile.fraud_risk_score.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#EAF4FA] pb-2">
                    <span className="font-semibold text-[#627D98]">Waste Risk</span>
                    <span className="font-bold text-amber-600">
                      {profile.waste_risk_score != null ? profile.waste_risk_score.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#627D98]">Abuse Risk</span>
                    <span className="font-bold text-purple-600">
                      {profile.abuse_risk_score != null ? profile.abuse_risk_score.toFixed(2) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Claims Summary */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#D5E7F3] col-span-1 md:col-span-2">
                <h2 className="text-sm font-bold text-[#627D98] uppercase tracking-wider mb-4">Claims Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#F4F9FD] p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-[#0A2A4A]">{profile.total_claims}</p>
                    <p className="text-xs text-[#627D98]">Total Claims</p>
                  </div>
                  <div className="bg-[#F4F9FD] p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-[#0A2A4A]">{profile.total_beneficiaries}</p>
                    <p className="text-xs text-[#627D98]">Beneficiaries</p>
                  </div>
                  <div className="bg-[#F4F9FD] p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-[#0A2A4A]">
                      ₹{profile.average_claim_reimbursement?.toFixed(2) ?? '—'}
                    </p>
                    <p className="text-xs text-[#627D98]">Avg Reimbursement</p>
                  </div>
                  <div className="bg-[#F4F9FD] p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-[#0A2A4A]">
                      {profile.very_high_risk_claims +
                        profile.high_risk_claims +
                        profile.medium_risk_claims +
                        profile.low_risk_claims}
                    </p>
                    <p className="text-xs text-[#627D98]">Total Assessed</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-bold text-[#627D98] uppercase tracking-wider mb-3">Risk Distribution</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-rose-100 p-3 rounded-lg text-center">
                      <p className="text-lg font-bold text-rose-700">{profile.very_high_risk_claims}</p>
                      <p className="text-[10px] text-rose-600">Very High</p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg text-center">
                      <p className="text-lg font-bold text-orange-700">{profile.high_risk_claims}</p>
                      <p className="text-[10px] text-orange-600">High</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-lg text-center">
                      <p className="text-lg font-bold text-amber-700">{profile.medium_risk_claims}</p>
                      <p className="text-[10px] text-amber-600">Medium</p>
                    </div>
                    <div className="bg-emerald-100 p-3 rounded-lg text-center">
                      <p className="text-lg font-bold text-emerald-700">{profile.low_risk_claims}</p>
                      <p className="text-[10px] text-emerald-600">Low</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HISTORICAL CLAIMS SECTION ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#D5E7F3] overflow-hidden">
        <button
          onClick={toggleHistoricalClaims}
          className="w-full px-6 py-4 flex items-center justify-between bg-[#F4F9FD] hover:bg-[#EAF4FA] transition-colors"
        >
          <span className="text-sm font-bold text-[#0A2A4A]">Historical Claims</span>
          <span className="flex items-center gap-2 text-xs text-[#627D98]">
            {showHistoricalClaims ? 'Hide' : 'View'}
            {showHistoricalClaims ? (
              <ExpandLessRoundedIcon sx={{ fontSize: 18 }} />
            ) : (
              <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />
            )}
          </span>
        </button>

        <div className={historicalClaimsWrapperClass}>
          <div className="overflow-hidden">
            <div className="p-6 space-y-4">
              {claimsLoading && (
                <div className="text-center py-4 text-xs text-[#627D98]">Loading historical claims...</div>
              )}
              {claimsError && (
                <div className="text-center py-4 text-xs text-rose-600">{claimsError}</div>
              )}
              {historicalClaims && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs font-medium text-[#627D98]">
                      Showing{' '}
                      <span className="font-bold text-[#0A2A4A]">
                        {riskFilter === 'All' ? 'All' : riskFilter}
                      </span> claims
                      <span className="ml-2 text-[#627D98]">
                        ({totalFiltered} {totalFiltered === 1 ? 'claim' : 'claims'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="riskFilter" className="text-xs font-medium text-[#627D98]">
                        Filter:
                      </label>
                      <select
                        id="riskFilter"
                        value={riskFilter}
                        onChange={(e) => setRiskFilter(e.target.value)}
                        className="text-xs border border-[#D5E7F3] rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] outline-none"
                      >
                        {RISK_TIERS.map((tier) => (
                          <option key={tier} value={tier}>
                            {tier}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {paginatedClaims.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#D5E7F3]">
                        <thead className="bg-[#F4F9FD]">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Claim ID</th>
                            <th className="px-4 py-2 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Cost</th>
                            <th className="px-4 py-2 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Duration</th>
                            <th className="px-4 py-2 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Age</th>
                            <th className="px-4 py-2 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAF4FA]">
                          {paginatedClaims.map((claim) => {
                            let statusColor = '';
                            if (claim.status === 'Very High Risk') statusColor = 'bg-rose-100 text-rose-700 border-rose-200';
                            else if (claim.status === 'High Risk') statusColor = 'bg-orange-100 text-orange-700 border-orange-200';
                            else if (claim.status === 'Medium Risk') statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
                            else if (claim.status === 'Low Risk') statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                            else statusColor = 'bg-gray-100 text-gray-700 border-gray-200';

                            return (
                              <tr key={claim.claim_id} className="hover:bg-[#F4F9FD]">
                                <td className="px-4 py-2 text-sm font-mono">
                                  <button
                                    onClick={() => handleClaimClick(claim.claim_id)}
                                    className="text-[#0284C7] hover:underline font-bold cursor-pointer"
                                  >
                                    {claim.claim_id}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-sm text-[#0A2A4A]">{claim.claim_type || '—'}</td>
                                <td className="px-4 py-2 text-sm text-[#0A2A4A]">{claim.claim_start_date || '—'}</td>
                                <td className="px-4 py-2 text-sm text-[#0A2A4A]">₹{claim.total_claim_cost?.toFixed(2) ?? '—'}</td>
                                <td className="px-4 py-2 text-sm text-[#0A2A4A]">{claim.claim_duration ?? '—'}</td>
                                <td className="px-4 py-2 text-sm text-[#0A2A4A]">{claim.beneficiary_age ?? '—'}</td>
                                <td className="px-4 py-2 text-sm">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}>
                                    {claim.status || 'UNKNOWN'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-[#627D98]">
                      {riskFilter === 'All'
                        ? 'No historical claims found.'
                        : `No claims found with risk tier: ${riskFilter}`}
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-[#EAF4FA]">
                      <span className="text-xs text-[#627D98] font-medium">
                        Showing {Math.min((currentPage - 1) * pageSize + 1, totalFiltered)} –{' '}
                        {Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`p-2 rounded-lg border border-[#D5E7F3] transition ${
                            currentPage === 1
                              ? 'text-[#94A3B8] cursor-not-allowed bg-[#F8FAFC]'
                              : 'text-[#0F172A] hover:bg-[#F4F9FD] cursor-pointer'
                          }`}
                        >
                          <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                        <span className="text-xs font-bold text-[#0A2A4A]">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`p-2 rounded-lg border border-[#D5E7F3] transition ${
                            currentPage === totalPages
                              ? 'text-[#94A3B8] cursor-not-allowed bg-[#F8FAFC]'
                              : 'text-[#0F172A] hover:bg-[#F4F9FD] cursor-pointer'
                          }`}
                        >
                          <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CLAIM DETAILS SECTION ===== */}
      <div className={`bg-white rounded-2xl shadow-sm border border-[#D5E7F3] overflow-hidden transition-all duration-500 ease-in-out ${showClaimDetails ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 space-y-4">
          {claimDetailsLoading && (
            <div className="text-center py-4 text-xs text-[#627D98]">Loading claim details...</div>
          )}
          {claimDetailsError && (
            <div className="text-center py-4 text-xs text-rose-600">{claimDetailsError}</div>
          )}
          {claimDetails && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0A2A4A]">Claim Details: {claimDetails.claim_id}</h3>
                <button
                  onClick={closeClaimDetails}
                  className="text-xs text-[#627D98] hover:text-[#0A2A4A] hover:underline"
                >
                  Close ×
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#F4F9FD] p-4 rounded-xl">
                <div>
                  <p className="text-xs text-[#627D98]">Claim ID</p>
                  <p className="text-sm font-medium">{claimDetails.claim_id}</p>
                </div>
                <div>
                  <p className="text-xs text-[#627D98]">Anomaly Score</p>
                  <p className="text-sm font-medium">{claimDetails.claim_anomaly_score?.toFixed(2) ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#627D98]">Diagnosis Count</p>
                  <p className="text-sm font-medium">{claimDetails.diagnosis_count ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#627D98]">Procedure Count</p>
                  <p className="text-sm font-medium">{claimDetails.procedure_count ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#627D98]">Physician Count</p>
                  <p className="text-sm font-medium">{claimDetails.physician_count ?? '—'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#627D98] uppercase tracking-wider mb-2">Comparison vs Provider Median</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#D5E7F3] text-xs">
                    <thead className="bg-[#F4F9FD]">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-[#0A2A4A]">Field</th>
                        <th className="px-3 py-2 text-left font-bold text-[#0A2A4A]">Claim Value</th>
                        <th className="px-3 py-2 text-left font-bold text-[#0A2A4A]">Provider Median</th>
                        <th className="px-3 py-2 text-left font-bold text-[#0A2A4A]">Ratio</th>
                        <th className="px-3 py-2 text-left font-bold text-[#0A2A4A]">Comparison</th>
                        <th className="px-3 py-2 text-left font-bold text-[#0A2A4A]">Unusualness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAF4FA]">
                      {Object.entries(claimDetails.comparisons || {}).map(([field, comp]) => {
                        const labels = {
                          diagnosis_count: 'Diagnosis Count',
                          procedure_count: 'Procedure Count',
                          physician_count: 'Physician Count',
                          total_claim_cost: 'Total Claim Cost',
                          claim_duration: 'Claim Duration',
                        };
                        return (
                          <tr key={field}>
                            <td className="px-3 py-2 font-medium">{labels[field] || field}</td>
                            <td className="px-3 py-2">{comp.claim_value ?? '—'}</td>
                            <td className="px-3 py-2">{comp.provider_median ?? '—'}</td>
                            <td className="px-3 py-2">{comp.ratio ?? '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${
                                comp.comparison === 'HIGHER_THAN_TYPICAL' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                comp.comparison === 'LOWER_THAN_TYPICAL' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                comp.comparison === 'TYPICAL' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                                {comp.comparison || 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2">{comp.unusualness ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {claimDetails.top_unusual_factors && claimDetails.top_unusual_factors.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#627D98] uppercase tracking-wider mb-2">Top Unusual Factors</h4>
                  <ul className="space-y-1">
                    {claimDetails.top_unusual_factors.map((factor, idx) => (
                      <li key={idx} className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-2">
                        <span className="font-medium">{factor.feature}:</span> Claim = {factor.claim_value}, Median = {factor.provider_median}, Ratio = {factor.ratio}, Unusualness = {factor.unusualness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-4 mt-4">
                <button
                  onClick={generateSummary}
                  disabled={generatingSummary}
                  className="px-4 py-2 bg-[#0284C7] text-white text-xs font-bold rounded-lg hover:bg-[#0369A1] transition disabled:opacity-50"
                >
                  {generatingSummary ? 'Generating...' : 'Generate Summary'}
                </button>
                <button
                  onClick={closeClaimDetails}
                  className="px-4 py-2 bg-gray-200 text-[#0A2A4A] text-xs font-bold rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>

              {/* Summary Output – now strips ** and renders clean bullets */}
              {summary && (
                <div className="bg-[#F8FAFC] border border-[#D5E7F3] rounded-xl p-4 mt-2 text-base text-[#0A2A4A] leading-relaxed">
                  {summary.split('\n').map((line, index) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <br key={index} />;
                    // Remove markdown bold markers
                    const cleaned = trimmed.replace(/\*\*/g, '');
                    if (/^[-•*]\s/.test(cleaned)) {
                      const content = cleaned.replace(/^[-•*]\s/, '');
                      return (
                        <li key={index} className="ml-4 mb-1 list-disc">
                          {highlightKeywords(content)}
                        </li>
                      );
                    }
                    return (
                      <p key={index} className="mb-1">
                        {highlightKeywords(cleaned)}
                      </p>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskProfileView;