import api from './api';

export const loginAdmin = async (email, password) => {
  const response = await api.post('/api/auth/login', {
    role: 'ADMIN',           // <-- required by backend
    email: email.trim(),
    password: password.trim(),
  });
  return response.data;
};

export const setAuthData = (accessToken, user) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};