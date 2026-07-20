import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function OriginalPO() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');

  useEffect(() => {
    fetchPO();
  }, [id]);

  const fetchPO = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrderApi.getPOById(id);
      const wrapper = response.data?.data || response.data;
      setPo(wrapper?.purchaseOrder || wrapper);
    } catch (err) {
      setError(err.message || 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyStoreManager = async () => {
    try {
      setNotifyLoading(true);
      setNotifyMsg('');
      const response = await purchaseOrderApi.notifyStoreManager(id);
      setNotifyMsg(response.data?.message || 'Store managers notified successfully');
    } catch (err) {
      setNotifyMsg(err.response?.data?.message || 'Failed to notify store manager');
    } finally {
      setNotifyLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
      received: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSentStatusIcon = (status) => {
    switch (status) {
      case 'not_sent':
        return { color: 'text-gray-400', label: 'Not Sent' };
      case 'sent':
        return { color: 'text-blue-600', label: 'Sent to Supplier' };
      case 'acknowledged':
        return { color: 'text-green-600', label: 'Acknowledged' };
      default:
        return { color: 'text-gray-400', label: 'Unknown' };
    }
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
  const sentStatus = getSentStatusIcon(po.sentStatus);

  return (
    <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Original Purchase Order</h1>
          <p className="text-sm text-gray-500 mt-1">Official PO sent to supplier</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(po.status)}`}>
            {po.status?.charAt(0).toUpperCase() + po.status?.slice(1)}
          </span>
          <span className={`text-sm font-medium ${sentStatus.color}`}>
            {sentStatus.label}
          </span>
          {user?.role === 'admin' && po.status === 'APPROVED' && !notifyMsg && (
            <button
              onClick={handleNotifyStoreManager}
              disabled={notifyLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {notifyLoading ? 'Sending...' : 'Send to Store Manager'}
            </button>
          )}
          {notifyMsg && (
            <span className="text-sm text-green-700">{notifyMsg}</span>
          )}
          <button onClick={handleDownloadPDF} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none">
        {/* PO Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">MSEC PMS</h2>
            <h3 className="text-lg font-semibold text-gray-700">PURCHASE ORDER</h3>
            <p className="text-sm text-gray-500">Official Document</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Details</h3>
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
                  <span className="font-medium">Original</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Supplier Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
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
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Intent Request Details</h3>
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
                <span className="ml-2 font-medium">₹{po.intent.estimatedCost?.toLocaleString('en-IN') || '0'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Items Ordered</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Item Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
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
                    <td className="py-3 px-4 text-gray-500">{item.description || '-'}</td>
                    <td className="py-3 px-4 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">₹{item.unitPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">₹{(item.quantity * item.unitPrice)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="p-6 border-b border-gray-200 flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-medium">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax ({taxRate}%):</span>
              <span className="font-medium">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-900 font-semibold">Grand Total:</span>
              <span className="text-gray-900 font-bold text-lg">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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

        {/* Terms and Conditions */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms and Conditions</h3>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
            <li>This Purchase Order is subject to the supplier's acceptance and confirmation.</li>
            <li>All items must be delivered in accordance with the specifications and quantities listed above.</li>
            <li>Payment will be made within the agreed payment terms upon receipt of a valid invoice.</li>
            <li>Any discrepancies in delivery must be reported within 48 hours of receipt.</li>
            <li>The supplier is responsible for ensuring all items meet quality standards.</li>
          </ol>
        </div>

        {/* Signature Lines */}
        <div className="p-6 grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-8">Authorized Signature (Buyer)</p>
            <div className="border-t border-gray-300 pt-2">
              <p className="text-xs text-gray-500">Name: ____________________________</p>
              <p className="text-xs text-gray-500 mt-1">Date: ____________________________</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 mb-8">Accepted by (Supplier)</p>
            <div className="border-t border-gray-300 pt-2">
              <p className="text-xs text-gray-500">Name: ____________________________</p>
              <p className="text-xs text-gray-500 mt-1">Signature: ____________________________</p>
              <p className="text-xs text-gray-500 mt-1">Date: ____________________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
