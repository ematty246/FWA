import React, { useEffect, useState, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import SecurityRoundedIcon from '../SecurityRoundedIcon';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { getInvestigationQueue, assignInvestigation } from '../../services/investigationQueueService';
import { useReportData } from '../../context/ReportDataContext';

const PRIORITY_COLORS = {
  High: 'bg-rose-100 text-rose-700 border-rose-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const STATUS_COLORS = {
  UNASSIGNED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ASSIGNED: 'bg-sky-100 text-sky-700 border-sky-200',
};

const formatNumber = (n) => (n ?? 0).toLocaleString('en-IN');
const PAGE_SIZE = 50;

export const InvestigationQueue = () => {
      const { setInvestigationInfo } = useReportData();
  const { searchQuery = '' } = useOutletContext() || {};

  const [allData, setAllData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentInvestigatorId = currentUser?.investigator_id || currentUser?.id || null;

  // Filter data by search query (Provider ID)
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return allData;
    const query = searchQuery.trim().toLowerCase();
    return allData.filter((item) =>
      item.provider_id?.toLowerCase().includes(query)
    );
  }, [allData, searchQuery]);

  // Paginate filtered data
  const totalFiltered = filteredData.length;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchQueue = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await getInvestigationQueue();
      setAllData(data.investigations || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.detail?.message || err?.message || 'Failed to load investigation queue.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(true);
  }, []);

  const handleAssign = async (investigationId) => {
    setAssigningId(investigationId);
    setError(null);
    try {
      await assignInvestigation(investigationId);
      await fetchQueue(false);
    } catch (err) {
      setError(err?.response?.data?.detail?.message || 'Assignment failed.');
    } finally {
      setAssigningId(null);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="p-8 min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0284C7] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#627D98] uppercase tracking-wider">
            Loading investigation queue...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-[#EAF4FA] min-h-[calc(100vh-5rem)] text-[#0A2A4A]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-[#0A2A4A] via-[#0369A1] to-[#0284C7] text-white p-6 rounded-2xl shadow-xs border border-[#C6E2F5]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-200 font-bold text-xs uppercase tracking-wider">
            <SecurityRoundedIcon sx={{ fontSize: 16, color: '#67e8f9' }} />
            Investigation Queue
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            ClaimGuard <span className="text-cyan-300">AI</span>
          </h1>
          <p className="text-sky-100/90 text-xs max-w-2xl">
            Prioritized list of investigations based on FWA risk scores and anomalous claims.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchQueue(true)}
            className="px-4 py-2.5 bg-white hover:bg-sky-50 text-[#0284C7] font-extrabold rounded-xl text-xs tracking-wide shadow-xs cursor-pointer transition flex items-center gap-2 uppercase"
          >
            <RefreshRoundedIcon sx={{ fontSize: 16 }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <WarningAmberRoundedIcon sx={{ fontSize: 18, color: '#e11d48' }} />
          {error}
        </div>
      )}

      {/* Queue Count */}
      <div className="bg-white p-4 rounded-xl border border-[#D5E7F3] shadow-xs flex items-center justify-between">
        <span className="text-xs font-bold text-[#627D98] uppercase tracking-wider">
          {searchQuery ? 'Filtered Investigations' : 'Total Investigations'}
        </span>
        <span className="text-xl font-black text-[#0A2A4A]">{formatNumber(totalFiltered)}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#D5E7F3] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#D5E7F3]">
            <thead className="bg-[#F4F9FD]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Investigation ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Provider ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">FWA Score</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Anomalous Claims</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Assigned To</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-[#0A2A4A] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF4FA]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-sm text-[#627D98]">
                    {searchQuery ? 'No investigations match your search.' : 'No investigations in the queue.'}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const isAssigned = item.status === 'ASSIGNED';
                  const assignedToMe = isAssigned && item.assigned_investigator_id === currentInvestigatorId;
                  const assignedToOther = isAssigned && !assignedToMe;
                  const isBlurred = assignedToOther;

                  return (
                    <tr
                      key={item.investigation_id}
                      className={`
                        transition-all duration-200
                        ${isBlurred ? 'opacity-50 blur-[1px] pointer-events-none' : 'hover:bg-[#F4F9FD]'}
                        ${assignedToMe ? 'border-l-4 border-l-emerald-500' : ''}
                      `}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-[#0A2A4A]">{item.rank}</td>
                      <td className="px-4 py-3 text-sm font-mono text-[#0A2A4A]">{item.investigation_id}</td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {assignedToMe ? (
                        <Link
  to={`/risk_profile/${item.provider_id}`}
  onClick={() => {
    setInvestigationInfo({
      investigationId: item.investigation_id,
      providerId: item.provider_id,
      priority: item.investigation_priority,
      status: item.status,
      date:
        item.investigation_date ??
        item.date ??
        new Date().toISOString().split('T')[0],
    });
  }}
  className="text-[#0284C7] hover:underline font-bold"
>
  {item.provider_id}
</Link>
                        ) : (
                          <span className="text-[#0A2A4A]">{item.provider_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {item.overall_fwa_score != null ? item.overall_fwa_score.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatNumber(item.anomalous_claims)}</td>
                      <td className="px-4 py-3">
                        <span className={`
                          inline-flex px-2 py-0.5 rounded-full text-xs font-bold border
                          ${PRIORITY_COLORS[item.investigation_priority] || 'bg-gray-100 text-gray-700 border-gray-200'}
                        `}>
                          {item.investigation_priority || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`
                          inline-flex px-2 py-0.5 rounded-full text-xs font-bold border
                          ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700 border-gray-200'}
                        `}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {!isAssigned ? (
                          <span className="text-[#627D98] text-xs font-medium">—</span>
                        ) : assignedToMe ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                            <PersonRoundedIcon sx={{ fontSize: 14 }} />
                            You
                          </span>
                        ) : (
                          <span className="text-[#64748B] text-xs font-medium">
                            {item.assigned_investigator_name || 'Unknown'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isAssigned ? (
                          <button
                            onClick={() => handleAssign(item.investigation_id)}
                            disabled={assigningId === item.investigation_id}
                            className={`
                              px-3 py-1 rounded-lg text-xs font-bold text-white transition
                              ${assigningId === item.investigation_id
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-[#0284C7] hover:bg-[#0369A1] shadow-sm shadow-sky-600/20'
                              }
                            `}
                          >
                            {assigningId === item.investigation_id ? 'Assigning...' : 'Assign'}
                          </button>
                        ) : assignedToMe ? (
                          <span className="text-xs font-bold text-emerald-600">Your Case</span>
                        ) : (
                          <span className="text-xs font-semibold text-[#627D98]">Assigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalFiltered > 0 && (
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#D5E7F3] shadow-xs">
          <span className="text-xs text-[#627D98] font-medium">
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalFiltered)} –{' '}
            {Math.min(currentPage * PAGE_SIZE, totalFiltered)} of {totalFiltered}
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
    </div>
  );
};

export default InvestigationQueue;