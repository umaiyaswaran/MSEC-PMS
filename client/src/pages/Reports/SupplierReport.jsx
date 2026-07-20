import { useState, useEffect } from 'react';
import reportApi from '../../api/reportApi';
import Loader from '../../components/Loader/Loader';
import Button from '../../components/Buttons/Button';
import DataTable from '../../components/Tables/DataTable';
import Pagination from '../../components/Pagination/Pagination';
import { showSuccess, showError } from '../../components/Notification/NotificationToast';

const SupplierReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'totalSpend', direction: 'desc' });
  const [filters, setFilters] = useState({
    supplier: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 10 };
      if (filters.supplier) params.supplier = filters.supplier;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await reportApi.getSupplierReport(params);
      setData(response.data?.suppliers || response.data?.data || []);
      setTotalPages(response.data?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch supplier report:', err);
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

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = [...data].sort((a, b) => {
    if (sortConfig.direction === 'asc') {
      return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
    }
    return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
  });

  const handleExport = async (format) => {
    try {
      const response = await reportApi.exportReport('supplier', { ...filters, format });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `supplier-report.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSuccess(`Report exported as ${format}`);
    } catch (err) {
      showError('Failed to export report');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const columns = [
    {
      key: 'name',
      label: (
        <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-blue-600">
          Supplier Name <span className="text-xs">{getSortIcon('name')}</span>
        </button>
      ),
    },
    {
      key: 'totalOrders',
      label: (
        <button onClick={() => handleSort('totalOrders')} className="flex items-center gap-1 hover:text-blue-600">
          Total Orders <span className="text-xs">{getSortIcon('totalOrders')}</span>
        </button>
      ),
    },
    {
      key: 'totalSpend',
      label: (
        <button onClick={() => handleSort('totalSpend')} className="flex items-center gap-1 hover:text-blue-600">
          Total Spend <span className="text-xs">{getSortIcon('totalSpend')}</span>
        </button>
      ),
      render: (value) => formatCurrency(value),
    },
    {
      key: 'avgDeliveryDays',
      label: (
        <button onClick={() => handleSort('avgDeliveryDays')} className="flex items-center gap-1 hover:text-blue-600">
          Avg Delivery Days <span className="text-xs">{getSortIcon('avgDeliveryDays')}</span>
        </button>
      ),
      render: (value) => `${value || 0} days`,
    },
    {
      key: 'rating',
      label: (
        <button onClick={() => handleSort('rating')} className="flex items-center gap-1 hover:text-blue-600">
          Rating <span className="text-xs">{getSortIcon('rating')}</span>
        </button>
      ),
      render: (value) => (
        <div className="flex items-center">
          <span className="text-yellow-500 mr-1">★</span>
          <span className="text-sm font-medium">{(value || 0).toFixed(1)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Report</h1>
          <p className="mt-1 text-sm text-gray-600">Supplier performance and spending analytics.</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => handleExport('PDF')}>Export PDF</Button>
          <Button variant="outline" onClick={() => handleExport('Excel')}>Export Excel</Button>
          <Button variant="outline" onClick={() => handleExport('CSV')}>Export CSV</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              name="supplier"
              value={filters.supplier}
              onChange={handleFilterChange}
              placeholder="Search supplier..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
        </div>
        <div className="mt-4">
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Supplier Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={sortedData} loading={loading} emptyMessage="No supplier data found." />
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

export default SupplierReport;
