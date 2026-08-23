import api from './api';

/**
 * Register a new provider
 * @param {string} providerId
 * @param {string} providerName
 * @param {string} email
 * @param {string} hospitalAddress
 * @returns {Promise<{ message: string, provider_id: string, status: string }>}
 */
export const registerProvider = async (providerId, providerName, email, hospitalAddress) => {
  const response = await api.post('/api/provider/register', {
    role: "PROVIDER",
    provider_id: providerId.trim().toUpperCase(),
    provider_name: providerName.trim(),
    email: email.trim().toLowerCase(),
    hospital_address: hospitalAddress.trim(),
  });
  return response.data;
};

/**
 * Register a new investigator
 * @param {string} fullName
 * @param {string} email
 * @param {string} phoneNumber (optional)
 * @returns {Promise<{ message: string, investigator_id: string, status: string }>}
 */
export const registerInvestigator = async (fullName, email, phoneNumber) => {
  const response = await api.post('/api/investigator/register', {
    full_name: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone_number: phoneNumber?.trim() || null,
  });
  return response.data;
};


/**
 * Login an investigator
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ access_token: string, token_type: string, user: object }>}
 */
export const loginInvestigator = async (email, password) => {
  const response = await api.post('/api/auth/investigator', {
    role: 'INVESTIGATOR',
    email: email.trim().toLowerCase(),
    password: password.trim(),
  });
  return response.data;
};

/**
 * Login as a provider
 * @param {string} providerId
 * @param {string} password
 * @returns {Promise<{ access_token: string, user: object }>}
 */
export const loginProvider = async (providerId, password) => {
  const response = await api.post('/api/auth/provider', {
    role: 'PROVIDER',
    provider_id: providerId.trim().toUpperCase(),
    password: password.trim(),
  });
  return response.data;
};