import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import intentApi from '../../api/intentApi';
import { Button, FormTextArea, Loader } from '../../components';

const INTENT_STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_MANAGER_APPROVAL: 'Pending Manager Approval',
  PENDING_ADMIN_APPROVAL: 'Pending Admin Approval',
  PO_APPROVED: 'PO Approved',
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

const ApproveIntent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intent, setIntent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchIntent = async () => {
      try {
        const response = await intentApi.getIntentById(id);
        setIntent(response.data?.data?.intent || response.data?.intent || response.data);
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Failed to load intent';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchIntent();
  }, [id]);

  const handleApprove = async () => {
    setApproving(true);
    setError('');
    try {
      let response;
      if (intent.status === 'PENDING_ADMIN_APPROVAL') {
        response = await intentApi.updateIntent(id, {
          status: 'PO_APPROVED',
          adminApproval: {
            status: 'APPROVED',
            remarks: remarks || 'Approved by Admin',
            approvedAt: new Date().toISOString(),
          },
        });
      } else {
        response = await intentApi.updateIntent(id, {
          status: 'PENDING_QUOTATION',
          managerApproval: {
            status: 'APPROVED',
            remarks: remarks || 'Approved by Manager',
            approvedAt: new Date().toISOString(),
          },
        });
      }

      setSuccess(true);
      toast.success('Intent approved successfully!');
      
      setTimeout(() => {
        navigate('/manager/approvals');
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to approve intent';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setApproving(false);
    }
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) return <Loader message="Loading intent details..." />;

  if (error && !intent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/manager/approvals')}>
            Back to Approvals
          </Button>
        </div>
      </div>
    );
  }

  if (!intent) return null;

  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-900 mb-2">Approval Successful!</h2>
          <p className="text-green-700 mb-6">Intent has been approved successfully. Redirecting...</p>
          <div className="animate-pulse text-green-600">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/manager/approvals" className="text-sm text-blue-600 hover:text-blue-500 flex items-center mb-4">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Approvals
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Approve Intent</h1>
        <p className="mt-1 text-sm text-gray-500">Review and approve intent {intent.intentId}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Intent Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Intent ID</p>
              <p className="text-sm font-medium text-gray-900">{intent.intentId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Title</p>
              <p className="text-sm font-medium text-gray-900">{intent.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Requester</p>
              <p className="text-sm font-medium text-gray-900">{intent.requester?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="text-sm font-medium text-gray-900">{intent.department?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Priority</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE_COLORS[intent.priority] || 'bg-gray-100 text-gray-800'}`}>
                {PRIORITY_LABELS[intent.priority] || intent.priority}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[intent.status] || 'bg-gray-100 text-gray-800'}`}>
                {INTENT_STATUS_LABELS[intent.status] || intent.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date Created</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(intent.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estimated Cost</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(intent.estimatedCost)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {intent.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatCurrency(item.estimatedUnitPrice)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency((item.quantity || 0) * (item.estimatedUnitPrice || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Total:</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(intent.estimatedCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Remarks</h2>
          <FormTextArea
            name="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional: Add remarks for this approval..."
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate('/manager/approvals')} disabled={approving}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleApprove} loading={approving}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirm Approval
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApproveIntent;
