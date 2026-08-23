import api from './api';

/**
 * Fetch the investigation queue for the current investigator.
 * GET /api/investigator/queue
 */
export const getInvestigationQueue = async () => {
  const response = await api.get('/api/investigator/queue');
  return response.data; // { total, investigations: [...] }
};

/**
 * Assign an investigation to the current investigator.
 * POST /api/investigator/investigations/{investigation_id}/assign
 */
export const assignInvestigation = async (investigationId) => {
  const response = await api.post(
    `/api/investigator/investigations/${investigationId}/assign`
  );
  return response.data; // updated investigation data
};