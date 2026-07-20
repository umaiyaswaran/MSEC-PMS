import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import intentApi from '../../api/intentApi';
import { Button, Loader, StatusBadge, ConfirmDialog } from '../../components';
import { useAuth } from '../../context/AuthContext';
import purchaseOrderApi from '../../api/purchaseOrderApi';
import IntentTimeline from './IntentTimeline';
import useNavPrefix from '../../hooks/useNavPrefix';

const INTENT_STATUSES_MAP = {
  DRAFT: 'DRAFT',
  PENDING_MANAGER_APPROVAL: 'PENDING_MANAGER_APPROVAL',
  REJECTED_BY_MANAGER: 'REJECTED_BY_MANAGER',
  PENDING_QUOTATION: 'PENDING_QUOTATION',
  PENDING_ADMIN_APPROVAL: 'PENDING_ADMIN_APPROVAL',
  PO_APPROVED: 'PO_APPROVED',
};

const INTENT_STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_MANAGER_APPROVAL: 'Pending Manager Approval',
  REJECTED_BY_MANAGER: 'Rejected by Manager',
  PENDING_QUOTATION: 'Pending Quotation',
  QUOTATION_COLLECTED: 'Quotation Collected',
  PENDING_PO: 'Pending PO',
  SAMPLE_PO_CREATED: 'Sample PO Created',
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

const INTENT_CATEGORY_LABELS = {
  GOODS: 'Goods',
  SERVICE: 'Service',
  SUB_CONTRACTOR: 'Sub Contractor',
};

const STATUS_BADGE_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_MANAGER_APPROVAL: 'bg-yellow-100 text-yellow-800',
  REJECTED_BY_MANAGER: 'bg-red-100 text-red-800',
  PENDING_QUOTATION: 'bg-blue-100 text-blue-800',
  PENDING_ADMIN_APPROVAL: 'bg-purple-100 text-purple-800',
  PO_APPROVED: 'bg-green-100 text-green-800',
};

const PRIORITY_BADGE_COLORS = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const IntentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const navPrefix = useNavPrefix();
  const [intent, setIntent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchIntent = async () => {
      try {
        const response = await intentApi.getIntentById(id);
        setIntent(response.data?.data?.intent || response.data?.intent || response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load intent');
      } finally {
        setLoading(false);
      }
    };

    fetchIntent();
  }, [id]);

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const response = await intentApi.submitIntent(id);
      setIntent(response.data?.data?.intent || response.data?.intent || response.data);
      setShowSubmitDialog(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit intent');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const handleCreateSamplePO = async () => {
    if (!intent?.selectedSupplier) {
      setError('Please select a supplier before creating a sample PO.');
      return;
    }

    setActionLoading(true);
    try {
      const response = await purchaseOrderApi.createSample({
        intentId: id,
        supplierId: intent.selectedSupplier?._id || intent.selectedSupplier,
      });
      const po = response.data?.data || response.data?.purchaseOrder || response.data;
      if (po?._id) {
        const destination = user?.role === 'admin'
          ? `/admin/purchase-orders/${po._id}/approve`
          : `${navPrefix}/purchase-orders/${po._id}`;
        navigate(destination);
      } else {
        setError('Sample PO created but the details could not be opened.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create sample purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canEdit = intent?.status === 'DRAFT' && (user?.role === 'admin' || user?._id === intent?.requester?._id);
  const canSubmit = intent?.status === 'DRAFT' && user?._id === intent?.requester?._id;
  const canManagerApprove = intent?.status === 'PENDING_MANAGER_APPROVAL' && user?.role === 'manager';
  const canAdminApprove = intent?.status === 'PENDING_ADMIN_APPROVAL' && user?.role === 'admin';
  const canUploadQuotation = intent?.status === 'PENDING_QUOTATION' && (user?.role === 'manager' || user?.role === 'admin');
  const canCreatePO = intent?.status === 'PENDING_PO' && (user?.role === 'manager' || user?.role === 'admin');
  const canCreateSamplePO = ['PENDING_PO', 'QUOTATION_COLLECTED', 'SAMPLE_PO_CREATED'].includes(intent?.status) && (user?.role === 'manager' || user?.role === 'admin') && !!intent?.selectedSupplier;
  const canCreateOriginalPO = intent?.status === 'PO_APPROVED' && user?.role === 'admin';
  const canUploadDelivery = ['PO_SENT', 'DELIVERY_PENDING', 'PARTIAL_DELIVERY'].includes(intent?.status) && user?.role === 'admin';
  const canUploadInvoice = ['FULL_DELIVERY', 'DELIVERY_PENDING'].includes(intent?.status) && user?.role === 'admin';

  if (loading) return <Loader message="Loading intent details..." />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate(`${navPrefix}/intents`)}>
            Back to Intents
          </Button>
        </div>
      </div>
    );
  }

  if (!intent) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to={`${navPrefix}/intents`} className="text-sm text-blue-600 hover:text-blue-500 flex items-center mb-4">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Intents
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{intent.intentId}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[intent.status] || 'bg-gray-100 text-gray-800'}`}>
                {INTENT_STATUS_LABELS[intent.status] || intent.status}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE_COLORS[intent.priority] || 'bg-gray-100 text-gray-800'}`}>
                {PRIORITY_LABELS[intent.priority] || intent.priority}
              </span>
            </div>
            <h2 className="mt-2 text-lg text-gray-600">{intent.title}</h2>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => navigate(`${navPrefix}/intents/${id}/edit`)}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            )}
            {canSubmit && (
              <Button variant="primary" size="sm" onClick={() => setShowSubmitDialog(true)}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Submit for Approval
              </Button>
            )}
            {canManagerApprove && (
              <Button variant="success" size="sm" onClick={() => navigate(`/manager/approvals/${id}/approve`)}>
                Approve
              </Button>
            )}
            {canManagerApprove && (
              <Button variant="danger" size="sm" onClick={() => navigate(`/manager/approvals/${id}/reject`)}>
                Reject
              </Button>
            )}
            {canAdminApprove && intent.purchaseOrder && (
              <Button variant="success" size="sm" onClick={() => navigate(`/admin/purchase-orders/${intent.purchaseOrder?._id || intent.purchaseOrder}/approve`)}>
                Approve PO
              </Button>
            )}
            {canUploadQuotation && (
              <Button variant="primary" size="sm" onClick={() => navigate(`/manager/quotations/upload/${id}`)}>
                Upload Quotation
              </Button>
            )}
            {canCreatePO && (
              <Button variant="primary" size="sm" onClick={() => navigate(`/manager/quotations/compare/${id}`)}>
                Compare Quotations
              </Button>
            )}
            {canCreateSamplePO && (
              <Button variant="secondary" size="sm" onClick={handleCreateSamplePO} loading={actionLoading}>
                Create Sample PO
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Requester Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">{intent.requester?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{intent.requester?.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="text-sm font-medium text-gray-900">{intent.department?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date Created</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(intent.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="text-sm font-medium text-gray-900">{INTENT_CATEGORY_LABELS[intent.category] || intent.category || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{intent.description}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {intent.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.unit || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(item.estimatedUnitPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency((item.quantity || 0) * (item.estimatedUnitPrice || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan="5" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      Estimated Total Cost:
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(intent.estimatedCost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {intent.documents?.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
              <ul className="space-y-2">
                {intent.documents.map((doc, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(doc.uploadedAt)}</p>
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {intent.managerApproval?.status && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    intent.managerApproval.status === 'APPROVED' ? 'bg-green-100' :
                    intent.managerApproval.status === 'REJECTED' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    {intent.managerApproval.status === 'APPROVED' ? (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : intent.managerApproval.status === 'REJECTED' ? (
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Manager Approval</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        intent.managerApproval.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        intent.managerApproval.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {intent.managerApproval.status}
                      </span>
                    </div>
                    {intent.managerApproval.approvedBy && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        By {intent.managerApproval.approvedBy.name || intent.managerApproval.approvedBy}
                      </p>
                    )}
                    {intent.managerApproval.approvedAt && (
                      <p className="text-xs text-gray-500">{formatDateTime(intent.managerApproval.approvedAt)}</p>
                    )}
                    {intent.managerApproval.remarks && (
                      <p className="text-xs text-gray-600 mt-1 italic">{intent.managerApproval.remarks}</p>
                    )}
                  </div>
                </div>

                {intent.adminApproval?.status && (
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      intent.adminApproval.status === 'APPROVED' ? 'bg-green-100' :
                      intent.adminApproval.status === 'REJECTED' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      {intent.adminApproval.status === 'APPROVED' ? (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : intent.adminApproval.status === 'REJECTED' ? (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Admin Approval</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          intent.adminApproval.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          intent.adminApproval.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {intent.adminApproval.status}
                        </span>
                      </div>
                      {intent.adminApproval.approvedBy && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          By {intent.adminApproval.approvedBy.name || intent.adminApproval.approvedBy}
                        </p>
                      )}
                      {intent.adminApproval.approvedAt && (
                        <p className="text-xs text-gray-500">{formatDateTime(intent.adminApproval.approvedAt)}</p>
                      )}
                      {intent.adminApproval.remarks && (
                        <p className="text-xs text-gray-600 mt-1 italic">{intent.adminApproval.remarks}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>
                <span className="font-medium text-gray-900">{intent.items?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Estimated Cost</span>
                <span className="font-bold text-gray-900">{formatCurrency(intent.estimatedCost)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Timeline</h3>
            <IntentTimeline
              currentStatus={intent.status}
              statusHistory={intent.statusHistory}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        onConfirm={handleSubmit}
        title="Submit for Approval"
        message="Are you sure you want to submit this intent for manager approval?"
        confirmText="Submit"
        confirmVariant="primary"
        loading={actionLoading}
      />
    </div>
  );
};

export default IntentDetails;
