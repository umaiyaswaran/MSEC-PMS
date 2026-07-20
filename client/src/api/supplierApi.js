import axios from './axios';

const supplierApi = {
  createSupplier: (data) => axios.post('/suppliers', data),
  getSuppliers: (params) => axios.get('/suppliers', { params }),
  getActiveSuppliers: () => axios.get('/suppliers/active'),
  getSupplierById: (id) => axios.get(`/suppliers/${id}`),
  updateSupplier: (id, data) => axios.put(`/suppliers/${id}`, data),
  deleteSupplier: (id) => axios.delete(`/suppliers/${id}`),
};

export default supplierApi;
