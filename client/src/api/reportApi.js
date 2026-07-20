import axios from './axios';

const reportApi = {
  getProcurementReport: (params) => axios.get('/reports/procurement', { params }),
  getSupplierReport: (params) => axios.get('/reports/supplier', { params }),
  getInvoiceReport: (params) => axios.get('/reports/invoice', { params }),
  exportReport: (type, params) => axios.get(`/reports/export/${type}`, { params, responseType: 'blob' }),
};

export default reportApi;
