import React, { useState, useEffect } from 'react';
import {
  getPendingProviders,
  getPendingInvestigators,
  approveProvider,
  rejectProvider,
  approveInvestigator,
  rejectInvestigator,
} from '../services/adminApi';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('providers');
  const [providers, setProviders] = useState([]);
  const [investigators, setInvestigators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    type: null,
    id: null,
    reason: '',
  });

  const loadData = async (isBackgroundRefresh = false) => {

  if (isBackgroundRefresh) {
    setRefreshing(true);
  } else {
    setLoading(true);
  }

  try {

    const [provData, invData] = await Promise.all([
      getPendingProviders(),
      getPendingInvestigators(),
    ]);

    // Update only if data actually changed
    setProviders(provData);
    setInvestigators(invData);

    // Clear previous loading error
    setError(null);

  } catch (err) {

    console.error(
      'Failed to load registrations:',
      err
    );

    // IMPORTANT:
    // Do not destroy the currently visible table
    // during background polling.

    if (!isBackgroundRefresh) {

      setError(
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        'Failed to load registrations.'
      );
    }

  } finally {

    if (isBackgroundRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }
};

// ============================================================
// INITIAL LOAD + BACKGROUND POLLING
// ============================================================

useEffect(() => {

  // Initial request
  loadData(false);

  // Background polling every 5 seconds
  const interval = setInterval(() => {

    loadData(true);

  }, 5000);

  return () => {

    clearInterval(interval);

  };

}, []);
  const handleApprove = async (type, id) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      let result;
      if (type === 'provider') {
        result = await approveProvider(id);
      } else {
        result = await approveInvestigator(id);
      }
      setSuccessMsg(result.message || `${type} approved successfully.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Approval failed.');
    } finally {
      setLoading(false);
    }
  };

  const openRejectModal = (type, id) => {
    setRejectModal({ open: true, type, id, reason: '' });
  };

  const handleRejectSubmit = async () => {
    const { type, id, reason } = rejectModal;
    if (!reason.trim()) {
      setError('Rejection reason is required.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      let result;
      if (type === 'provider') {
        result = await rejectProvider(id, reason.trim());
      } else {
        result = await rejectInvestigator(id, reason.trim());
      }
      setSuccessMsg(result.message || `${type} rejected.`);
      setRejectModal({ open: false, type: null, id: null, reason: '' });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Rejection failed.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setRejectModal({ open: false, type: null, id: null, reason: '' });
  };

  // Helper: build Google Maps link
  const buildMapsLink = (provider) => {
    if (provider.latitude && provider.longitude) {
      return `https://www.google.com/maps?q=${provider.latitude},${provider.longitude}`;
    }
    if (provider.hospital_address) {
      return `https://www.google.com/maps?q=${encodeURIComponent(provider.hospital_address)}`;
    }
    return '#';
  };

  return (
    <div className="min-h-screen bg-[#EAF4FA] p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold text-[#0A2A4A] mb-2">Admin Dashboard</h1>
        <p className="text-sm text-[#627D98] mb-6">Approve or reject pending registrations.</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
            {successMsg}
          </div>
        )}

        <div className="flex border-b border-[#D5E7F3] mb-6">
          <button
            className={`py-2 px-4 font-bold text-sm ${activeTab === 'providers' ? 'text-[#0284C7] border-b-2 border-[#0284C7]' : 'text-[#627D98]'}`}
            onClick={() => setActiveTab('providers')}
          >
            Providers ({providers.length})
          </button>
          <button
            className={`py-2 px-4 font-bold text-sm ${activeTab === 'investigators' ? 'text-[#0284C7] border-b-2 border-[#0284C7]' : 'text-[#627D98]'}`}
            onClick={() => setActiveTab('investigators')}
          >
            Investigators ({investigators.length})
          </button>
        </div>

     {loading && (
  <div className="text-center py-8 text-[#627D98]">
    Loading registrations...
  </div>
)}

{!loading && (
  <div
    className={`text-right mb-2 text-xs text-[#627D98] h-4 transition-opacity duration-200 ${
      refreshing ? 'opacity-100' : 'opacity-0'
    }`}
  >
    Checking for new registrations...
  </div>
)}
        {/* Providers Table */}
        {activeTab === 'providers' && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E7F3] overflow-x-auto">
            <table className="min-w-full divide-y divide-[#D5E7F3]">
              <thead className="bg-[#F4F9FD]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A]">Provider ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A]">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A]">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A]">Location</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-[#0A2A4A]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF4FA]">
                {providers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-[#627D98]">No pending providers.</td>
                  </tr>
                ) : (
                  providers.map((p) => (
                    <tr key={p.provider_id}>
                      <td className="px-4 py-3 text-sm font-medium">{p.provider_id}</td>
                      <td className="px-4 py-3 text-sm">{p.provider_name || '—'}</td>
                      <td className="px-4 py-3 text-sm">{p.email}</td>
                      <td className="px-4 py-3 text-sm">
                        {p.latitude && p.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0284C7] hover:underline"
                          >
                            View on Map
                          </a>
                        ) : p.hospital_address ? (
                          <a
                            href={`https://www.google.com/maps?q=${encodeURIComponent(p.hospital_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0284C7] hover:underline"
                          >
                            {p.hospital_address}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleApprove('provider', p.provider_id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal('provider', p.provider_id)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Investigators Table */}
        {activeTab === 'investigators' && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E7F3] overflow-x-auto">
            <table className="min-w-full divide-y divide-[#D5E7F3]">
              <thead className="bg-[#F4F9FD]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A]">Investigator ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A]">Full Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A]">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#0A2A4A]">Phone</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-[#0A2A4A]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF4FA]">
                {investigators.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-[#627D98]">No pending investigators.</td>
                  </tr>
                ) : (
                  investigators.map((inv) => (
                    <tr key={inv.investigator_id}>
                      <td className="px-4 py-3 text-sm font-medium">{inv.investigator_id}</td>
                      <td className="px-4 py-3 text-sm">{inv.full_name}</td>
                      <td className="px-4 py-3 text-sm">{inv.email}</td>
                      <td className="px-4 py-3 text-sm">{inv.phone_number || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleApprove('investigator', inv.investigator_id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal('investigator', inv.investigator_id)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal (unchanged) */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5E7F3]">
            <h3 className="text-lg font-bold text-[#0A2A4A] mb-2">Reject Registration</h3>
            <p className="text-sm text-[#627D98] mb-4">
              Please provide a reason for rejection (will be sent to the registrant).
            </p>
            <textarea
              className="w-full border border-[#D5E7F3] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0284C7] focus:border-[#0284C7] outline-none"
              rows="3"
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Reason for rejection..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-[#0A2A4A] text-sm font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;