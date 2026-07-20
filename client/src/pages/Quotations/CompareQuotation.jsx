import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import quotationApi from '../../api/quotationApi';
import intentApi from '../../api/intentApi';
import { Button, Loader, ConfirmDialog } from '../../components';
import useNavPrefix from '../../hooks/useNavPrefix';

const CompareQuotation = () => {
  const { intentId } = useParams();
  const navigate = useNavigate();
  const navPrefix = useNavPrefix();
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [intent, setIntent] = useState(null);
  const [selectingId, setSelectingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quoteRes, intentRes] = await Promise.all([
          quotationApi.getQuotationsByIntent(intentId),
          intentApi.getIntentById(intentId),
        ]);
        setQuotations(quoteRes.data?.data?.quotations || quoteRes.data?.quotations || []);
        setIntent(intentRes.data?.data?.intent || intentRes.data?.intent || null);
      } catch (err) {
        console.error('Failed to load quotations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [intentId]);

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  const handleSelectClick = (quotation) => {
    setSelectedQuotation(quotation);
    setShowConfirm(true);
  };

  const handleConfirmSelect = async () => {
    if (!selectedQuotation) return;
    setActionLoading(true);
    try {
      setShowConfirm(false);
      navigate(`${navPrefix}/quotations/select/${intentId}/${selectedQuotation._id}`);
    } catch (err) {
      console.error('Failed to navigate:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const lowestPrice = quotations.length > 0
    ? quotations.reduce((min, q) => (q.totalAmount < min.totalAmount ? q : min), quotations[0])
    : null;

  const fastestDelivery = quotations.length > 0
    ? quotations.reduce((min, q) => {
        const qMin = Math.min(...(q.items || []).map((i) => i.deliveryTime || Infinity));
        const minMin = Math.min(...(min.items || []).map((i) => i.deliveryTime || Infinity));
        return qMin < minMin ? q : min;
      }, quotations[0])
    : null;

  if (loading) return <Loader message="Loading quotations..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
        <h1 className="text-2xl font-bold text-gray-900">Compare Quotations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Intent: <span className="font-medium text-gray-700">{intent?.intentId || intentId}</span>
          <span className="text-gray-400 ml-2">- {intent?.title}</span>
        </p>
      </div>

      {quotations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-4 text-gray-600">No quotations found for this intent.</p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => navigate(`/intents/${intentId}/upload-quotation`)}
          >
            Upload Quotation
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-500">Total Quotations</p>
              <p className="text-2xl font-bold text-gray-900">{quotations.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-500">Lowest Price</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(lowestPrice?.totalAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">{lowestPrice?.supplier?.companyName || '-'}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-500">Fastest Delivery</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.min(...(fastestDelivery?.items || []).map((i) => i.deliveryTime || Infinity))} days
              </p>
              <p className="text-xs text-gray-500 mt-1">{fastestDelivery?.supplier?.companyName || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {quotations.map((quotation) => {
              const isLowest = lowestPrice && quotation._id === lowestPrice._id;
              const isFastest = fastestDelivery && quotation._id === fastestDelivery._id;
              const fastestDays = Math.min(...(quotation.items || []).map((i) => i.deliveryTime || Infinity));

              return (
                <div
                  key={quotation._id}
                  className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                    isLowest ? 'border-green-400' : isFastest ? 'border-blue-400' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {quotation.supplier?.companyName || 'Unknown Supplier'}
                    </h3>
                    <div className="flex space-x-2">
                      {isLowest && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Lowest Price
                        </span>
                      )}
                      {isFastest && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Fastest
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quotation #</span>
                      <span className="font-medium text-gray-900">{quotation.quotationNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Amount</span>
                      <span className="font-bold text-gray-900">{formatCurrency(quotation.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Delivery</span>
                      <span className="font-medium text-gray-900">
                        {fastestDays === Infinity ? '-' : `${fastestDays} days`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Payment Terms</span>
                      <span className="font-medium text-gray-900">{quotation.paymentTerms || '-'}</span>
                    </div>
                    {quotation.validityDays && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Validity</span>
                        <span className="font-medium text-gray-900">{quotation.validityDays} days</span>
                      </div>
                    )}
                  </div>

                  {quotation.images && quotation.images.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Quotation Images</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {quotation.images.map((img, idx) => (
                          <div
                            key={idx}
                            className="flex-shrink-0 cursor-pointer border border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors"
                            onClick={() => setPreviewImage(img.url)}
                          >
                            <img
                              src={img.url}
                              alt={`Quotation ${idx + 1}`}
                              className="w-20 h-20 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {quotation.items?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Items</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {quotation.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                            <span className="text-gray-700 truncate mr-2">{item.name}</span>
                            <span className="font-medium text-gray-900 whitespace-nowrap">
                              {item.quantity} x {formatCurrency(item.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {quotation.documents?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Documents</p>
                      <div className="space-y-1">
                        {quotation.documents.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:text-blue-500"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {doc.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant={isLowest ? 'success' : 'primary'}
                    className="w-full"
                    onClick={() => handleSelectClick(quotation)}
                  >
                    Select Supplier
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSelect}
        title="Select Supplier"
        message={`Are you sure you want to select ${selectedQuotation?.supplier?.companyName || 'this supplier'}? This will proceed with the procurement process.`}
        confirmText="Confirm Selection"
        confirmVariant="success"
        loading={actionLoading}
      />

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 text-white hover:text-gray-300 z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={previewImage}
              alt="Quotation preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CompareQuotation;
