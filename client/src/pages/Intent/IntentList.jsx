import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import intentApi from '../../api/intentApi';
import { Button, Pagination, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import useNavPrefix from '../../hooks/useNavPrefix';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_MANAGER_APPROVAL', label: 'Pending Manager Approval' },
  { value: 'REJECTED_BY_MANAGER', label: 'Rejected by Manager' },
  { value: 'PENDING_QUOTATION', label: 'Pending Quotation' },
  { value: 'PENDING_ADMIN_APPROVAL', label: 'Pending Admin Approval' },
  { value: 'PO_APPROVED', label: 'PO Approved' },
  { value: 'DELIVERY_PENDING', label: 'Delivery Pending' },
  { value: 'FULL_DELIVERY', label: 'Full Delivery' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'All Departments' },
  { value: '6650f1a1b2c3d4e5f6a7b8c9', label: 'IT Department' },
  { value: '6650f1a1b2c3d4e5f6a7b8ca', label: 'Finance' },
  { value: '6650f1a1b2c3d4e5f6a7b8cb', label: 'Operations' },
  { value: '6650f1a1b2c3d4e5f6a7b8cc', label: 'Human Resources' },
  { value: '6650f1a1b2c3d4e5f6a7b8cd', label: 'Marketing' },
];

const INTENT_STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_MANAGER_APPROVAL: 'Pending Mgr Approval',
  REJECTED_BY_MANAGER: 'Rejected by Mgr',
  PENDING_QUOTATION: 'Pending Quotation',
  QUOTATION_COLLECTED: 'Quotation Collected',
  PENDING_PO: 'Pending PO',
  SAMPLE_PO_CREATED: 'Sample PO',
  PENDING_ADMIN_APPROVAL: 'Pending Admin Approval',
  REJECTED_BY_ADMIN: 'Rejected by Admin',
  PO_APPROVED: 'PO Approved',
  PO_SENT: 'PO Sent',
  DELIVERY_PENDING: 'Delivery Pending',
  PARTIAL_DELIVERY: 'Partial Delivery',
  FULL_DELIVERY: 'Full Delivery',
  INVOICE_UPLOADED: 'Invoice Uploaded',
  PAYMENT_PENDING: 'Payment Pending',
  PAYMENT_COMPLETED: 'Payment Completed',
  CLOSED: 'Closed',
};

const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const PRIORITY_BADGE_COLORS = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

const STATUS_BADGE_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_MANAGER_APPROVAL: 'bg-yellow-100 text-yellow-800',
  REJECTED_BY_MANAGER: 'bg-red-100 text-red-800',
  PENDING_QUOTATION: 'bg-blue-100 text-blue-800',
  PENDING_ADMIN_APPROVAL: 'bg-purple-100 text-purple-800',
  PO_APPROVED: 'bg-green-100 text-green-800',
  DELIVERY_PENDING: 'bg-indigo-100 text-indigo-800',
  FULL_DELIVERY: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const INTENT_CATEGORY_LABELS = {
  GOODS: 'Goods',
  SERVICE: 'Service',
  SUB_CONTRACTOR: 'Sub Contractor',
};

const IntentList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const navPrefix = useNavPrefix();
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    department: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  const [showFilters, setShowFilters] = useState(false);

  const fetchIntents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
      };

      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      if (filters.department) params.department = filters.department;
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const { data } = await intentApi.getIntents(params);

      const intentsList = data.intents || data.data || data || [];
      const pagination = data.pagination || {};

      setIntents(Array.isArray(intentsList) ? intentsList : []);
      setTotalPages(pagination.totalPages || Math.ceil((pagination.total || intentsList.length) / 10));
      setTotalItems(pagination.total || intentsList.length);
    } catch (err) {
      console.error('Failed to fetch intents:', err);
      setIntents([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchIntents();
  }, [fetchIntents]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchIntents();
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      category: '',
      department: '',
      search: '',
      startDate: '',
      endDate: '',
    });
    setCurrentPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intent Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalItems} intent{totalItems !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`${navPrefix}/intents/create`)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Intent
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                value={filters.priority}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="GOODS">Goods</option>
                <option value="SERVICE">Service</option>
                <option value="SUB_CONTRACTOR">Sub Contractor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DEPARTMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                  placeholder="Search intents..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button variant="primary" size="sm" onClick={handleSearch}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                min={filters.startDate || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intent ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                {user?.role !== 'user' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={user?.role !== 'user' ? 9 : 8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Loading intents...</p>
                    </div>
                  </td>
                </tr>
              ) : intents.length === 0 ? (
                <tr>
                  <td colSpan={user?.role !== 'user' ? 9 : 8} className="px-4 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No intents found</p>
                  </td>
                </tr>
              ) : (
                intents.map((intent) => (
                  <tr
                    key={intent._id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`${navPrefix}/intents/${intent._id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">{intent.intentId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{intent.title}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{INTENT_CATEGORY_LABELS[intent.category] || '-'}</span>
                    </td>
                    {user?.role !== 'user' && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{intent.requester?.name || '-'}</span>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{intent.department?.name || '-'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE_COLORS[intent.priority] || 'bg-gray-100 text-gray-800'}`}>
                        {PRIORITY_LABELS[intent.priority] || intent.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[intent.status] || 'bg-gray-100 text-gray-800'}`}>
                        {INTENT_STATUS_LABELS[intent.status] || intent.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{formatDate(intent.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`${navPrefix}/intents/${intent._id}`)}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default IntentList;
