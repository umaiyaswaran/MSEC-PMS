import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import quotationApi from '../../api/quotationApi';
import intentApi from '../../api/intentApi';
import { Button, Loader, ConfirmDialog } from '../../components';
import useNavPrefix from '../../hooks/useNavPrefix';

const SelectSupplier = () => {
  const { intentId, quotationId } = useParams();
  const navigate = useNavigate();
  const navPrefix = useNavPrefix();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [quotation, setQuotation] = useState(null);
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quoteRes, intentRes] = await Promise.all([
          quotationApi.getQuotationsByIntent(intentId),
          intentApi.getIntentById(intentId),
        ]);
        const quotes = quoteRes.data?.data?.quotations || quoteRes.data?.quotations || [];
        const found = quotes.find((q) => q._id === quotationId);
        setQuotation(found || null);
        setIntent(intentRes.data?.data?.intent || intentRes.data?.intent || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [intentId, quotationId]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await quotationApi.selectSupplier(quotationId);
      navigate(`${navPrefix}/intents/${intentId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm selection');
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  if (loading) return <Loader message="Loading quotation details..." />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate(`${navPrefix}/intents/${intentId}`)}>
            Back to Intent
          </Button>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-700">Quotation not found.</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate(`${navPrefix}/intents/${intentId}`)}>
            Back to Intent
          </Button>
        </div>
      </div>
    );
  }

  const fastestDays = Math.min(...(quotation.items || []).map((i) => i.deliveryTime || Infinity));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(`${navPrefix}/intents/${intentId}`)}
          className="text-sm text-blue-600 hover:text-blue-500 flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Intent
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Confirm Supplier Selection</h1>
        <p className="mt-1 text-sm text-gray-500">Review the details below and confirm your selection.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Intent Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Intent ID</p>
              <p className="text-sm font-medium text-gray-900">{intent?.intentId || intentId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Title</p>
              <p className="text-sm font-medium text-gray-900">{intent?.title || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="text-sm font-medium text-gray-900">{intent?.department?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estimated Cost</p>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(intent?.estimatedCost)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border-2 border-green-400 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Quotation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Supplier</p>
              <p className="text-sm font-semibold text-gray-900">{quotation.supplier?.companyName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Quotation Number</p>
              <p className="text-sm font-medium text-gray-900">{quotation.quotationNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(quotation.totalAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Delivery Time</p>
              <p className="text-sm font-medium text-gray-900">
                {fastestDays === Infinity ? '-' : `${fastestDays} days`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Terms</p>
              <p className="text-sm font-medium text-gray-900">{quotation.paymentTerms || '-'}</p>
            </div>
            {quotation.validityDays && (
              <div>
                <p className="text-sm text-gray-500">Validity</p>
                <p className="text-sm font-medium text-gray-900">{quotation.validityDays} days</p>
              </div>
            )}
          </div>

          {quotation.items?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Items Breakdown</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Delivery</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Warranty</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotation.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(item.total || item.quantity * item.unitPrice)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {item.deliveryTime ? `${item.deliveryTime} days` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.warranty || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate(`${navPrefix}/intents/${intentId}`)}>
            Cancel
          </Button>
          <Button variant="success" onClick={() => setShowConfirm(true)} loading={confirming}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirm Selection
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Supplier Selection"
        message={`You are about to select "${quotation.supplier?.companyName}" as the supplier for this intent with a total of ${formatCurrency(quotation.totalAmount)}. This action will proceed with the procurement process.`}
        confirmText="Confirm Selection"
        confirmVariant="success"
        loading={confirming}
      />
    </div>
  );
};

export default SelectSupplier;
