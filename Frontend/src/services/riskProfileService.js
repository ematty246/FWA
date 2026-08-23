import api from './api';

export const getProviderRiskProfile = async (providerId) => {
  const response = await api.get(`/api/investigator/providers/${providerId}/risk-profile`);
  return response.data;
};
export const getProviderClaims = async (providerId) => {
  const response = await api.get(`/api/investigator/providers/${providerId}/claims`);
  return response.data;
};
export const getClaimDetails = async (providerId, claimId) => {
  const response = await api.get(`/api/investigator/providers/${providerId}/claims/${claimId}`);
  return response.data;
};