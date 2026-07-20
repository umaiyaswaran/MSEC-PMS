import axios from './axios';

const dashboardApi = {
  getAdminDashboard: () => axios.get('/dashboard/admin'),
  getManagerDashboard: () => axios.get('/dashboard/manager'),
  getUserDashboard: () => axios.get('/dashboard/user'),
  getChartData: (params) => axios.get('/dashboard/charts', { params }),
};

export default dashboardApi;
