import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach logged-in investigator token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const reviewService = {

  // ============================================================
  // GET INVESTIGATION RECORDS FOR CURRENT INVESTIGATOR
  // ============================================================

  getInvestigationRecords: async () => {
    const response = await api.get(
      '/api/investigation-records/'
    );

    return response.data;
  },

  // ============================================================
  // GET ONE INVESTIGATION RECORD
  // ============================================================

  getInvestigationRecord: async (investigationId) => {
    if (!investigationId) {
      throw new Error('Investigation ID is required.');
    }

    const response = await api.get(
      `/api/investigation-records/${encodeURIComponent(
        investigationId
      )}`
    );

    return response.data;
  },

  // ============================================================
  // GET PRIVATE REPORT URL
  // ============================================================

  getReportUrl: async (investigationId) => {
    if (!investigationId) {
      throw new Error('Investigation ID is required.');
    }

    const response = await api.get(
      `/api/investigation-records/${encodeURIComponent(
        investigationId
      )}/report`
    );

    return response.data;
  },

  // ============================================================
  // MAKE INVESTIGATION DECISION
  // ============================================================
makeDecision: async ({
  investigationId,
  investigatorId,
  decision,
  reason,
}) => {
  const response = await api.patch(
    `/api/investigation-records/${investigationId}/decision`,
    {
      investigator_id: investigatorId,
      decision,
      reason: reason || null,
    }
  );

  return response.data;
},
};

export default reviewService;