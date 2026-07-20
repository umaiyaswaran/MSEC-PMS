import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/api';

export default function PrintPO() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPO();
  }, [id]);

  const fetchPO = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrderApi.getPOById(id);
      // Normalize server response shapes: some endpoints return { data: { purchaseOrder } }
      const payload = response?.data;
      const poData = payload && (payload.data?.purchaseOrder || payload.purchaseOrder || payload.data || payload);
      setPo(poData);
    } catch (err) {
      setError(err.message || 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateSafe = (d) => {
    try {
      const date = d ? new Date(d) : null;
      if (!date || isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString();
    } catch (e) {
      return 'N/A';
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

  const subtotal = po.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) || 0;
  const taxRate = po.taxRate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - hidden when printing */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 z-10 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print PO
        </button>
      </div>

      {/* Print Content */}
      <div className="print-document max-w-4xl mx-auto pt-20 pb-12 px-8">
        {/* Company Header */}
        <div className="text-center mb-8 border-b-2 border-gray-900 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-wide">PROCUREMENT DEPARTMENT</h1>
          <p className="text-sm text-gray-600 mt-1">Purchase Order</p>
        </div>

        {/* PO Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 border-2 border-gray-900 inline-block px-8 py-2">
            PURCHASE ORDER
          </h2>
        </div>

        {/* PO Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Supplier Details
            </h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{po.supplier?.companyName || po.supplier?.name || 'Supplier'}</p>
                <p>{po.supplier?.contactPerson || ''}</p>
                <p>{po.supplier?.email || ''}</p>
                <p>{po.supplier?.phone || ''}</p>
                <p>
                  {po.supplier?.address
                    ? (typeof po.supplier.address === 'string'
                        ? po.supplier.address
                        : [po.supplier.address.street, po.supplier.address.city, po.supplier.address.state, po.supplier.address.country]
                            .filter(Boolean)
                            .join(', '))
                    : ''}
                </p>
              </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Order Details
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">PO Number:</span>
                <span className="font-bold">{po.poNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Intent ID:</span>
                <span>{po.intent?.intentId || po.intentId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{formatDateSafe(po.createdAt || po.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="uppercase">{po.type}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase border-b border-gray-300 pb-1">
            Delivery Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Delivery Date:</span>{' '}
              <span className="font-medium">{po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : 'TBD'}</span>
            </div>
            <div>
              <span className="text-gray-600">Delivery Address:</span>{' '}
              <span className="font-medium">{po.deliveryAddress || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
            Items Ordered
          </h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 py-2 px-3 text-left font-bold">No.</th>
                <th className="border border-gray-300 py-2 px-3 text-left font-bold">Description</th>
                <th className="border border-gray-300 py-2 px-3 text-right font-bold">Qty</th>
                <th className="border border-gray-300 py-2 px-3 text-right font-bold">Unit Price</th>
                <th className="border border-gray-300 py-2 px-3 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {po.items?.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 py-2 px-3">{index + 1}</td>
                  <td className="border border-gray-300 py-2 px-3">{item.name || item.description || '—'}</td>
                  <td className="border border-gray-300 py-2 px-3 text-right">{(item.quantity || 0).toString()}</td>
                  <td className="border border-gray-300 py-2 px-3 text-right">${(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="border border-gray-300 py-2 px-3 text-right">${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">Tax ({taxRate}%):</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-900 mt-1">
              <span className="font-bold">Grand Total:</span>
              <span className="font-bold text-lg">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase border-b border-gray-300 pb-1">
            Payment Terms
          </h3>
          <p className="text-sm">{po.paymentTerms || 'Net 30 days from invoice date'}</p>
        </div>

        {/* Special Instructions */}
        {po.specialInstructions && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase border-b border-gray-300 pb-1">
              Special Instructions
            </h3>
            <p className="text-sm">{po.specialInstructions}</p>
          </div>
        )}

        {/* Terms and Conditions */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase border-b border-gray-300 pb-1">
            Terms and Conditions
          </h3>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>This Purchase Order is subject to the supplier's acceptance and confirmation.</li>
            <li>All items must be delivered in accordance with the specifications and quantities listed above.</li>
            <li>Payment will be made within the agreed payment terms upon receipt of a valid invoice.</li>
            <li>Any discrepancies in delivery must be reported within 48 hours of receipt.</li>
            <li>The supplier is responsible for ensuring all items meet quality standards.</li>
          </ol>
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-2 gap-12 mt-16">
          <div>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm font-medium">Authorized Signature</p>
              <p className="text-xs text-gray-500">Procurement Officer</p>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm font-medium">Supplier Acceptance</p>
              <p className="text-xs text-gray-500">Authorized Representative</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>This is a computer-generated document. No signature is required unless specified.</p>
          <p className="mt-1">PO Reference: {po.poNumber} | Generated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
