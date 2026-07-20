import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useNavPrefix from '../../hooks/useNavPrefix';

export default function SamplePO() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const navPrefix = useNavPrefix();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [notifySuccess, setNotifySuccess] = useState('');
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  useEffect(() => {
    fetchPO();
  }, [id]);

  const fetchPO = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrderApi.getPOById(id);
      setPo(response.data?.data || response.data);
    } catch (err) {
      setError(err.message || 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this Sample Purchase Order?')) return;
    try {
      setActionLoading(true);
      await purchaseOrderApi.approvePO(id, 'Approved by admin');
      await fetchPO();
    } catch (err) {
      alert('Failed to approve: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (reason === null) return;
    try {
      setActionLoading(true);
      await purchaseOrderApi.rejectPO(id, reason);
      await fetchPO();
    } catch (err) {
      alert('Failed to reject: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateOriginal = async () => {
    if (!window.confirm('Generate Original PO from this approved Sample PO?')) return;
    try {
      setActionLoading(true);
      const response = await purchaseOrderApi.generateOriginal(id);
      const data = response.data?.data || response.data;
      alert('Original PO generated: ' + (data?.purchaseOrder?.poNumber || 'Created'));
      // optionally navigate to original PO page
      if (data?.purchaseOrder?._id) navigate(`/admin/purchase-orders/${data.purchaseOrder._id}`);
    } catch (err) {
      alert('Failed to generate original PO: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await purchaseOrderApi.downloadPDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PO-${po.poNumber || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSendToAdmin = async () => {
    try {
      setSendLoading(true);
      setSendSuccess('');
      const response = await purchaseOrderApi.sendSampleToAdmin(id);
      const data = response.data || {};
      if (data.success) {
        setSendSuccess('Sample PO sent to admin successfully!');
        await fetchPO();
      } else {
        alert('Failed to send: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to send to admin: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    } finally {
      setSendLoading(false);
    }
  };

  const handleNotifyStoreManager = async () => {
    try {
      setNotifyLoading(true);
      setNotifySuccess('');
      const response = await purchaseOrderApi.notifyStoreManager(id);
      const data = response.data || {};
      if (data.success) {
        setNotifySuccess('Store managers have been notified for GRN processing.');
      } else {
        alert('Failed to notify store managers: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to notify store managers: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    } finally {
      setNotifyLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SAMPLE: 'bg-blue-100 text-blue-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-red-100 text-red-800',
      SENT: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      sent: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-2 text-sm text-red-600 underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!po) return null;

  const subtotal = po.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) || 0;
  const taxRate = po.taxRate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sample Purchase Order</h1>
          <p className="text-sm text-gray-500 mt-1">Preview before sending to supplier</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(po.status)}`}>
            {po.status?.charAt(0).toUpperCase() + po.status?.slice(1)}
          </span>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* PO Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">PO Number:</span>
                  <span className="font-medium">{po.poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Intent Request ID:</span>
                  <span className="font-medium">{po.intent?.intentId || po.intentId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">{new Date(po.createdAt || po.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium">Sample</span>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Supplier Name:</span>
                  <span className="font-medium">{po.supplier?.companyName || po.supplier?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact Person:</span>
                  <span className="font-medium">{po.supplier?.contactPerson}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium">{po.supplier?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-medium">{po.supplier?.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Intent Request Details */}
        {po.intent && (
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Intent Request Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Title:</span>
                <span className="ml-2 font-medium">{po.intent.title || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Requester:</span>
                <span className="ml-2 font-medium">{po.intent.requester?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Department:</span>
                <span className="ml-2 font-medium">{po.intent.department?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Estimated Cost:</span>
                <span className="ml-2 font-medium">${po.intent.estimatedCost?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Item Name</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Unit Price</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items?.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500">{index + 1}</td>
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">${item.unitPrice?.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">${(item.quantity * item.unitPrice)?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="p-6 border-b border-gray-200 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax ({taxRate}%):</span>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-900 font-semibold">Grand Total:</span>
              <span className="text-gray-900 font-bold text-lg">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery & Payment */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Delivery Information</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Delivery Date:</span> {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : 'TBD'}</p>
                <p><span className="font-medium">Delivery Address:</span> {po.deliveryAddress || 'Not specified'}</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment Terms</h3>
              <p className="text-sm text-gray-600">{po.paymentTerms || 'Net 30 days from invoice date'}</p>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {po.specialInstructions && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Special Instructions</h3>
            <p className="text-sm text-gray-600">{po.specialInstructions}</p>
          </div>
        )}

        {/* Action Buttons */}
        {isAdmin && (po.status === 'pending' || po.status === 'sent' || po.status === 'PENDING' || po.status === 'SAMPLE' || po.status === 'APPROVED') && (
          <div className="p-6 flex justify-end gap-3">
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? 'Processing...' : 'Reject'}
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? 'Processing...' : 'Approve'}
            </button>
            {/* Generate Original PO (Admin after approval) */}
            {po.type === 'SAMPLE' && po.adminApproval?.status === 'APPROVED' && (
              <button
                onClick={handleGenerateOriginal}
                disabled={actionLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Processing...' : 'Generate Original PO'}
              </button>
            )}
          </div>
        )}

        {/* Send to Admin Button (Manager only) */}
        {isManager && (po.status === 'SAMPLE' || po.status === 'PENDING') && (
          <div className="p-6 border-t border-gray-200">
            {sendSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{sendSuccess}</p>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleSendToAdmin}
                disabled={sendLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {sendLoading ? 'Sending...' : 'Send Sample PO to Admin'}
              </button>
            </div>
          </div>
        )}

        {isAdmin && po.adminApproval?.status === 'APPROVED' && (
          <div className="p-6 border-t border-gray-200">
            {notifySuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{notifySuccess}</p>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleNotifyStoreManager}
                disabled={notifyLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {notifyLoading ? 'Notifying...' : 'Notify Store Manager for GRN'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
