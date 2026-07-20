import { useState, useEffect } from 'react';
import reportApi from '../../api/reportApi';
import Loader from '../../components/Loader/Loader';
import Button from '../../components/Buttons/Button';
import DataTable from '../../components/Tables/DataTable';
import StatusBadge from '../../components/Tables/StatusBadge';
import Pagination from '../../components/Pagination/Pagination';
import { showSuccess, showError } from '../../components/Notification/NotificationToast';

const InvoiceReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    paymentStatus: '',
  });

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 10 };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;

      const response = await reportApi.getInvoiceReport(params);
      setData(response.data?.invoices || response.data?.data || []);
      setTotalPages(response.data?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch invoice report:', err);
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
      const response = await reportApi.exportReport('invoice', { ...filters, format });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-report.${format.toLowerCase()}`);
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

  const summary = {
    totalInvoiced: data.reduce((sum, item) => sum + (item.total || 0), 0),
    totalPaid: data
      .filter((item) => item.paymentStatus === 'paid')
      .reduce((sum, item) => sum + (item.total || 0), 0),
    totalPending: data
      .filter((item) => item.paymentStatus === 'pending')
      .reduce((sum, item) => sum + (item.total || 0), 0),
  };

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'supplier', label: 'Supplier' },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'tax',
      label: 'Tax',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'total',
      label: 'Total',
      render: (value) => <span className="font-semibold">{formatCurrency(value)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'date',
      label: 'Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Report</h1>
          <p className="mt-1 text-sm text-gray-600">Invoice tracking and payment status overview.</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => handleExport('PDF')}>Export PDF</Button>
          <Button variant="outline" onClick={() => handleExport('Excel')}>Export Excel</Button>
          <Button variant="outline" onClick={() => handleExport('CSV')}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Invoiced</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.totalPending)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>
        </div>
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No invoice data found." />
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

export default InvoiceReport;
