import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import intentApi from '../../api/intentApi';
import { Button, Pagination } from '../../components';

const INTENT_STATUS_LABELS = {
  PENDING_MANAGER_APPROVAL: 'Pending Manager Approval',
  PENDING_ADMIN_APPROVAL: 'Pending Admin Approval',
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
  PENDING_MANAGER_APPROVAL: 'bg-yellow-100 text-yellow-800',
  PENDING_ADMIN_APPROVAL: 'bg-purple-100 text-purple-800',
};

const PendingApproval = ({ statusFilter = 'PENDING_MANAGER_APPROVAL' }) => {
  const navigate = useNavigate();
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchPendingIntents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await intentApi.getIntents({
        page: currentPage,
        limit: 10,
        status: statusFilter,
      });

      const intentsList = data.intents || data.data || data || [];
      const pagination = data.pagination || {};

      setIntents(Array.isArray(intentsList) ? intentsList : []);
      setTotalPages(pagination.totalPages || Math.ceil((pagination.total || intentsList.length) / 10));
      setTotalItems(pagination.total || intentsList.length);
    } catch (err) {
      console.error('Failed to fetch pending intents:', err);
      setIntents([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchPendingIntents();
  }, [fetchPendingIntents]);

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

  const pageTitle = statusFilter === 'PENDING_ADMIN_APPROVAL'
    ? 'Pending Admin Approval'
    : 'Pending Manager Approval';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {totalItems} intent{totalItems !== 1 ? 's' : ''} awaiting your approval
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intent ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Loading pending intents...</p>
                    </div>
                  </td>
                </tr>
              ) : intents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No pending intents for approval</p>
                  </td>
                </tr>
              ) : (
                intents.map((intent) => (
                  <tr
                    key={intent._id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/manager/approvals/${intent._id}/approve`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">{intent.intentId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{intent.title}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{intent.requester?.name || '-'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{intent.department?.name || '-'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(intent.estimatedCost)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE_COLORS[intent.priority] || 'bg-gray-100 text-gray-800'}`}>
                        {PRIORITY_LABELS[intent.priority] || intent.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{formatDate(intent.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => navigate(`/manager/approvals/${intent._id}/approve`)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => navigate(`/manager/approvals/${intent._id}/reject`)}
                        >
                          Reject
                        </Button>
                      </div>
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

export default PendingApproval;
