import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// ================================================================
// Axios instance with auth token attached automatically
// ================================================================
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ================================================================
// Submit a new claim
// POST /api/provider/claims
// ================================================================
export const submitClaim = async (claimData) => {
  const response = await apiClient.post('/api/provider/claims', claimData);
  return response.data;
};

export default {
  submitClaim,
};