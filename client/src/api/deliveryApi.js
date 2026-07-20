import axios from './axios';

const deliveryApi = {
  createDelivery: (data) => axios.post('/deliveries', data),
  getDeliveries: (params) => axios.get('/deliveries', { params }),
  getDeliveryById: (id) => axios.get(`/deliveries/${id}`),
  updateDelivery: (id, data) => axios.put(`/deliveries/${id}`, data),
  updateDeliveryStatus: (id, status) => axios.patch(`/deliveries/${id}/status`, { status }),
  recordPartialDelivery: (id, items) => axios.post(`/deliveries/${id}/partial`, { items }),
  recordFullDelivery: (id) => axios.post(`/deliveries/${id}/complete`),
  getDeliveriesByIntent: (intentId) => axios.get(`/deliveries/intent/${intentId}`),
};

export default deliveryApi;
