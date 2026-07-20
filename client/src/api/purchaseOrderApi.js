import axios from './axios';

const purchaseOrderApi = {
  createPO: (data) => axios.post('/purchase-orders', data),
  getPOs: (params) => axios.get('/purchase-orders', { params }),
  getPOById: (id) => axios.get(`/purchase-orders/${id}`),
  updatePO: (id, data) => axios.put(`/purchase-orders/${id}`, data),
  approvePO: (id, remarks) => axios.put(`/purchase-orders/${id}/approve`, { remarks }),
  rejectPO: (id, remarks) => axios.put(`/purchase-orders/${id}/reject`, { remarks }),
  getPOsByIntent: (intentId) => axios.get(`/purchase-orders/intent/${intentId}`),
  downloadPDF: (id) => axios.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' }),
  createSample: (data) => axios.post('/purchase-orders/generate-sample', data),
  sendSampleToAdmin: (id) => axios.post(`/purchase-orders/${id}/send-sample-to-admin`),
  notifyStoreManager: (id) => axios.post(`/purchase-orders/${id}/notify-store-manager`),
  generateOriginal: (samplePOId) => axios.post('/purchase-orders/generate-original', { samplePOId }),
};

export default purchaseOrderApi;
