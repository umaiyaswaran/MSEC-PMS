import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/api';
import Button from '../../components/Buttons/Button';
import DataTable from '../../components/Tables/DataTable';
import Loader from '../../components/Loader/Loader';

const OpenPurchaseOrders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOpenPurchaseOrders = async () => {
      try {
        const response = await purchaseOrderApi.getPOs({ limit: 50 });
        const data = response.data;
        const orders = Array.isArray(data.data)
          ? data.data
          : data.data?.purchaseOrders || data.purchaseOrders || [];

        const openOrders = (orders || []).filter((order) =>
          ['OPEN', 'PARTIALLY_RECEIVED'].includes(order.status)
        );

        setPurchaseOrders(openOrders);
      } catch (err) {
        console.error('Failed to fetch open purchase orders:', err);
        setError('Unable to load open purchase orders at this time.');
      } finally {
        setLoading(false);
      }
    };

    fetchOpenPurchaseOrders();
  }, []);

  const handleCreateGRN = (purchaseOrderId) => {
    navigate(`/store-manager/grns/create?poId=${purchaseOrderId}`);
  };

  const columns = [
    { key: 'poNumber', label: 'PO Number' },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (_, row) => row.supplier?.companyName || row.supplier?.name || 'N/A',
    },
    {
      key: 'totalOrderedQuantity',
      label: 'Ordered Qty',
      render: (_, row) => {
        const ordered = row.totalOrderedQuantity ?? (row.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0);
        return ordered;
      },
    },
    {
      key: 'receivedQuantity',
      label: 'Received Qty',
      render: (_, row) => row.receivedQuantity ?? 0,
    },
    {
      key: 'remainingQuantity',
      label: 'Remaining Qty',
      render: (_, row) => row.remainingQuantity ?? 0,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => value || 'N/A',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleCreateGRN(row._id)}>
            Create GRN
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <Loader message="Loading open purchase orders..." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Store Manager</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Open Purchase Orders</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review live open purchase orders, track receiving quantities, and create goods receipt notes for partial or final receipts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate('/store-manager/grns')}>
              View GRNs
            </Button>
            <Button variant="primary" onClick={() => navigate('/store-manager/grns/create')}>
              Create GRN
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-600">Open orders ready for receipt</p>
        </div>
        <div className="p-6">
          <DataTable
            loading={false}
            data={purchaseOrders}
            columns={columns}
            emptyMessage="No open purchase orders found."
          />
        </div>
      </div>
    </div>
  );
};

export default OpenPurchaseOrders;
