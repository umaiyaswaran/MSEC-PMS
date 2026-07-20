import axios from './axios';

const departmentApi = {
  getDepartments: () => axios.get('/departments'),
  getDepartmentById: (id) => axios.get(`/departments/${id}`),
};

export default departmentApi;
