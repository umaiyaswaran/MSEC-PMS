import axios from './axios';

const grnApi = {
  createGRN: (data) => axios.post('/grns', data),
  getGRNs: (params) => axios.get('/grns', { params }),
  getGRNById: (id) => axios.get(`/grns/${id}`),
};

export default grnApi;
