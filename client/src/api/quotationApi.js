import axios from './axios';

const quotationApi = {
  uploadQuotation: (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (key === 'items' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'object' && item !== null && !(item instanceof File)) {
            formData.append(`${key}`, JSON.stringify(item));
          } else {
            formData.append(`${key}`, item);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });
    return axios.post('/quotations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getQuotationsByIntent: (intentId) => axios.get(`/quotations/intent/${intentId}`),
  selectSupplier: (quotationId) => axios.put(`/quotations/${quotationId}/select`),
  updateQuotation: (id, data) => axios.put(`/quotations/${id}`, data),
  deleteQuotation: (id) => axios.delete(`/quotations/${id}`),
};

export default quotationApi;
