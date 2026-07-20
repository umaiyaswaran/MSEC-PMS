import { useState, useEffect } from 'react';
import reportApi from '../../api/reportApi';
import Loader from '../../components/Loader/Loader';
import Button from '../../components/Buttons/Button';
import DataTable from '../../components/Tables/DataTable';
import StatusBadge from '../../components/Tables/StatusBadge';
import Pagination from '../../components/Pagination/Pagination';
import { showSuccess, showError } from '../../components/Notification/NotificationToast';

const ProcurementReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    department: '',
    startDate: '',
    endDate: '',
    status: '',
    intentType: '',
  });

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 10 };
      if (filters.department) params.department = filters.department;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (filters.intentType) params.intentType = filters.intentType;

      const response = await reportApi.getProcurementReport(params);
      setData(response.data?.intents || response.data?.data || []);
      setTotalPages(response.data?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch procurement report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchData();
  };

  const handleExport = async (format) => {
    try {
      const response = await reportApi.exportReport('procurement', { ...filters, format });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `procurement-report.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSuccess(`Report exported as ${format}`);
    } catch (err) {
      showError('Failed to export report');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const columns = [
    { key: 'intentId', label: 'Intent ID' },
    { key: 'title', label: 'Title' },
    { key: 'requester', label: 'Requester' },
    { key: 'department', label: 'Department' },
    { key: 'supplier', label: 'Supplier' },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'date',
      label: 'Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
  ];

  const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement Report</h1>
          <p className="mt-1 text-sm text-gray-600">Detailed procurement data and analytics.</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => handleExport('PDF')}>Export PDF</Button>
          <Button variant="outline" onClick={() => handleExport('Excel')}>Export Excel</Button>
          <Button variant="outline" onClick={() => handleExport('CSV')}>Export CSV</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              <option value="IT">IT</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intent Type</label>
            <select
              name="intentType"
              value={filters.intentType}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="goods">Goods</option>
              <option value="services">Services</option>
              <option value="works">Works</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Procurement Details</h3>
        </div>
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No procurement data found." />
        </div>
        {data.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total ({data.length} records)</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

export default ProcurementReport;
