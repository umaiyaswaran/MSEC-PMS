import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supplierApi from '../../api/supplierApi';
import quotationApi from '../../api/quotationApi';
import { Button, Loader } from '../../components';

const StarRating = ({ rating }) => {
  return (
    <div className="flex items-center space-x-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-5 h-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

const SupplierProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await supplierApi.getSupplierById(id);
        setSupplier(data.supplier || data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load supplier');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const { data } = await quotationApi.getQuotationsByIntent('all');
        const all = data?.quotations || data || [];
        const filtered = all.filter((q) => {
          const sid = typeof q.supplier === 'string' ? q.supplier : q.supplier?._id;
          return sid === id;
        });
        setQuotations(filtered.slice(0, 5));
      } catch {
        setQuotations([]);
      }
    };
    fetchQuotations();
  }, [id]);

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) return <Loader message="Loading supplier profile..." />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/suppliers')}>
            Back to Suppliers
          </Button>
        </div>
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/suppliers')}
          className="text-sm text-blue-600 hover:text-blue-500 flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Suppliers
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{supplier.companyName}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  supplier.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {supplier.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <StarRating rating={supplier.rating || 0} />
              <span className="text-sm text-gray-500">({supplier.rating || 0}/5)</span>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button variant="outline" size="sm" onClick={() => navigate(`/suppliers/${id}/edit`)}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Supplier
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Contact Person</p>
                <p className="text-sm font-medium text-gray-900">{supplier.contactPerson || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{supplier.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900">{supplier.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tax ID</p>
                <p className="text-sm font-medium text-gray-900">{supplier.taxId || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Street</p>
                <p className="text-sm font-medium text-gray-900">{supplier.address?.street || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">City</p>
                <p className="text-sm font-medium text-gray-900">{supplier.address?.city || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">State / Province</p>
                <p className="text-sm font-medium text-gray-900">{supplier.address?.state || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ZIP / Postal Code</p>
                <p className="text-sm font-medium text-gray-900">{supplier.address?.zip || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Country</p>
                <p className="text-sm font-medium text-gray-900">{supplier.address?.country || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Bank Name</p>
                <p className="text-sm font-medium text-gray-900">{supplier.bankDetails?.bankName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Number</p>
                <p className="text-sm font-medium text-gray-900">
                  {supplier.bankDetails?.accountNumber
                    ? `****${supplier.bankDetails.accountNumber.slice(-4)}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Routing Number</p>
                <p className="text-sm font-medium text-gray-900">
                  {supplier.bankDetails?.routingNumber
                    ? `****${supplier.bankDetails.routingNumber.slice(-4)}`
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {supplier.documents?.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
              <ul className="space-y-2">
                {supplier.documents.map((doc, idx) => (
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
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span
                  className={`font-medium ${
                    supplier.status === 'active' ? 'text-green-600' : 'text-gray-600'
                  }`}
                >
                  {supplier.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Rating</span>
                <span className="font-medium text-gray-900">{supplier.rating || 0} / 5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Quotations</span>
                <span className="font-medium text-gray-900">{quotations.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Added On</span>
                <span className="font-medium text-gray-900">{formatDate(supplier.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotations</h2>
            {quotations.length === 0 ? (
              <p className="text-sm text-gray-500">No quotations found.</p>
            ) : (
              <div className="space-y-3">
                {quotations.map((q) => (
                  <div key={q._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900">{q.quotationNumber || 'N/A'}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(q.totalAmount)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(q.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierProfile;
