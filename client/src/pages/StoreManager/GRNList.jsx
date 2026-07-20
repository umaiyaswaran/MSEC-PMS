import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { grnApi } from '../../services/api';
import Button from '../../components/Buttons/Button';
import DataTable from '../../components/Tables/DataTable';
import Loader from '../../components/Loader/Loader';

const GRNList = () => {
  const [loading, setLoading] = useState(true);
  const [grns, setGrns] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGRNs = async () => {
      try {
        const response = await grnApi.getGRNs({ limit: 50 });
        const data = response.data;
        const records = Array.isArray(data.data)
          ? data.data
          : data.data?.goodsReceiptNotes || data.goodsReceiptNotes || [];
        setGrns(records);
      } catch (err) {
        console.error('Failed to load GRNs:', err);
        setError('Unable to load goods receipt notes.');
      } finally {
        setLoading(false);
      }
    };

    fetchGRNs();
  }, []);

  const columns = [
    { key: 'grnNumber', label: 'GRN Number' },
    {
      key: 'purchaseOrder',
      label: 'PO Number',
      render: (_, row) => row.purchaseOrder?.poNumber || 'N/A',
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (_, row) => row.supplier?.companyName || row.supplier?.name || 'N/A',
    },
    { key: 'status', label: 'Status' },
    {
      key: 'totalReceivedQuantity',
      label: 'Received Qty',
      render: (_, row) => row.totalReceivedQuantity ?? 0,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Link
          to={`/store-manager/grns/${row._id}`}
          className="text-blue-600 hover:text-blue-800"
        >
          View
        </Link>
      ),
    },
  ];

  if (loading) {
    return <Loader message="Loading goods receipt notes..." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Store Manager</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Goods Receipt Notes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Monitor all goods receipt notes and ensure purchase orders are received accurately and on schedule.
            </p>
          </div>
          <Link to="/store-manager/grns/create">
            <Button variant="primary">Create New GRN</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-600">Recent goods receipt notes</p>
        </div>
        <div className="p-6">
          <DataTable
            loading={false}
            data={grns}
            columns={columns}
            emptyMessage="No goods receipt notes found."
          />
        </div>
      </div>
    </div>
  );
};

export default GRNList;
