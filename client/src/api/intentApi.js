import axios from './axios';

const intentApi = {
  createIntent: (data) => axios.post('/intents', data),
  getIntents: (params) => axios.get('/intents', { params }),
  getMyIntents: (params) => axios.get('/intents/my', { params }),
  getIntentById: (id) => axios.get(`/intents/${id}`),
  updateIntent: (id, data) => axios.put(`/intents/${id}`, data),
  deleteIntent: (id) => axios.delete(`/intents/${id}`),
  submitIntent: (id) => axios.put(`/intents/${id}/submit`),
};

export default intentApi;
