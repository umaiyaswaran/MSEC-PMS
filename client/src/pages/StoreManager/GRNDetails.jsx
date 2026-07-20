import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { grnApi } from '../../services/api';
import Button from '../../components/Buttons/Button';
import Loader from '../../components/Loader/Loader';

const GRNDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [grn, setGrn] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGRN = async () => {
      try {
        const response = await grnApi.getGRNById(id);
        const data = response.data?.data?.goodsReceiptNote || response.data?.goodsReceiptNote || response.data || null;
        setGrn(data);
      } catch (err) {
        console.error('Failed to load GRN details:', err);
        setError(err.response?.data?.message || 'Unable to load GRN details.');
      } finally {
        setLoading(false);
      }
    };

    fetchGRN();
  }, [id]);

  if (loading) return <Loader message="Loading GRN details..." />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/store-manager/grns')}>
            Back to GRNs
          </Button>
        </div>
      </div>
    );
  }

  if (!grn) {
    return null;
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">GRN Overview</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Goods Receipt Note Details</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Detailed view of the received shipment and order completion information.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/store-manager/grns')}>
            Back to GRNs
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">GRN Number</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{grn.grnNumber}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Status</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{grn.status}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Delivery Date</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{new Date(grn.deliveryDate).toLocaleDateString()}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Store Manager</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{grn.storeManager?.name || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Supplier</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{grn.supplier?.companyName || grn.supplier?.name || 'N/A'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Purchase Order</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{grn.purchaseOrder?.poNumber || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Total Received Qty</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{grn.totalReceivedQuantity ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Remaining Qty</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{grn.totalRemainingQuantity ?? 0}</p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Items Received</h2>
            <div className="overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Item</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ordered</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Received</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {grn.items?.map((item) => (
                    <tr key={item.name}>
                      <td className="px-4 py-4 text-slate-800">{item.name}</td>
                      <td className="px-4 py-4 text-slate-700">{item.orderedQuantity}</td>
                      <td className="px-4 py-4 text-slate-700">{item.receivedQuantity}</td>
                      <td className="px-4 py-4 text-slate-700">{item.remainingQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {grn.remarks && (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Remarks</h2>
              <p className="text-slate-700">{grn.remarks}</p>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-700">Document Summary</p>
              <p className="mt-2 text-sm text-slate-500">Upload documents are stored and tracked against this GRN.</p>
            </div>
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <p className="font-medium text-slate-900">Challan Number</p>
                <p>{grn.challanNumber || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Delivery Documents</p>
                <p>{grn.deliveryDocuments?.length ? `${grn.deliveryDocuments.length} uploaded` : 'None'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Challan Documents</p>
                <p>{grn.challanDocuments?.length ? `${grn.challanDocuments.length} uploaded` : 'None'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default GRNDetails;
