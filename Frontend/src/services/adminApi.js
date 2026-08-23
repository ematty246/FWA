import api from './api';

export const getPendingProviders = async () => {
  const response = await api.get('/api/admin/providers/pending');
  return response.data.providers || []; // extract the array
};

export const getPendingInvestigators = async () => {
  const response = await api.get('/api/admin/investigators/pending');
  return response.data.investigators || [];
};

export const approveProvider = async (providerId) => {
  const response = await api.post(`/api/admin/providers/${providerId}/decision`, {
    decision: 'APPROVE',
  });
  return response.data;
};

export const rejectProvider = async (providerId, reason) => {
  const response = await api.post(`/api/admin/providers/${providerId}/decision`, {
    decision: 'REJECT',
    reason,
  });
  return response.data;
};

export const approveInvestigator = async (investigatorId) => {
  const response = await api.post(`/api/admin/investigators/${investigatorId}/decision`, {
    decision: 'APPROVE',
  });
  return response.data;
};

export const rejectInvestigator = async (investigatorId, reason) => {
  const response = await api.post(`/api/admin/investigators/${investigatorId}/decision`, {
    decision: 'REJECT',
    reason,
  });
  return response.data;
};