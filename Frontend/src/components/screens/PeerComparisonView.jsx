import React, { useEffect, useState } from 'react';
import { useReportData } from '../../context/ReportDataContext';
import { useParams, useNavigate } from 'react-router-dom';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { getPeerComparison, getDetailedPeerComparison } from '../../services/peerComparisonService';

const PeerComparisonView = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
   const {
    setPeerComparison,
    setAiPeerSummary,
  } = useReportData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Detailed comparison state
  const [detailedData, setDetailedData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Summary state
  const [summary, setSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    if (!providerId) {
      setError('No provider ID provided.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getPeerComparison(providerId);
        setData(result);
      } catch (err) {
        setError(err?.response?.data?.detail?.message || 'Failed to load peer comparison.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [providerId]);

  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  // Fetch detailed comparison
  const handleCompare = async () => {
    if (!providerId) return;
    setLoadingDetails(true);
    setShowDetails(true);
    setSummary(null); // clear any previous summary
    try {
    const result = await getDetailedPeerComparison(providerId);

setDetailedData(result);

setPeerComparison({
  peerGroup:
    result.peer_group ??
    result.peerGroup ??
    null,

  metrics: (result.comparison || []).map((item) => ({
    metric: item.metric,

    provider:
      item.current_provider ??
      item.provider ??
      null,

    peerMean:
      item.peer_mean ??
      item.peerMean ??
      null,

    difference:
      item.difference ??
      null,

    zScore:
      item.z_score ??
      item.zScore ??
      null,
  })),
});
    } catch (err) {
      setError(err?.response?.data?.detail?.message || 'Failed to load detailed comparison.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Generate AI summary
  const generateSummary = async () => {
    if (!detailedData?.comparison) return;
    setGeneratingSummary(true);
    setSummary(null);

    try {
      const { comparison, peer_group, provider_id } = detailedData;

      // Build a descriptive prompt
      let prompt = `You are a healthcare fraud analyst. Based on the following peer comparison metrics for provider ${provider_id} (Peer Group: ${peer_group || 'N/A'}), generate a concise, professional summary in bullet points (use dashes). Highlight any significant deviations from peer means, especially where z-scores indicate unusual patterns (z > 2 or z < -2). Keep it to 3-5 bullet points. Do not use bold markers or markdown formatting.\n\n`;

      prompt += `Metrics:\n`;
      comparison.forEach((item) => {
        prompt += `- ${item.metric}: Current Provider = ${item.current_provider ?? 'N/A'}, Peer Mean = ${item.peer_mean ?? 'N/A'}, Difference = ${item.difference ?? 'N/A'}, Z-Score = ${item.z_score ?? 'N/A'}\n`;
      });

      const response = await puter.ai.chat(prompt, {
        model: 'gpt-5.6-luna',
      });

      const generatedSummary =
  response.message?.content ||
  response ||
  'No summary generated.';

setSummary(generatedSummary);
setAiPeerSummary(generatedSummary);
    } catch (err) {
      console.error('AI summary generation error:', err);
      setSummary('Failed to generate summary. Please try again.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0284C7] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#627D98] uppercase tracking-wider">
            Loading peer comparison...
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
          <h3 className="text-sm font-bold text-rose-600 mt-2">Failed to load peer comparison</h3>
          <p className="text-xs text-[#627D98]">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-[#0284C7] text-white text-xs font-bold rounded-lg hover:bg-[#0369A1]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl border border-[#D5E7F3] max-w-md text-center">
          <p className="text-sm text-[#627D98]">No data found for this provider.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-[#0284C7] text-white text-xs font-bold rounded-lg hover:bg-[#0369A1]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Pagination calculations
  const totalPeers = data.peers?.length || 0;
  const totalPages = Math.ceil(totalPeers / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalPeers);
  const paginatedPeers = data.peers?.slice(startIndex, endIndex) || [];

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Determine status message
  const isAvailable = data.comparison_available === true;
  const status = data.status || 'UNKNOWN';
  const statusMessages = {
    AVAILABLE: 'Peer comparison is available.',
    COLD_START: 'Insufficient provider history – peer comparison not yet available.',
    INSUFFICIENT_HISTORY: 'Provider history is insufficient – no peer group assigned.',
    NO_PEERS: 'No other providers in the same peer group.',
  };
  const statusMessage = statusMessages[status] || data.message || 'Status unknown.';

  // Format numbers for detailed comparison
  const formatNumber = (value) => {
    if (value == null) return '—';
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  // Helper to highlight keywords in summary
  const highlightKeywords = (text) => {
    const keywords = [
      'fraud', 'risk', 'high', 'low', 'medium', 'deviation',
      'anomaly', 'typical', 'unusual', 'significant', 'elevated',
      'normal', 'abnormal', 'alert', 'concern', 'warning',
      'higher', 'lower', 'median', 'ratio', 'unusualness',
      'suspicious', 'attention', 'review', 'investigate',
      'z-score', 'mean', 'difference'
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

  return (
    <div className="p-8 space-y-6 bg-[#EAF4FA] min-h-[calc(100vh-5rem)] text-[#0A2A4A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A2A4A] via-[#0369A1] to-[#0284C7] text-white p-6 rounded-2xl shadow-xs border border-[#C6E2F5]">
        <h1 className="text-2xl font-black tracking-tight">Peer Comparison</h1>
        <p className="text-sky-100/90 text-sm mt-1">
          Provider: <span className="font-mono">{data.provider_id}</span>
        </p>
        {data.peer_group && (
          <p className="text-sky-100/80 text-sm mt-0.5">
            Peer Group: <span className="font-medium">{data.peer_group}</span>
          </p>
        )}
      </div>

      {/* Status / Message */}
      <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-xs flex items-center gap-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${
          isAvailable ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
          'bg-amber-100 text-amber-700 border-amber-200'
        }`}>
          {isAvailable ? 'Available' : 'Unavailable'}
        </span>
        <span className="text-xs text-[#627D98]">{statusMessage}</span>
      </div>

      {/* Provider Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-xs">
          <p className="text-xs text-[#627D98] font-medium">Overall FWA Risk</p>
          <p className="text-xl font-bold mt-1">
            {data.overall_fwa_risk != null ? data.overall_fwa_risk.toFixed(2) : '—'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-xs">
          <p className="text-xs text-[#627D98] font-medium">Peer Group</p>
          <p className="text-xl font-bold mt-1 break-words">
            {data.peer_group || 'None assigned'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-xs">
          <p className="text-xs text-[#627D98] font-medium">Total Claims</p>
          <p className="text-xl font-bold mt-1">
            {data.claim_count != null ? data.claim_count.toLocaleString('en-IN') : '—'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-xs">
          <p className="text-xs text-[#627D98] font-medium">Peer Count</p>
          <p className="text-xl font-bold mt-1">
            {totalPeers}
          </p>
        </div>
      </div>

      {/* Peers Table */}
      <div className="bg-white rounded-2xl border border-[#D5E7F3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#D5E7F3] bg-[#F4F9FD]">
          <h2 className="text-sm font-bold text-[#0A2A4A]">Peer Providers</h2>
          {totalPeers === 0 && (
            <p className="text-xs text-[#627D98] mt-1">No peers found in this group.</p>
          )}
          {totalPeers > 0 && (
            <p className="text-xs text-[#627D98] mt-1">
              Showing {startIndex + 1} – {endIndex} of {totalPeers}
            </p>
          )}
        </div>
        {totalPeers > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#D5E7F3]">
                <thead className="bg-[#F4F9FD]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">
                      Provider ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">
                      FWA Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">
                      Total Claims
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">
                      Avg Reimbursement
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF4FA]">
                  {paginatedPeers.map((peer, index) => (
                    <tr
                      key={peer.provider_id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-[#0A2A4A]">
                        {peer.provider_id}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {peer.overall_fwa_score != null ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                              peer.overall_fwa_score >= 0.7
                                ? 'bg-rose-100 text-rose-700'
                                : peer.overall_fwa_score >= 0.4
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {peer.overall_fwa_score.toFixed(2)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0A2A4A]">
                        {peer.total_claims != null ? peer.total_claims.toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0A2A4A]">
                        {peer.average_claim_reimbursement != null
                          ? `₹${peer.average_claim_reimbursement.toFixed(2)}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#D5E7F3] bg-[#F4F9FD]">
                <span className="text-xs text-[#627D98] font-medium">
                  Showing {startIndex + 1} – {endIndex} of {totalPeers}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border border-[#D5E7F3] transition ${
                      currentPage === 1
                        ? 'text-[#94A3B8] cursor-not-allowed bg-[#F8FAFC]'
                        : 'text-[#0F172A] hover:bg-[#EAF4FA] cursor-pointer'
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
                        : 'text-[#0F172A] hover:bg-[#EAF4FA] cursor-pointer'
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

      {/* Compare Button & Detailed Comparison Section */}
      {isAvailable && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <button
              onClick={handleCompare}
              disabled={loadingDetails}
              className="px-4 py-2 bg-[#0284C7] text-white text-xs font-bold rounded-lg hover:bg-[#0369A1] transition disabled:opacity-50"
            >
              {loadingDetails ? 'Loading...' : 'Compare'}
            </button>
          </div>

          {showDetails && (
            <div className="bg-white rounded-2xl border border-[#D5E7F3] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#D5E7F3] bg-[#F4F9FD]">
                <h2 className="text-sm font-bold text-[#0A2A4A]">Detailed Peer Comparison</h2>
                {detailedData?.peer_group && (
                  <p className="text-xs text-[#627D98] mt-1">
                    Peer Group: <span className="font-medium">{detailedData.peer_group}</span>
                  </p>
                )}
              </div>
              {detailedData?.comparison && detailedData.comparison.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#D5E7F3]">
                    <thead className="bg-[#F4F9FD]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Feature</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Current Provider</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Peer Mean</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Difference</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Z-Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAF4FA]">
                      {detailedData.comparison.map((item, index) => (
                        <tr key={item.metric} className={index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}>
                          <td className="px-4 py-3 text-sm font-medium text-[#0A2A4A]">{item.metric}</td>
                          <td className="px-4 py-3 text-sm">{formatNumber(item.current_provider)}</td>
                          <td className="px-4 py-3 text-sm">{formatNumber(item.peer_mean)}</td>
                          <td className="px-4 py-3 text-sm">{formatNumber(item.difference)}</td>
                          <td className="px-4 py-3 text-sm">{formatNumber(item.z_score)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-xs text-[#627D98]">No detailed comparison data available.</div>
              )}

              {/* Generate Summary Button & Summary Output */}
              <div className="p-4 border-t border-[#D5E7F3] bg-[#F4F9FD]">
                <div className="flex justify-center">
                  <button
                    onClick={generateSummary}
                    disabled={generatingSummary || !detailedData?.comparison}
                    className="px-4 py-2 bg-[#0284C7] text-white text-xs font-bold rounded-lg hover:bg-[#0369A1] transition disabled:opacity-50"
                  >
                    {generatingSummary ? 'Generating...' : 'Generate Summary'}
                  </button>
                </div>
                {summary && (
                  <div className="mt-4 bg-white border border-[#D5E7F3] rounded-xl p-4 text-base text-[#0A2A4A] leading-relaxed whitespace-pre-wrap">
                    {summary.split('\n').map((line, index) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <br key={index} />;
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Back Button */}
      <div className="flex justify-start">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-[#0284C7] text-white text-xs font-bold rounded-lg hover:bg-[#0369A1] transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default PeerComparisonView;