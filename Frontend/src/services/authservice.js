import api from './api';


// ============================================================
// ADMIN LOGIN
// ============================================================

export const loginAdmin = async (
  email,
  password
) => {

  const response = await api.post(
    '/api/auth/login',
    {
      role: 'ADMIN',
      email: email.trim(),
      password: password.trim(),
    }
  );

  return response.data;
};


// ============================================================
// SAVE AUTHENTICATION DATA
// ============================================================

export const setAuthData = (
  accessToken,
  refreshToken,
  user
) => {

  localStorage.setItem(
    'access_token',
    accessToken
  );

  localStorage.setItem(
    'refresh_token',
    refreshToken
  );

  localStorage.setItem(
    'user',
    JSON.stringify(user)
  );
};


// ============================================================
// LOGOUT
// ============================================================

export const logout = () => {

  localStorage.removeItem(
    'access_token'
  );

  localStorage.removeItem(
    'refresh_token'
  );

  localStorage.removeItem(
    'user'
  );
};


// ============================================================
// GET CURRENT USER
// ============================================================

export const getCurrentUser = () => {

  const user =
    localStorage.getItem('user');

  return user
    ? JSON.parse(user)
    : null;
};


// ============================================================
// CHECK AUTHENTICATION
// ============================================================

export const isAuthenticated = () => {

  return !!localStorage.getItem(
    'access_token'
  );

};