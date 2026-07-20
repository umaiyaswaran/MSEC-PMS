import axios from './axios';

const invoiceApi = {
  uploadInvoice: (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });
    return axios.post('/invoices', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getInvoices: (params) => axios.get('/invoices', { params }),
  getInvoiceById: (id) => axios.get(`/invoices/${id}`),
  updateInvoice: (id, data) => axios.put(`/invoices/${id}`, data),
  verifyInvoice: (id) => axios.post(`/invoices/${id}/verify`),
  approveInvoice: (id) => axios.post(`/invoices/${id}/approve`),
  rejectInvoice: (id, reason) => axios.post(`/invoices/${id}/reject`, { reason }),
  updatePaymentStatus: (id, data) => axios.patch(`/invoices/${id}/payment`, data),
  getInvoicesByIntent: (intentId) => axios.get(`/invoices/intent/${intentId}`),
};

export default invoiceApi;
