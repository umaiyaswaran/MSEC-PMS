import axios from './axios';

const authApi = {
  login: (email, password) => axios.post('/auth/login', { email, password }),
  register: (userData) => axios.post('/auth/register', userData),
  getMe: () => axios.get('/auth/me'),
  logout: () => axios.post('/auth/logout'),
  forgotPassword: (email) => axios.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => axios.post('/auth/reset-password', { token, password }),
  changePassword: (oldPassword, newPassword) => axios.post('/auth/change-password', { oldPassword, newPassword }),
};

export default authApi;
