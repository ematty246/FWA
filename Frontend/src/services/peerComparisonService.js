import api from './api';

/**
 * Fetch basic peer comparison for a provider.
 * GET /api/investigator/providers/{provider_id}/peer-comparison
 */
export const getPeerComparison = async (providerId) => {
  const response = await api.get(
    `/api/investigator/providers/${providerId}/peer-comparison`
  );
  return response.data;
};

/**
 * Fetch detailed peer comparison (z‑scores, etc.) – optional.
 * GET /api/investigator/providers/{provider_id}/peer-comparison/details
 */
export const getDetailedPeerComparison = async (providerId) => {
  const response = await api.get(
    `/api/investigator/providers/${providerId}/peer-comparison/details`
  );
  return response.data;
};