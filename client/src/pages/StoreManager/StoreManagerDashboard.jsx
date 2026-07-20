import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { purchaseOrderApi, grnApi } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import StatsCard from '../../components/DashboardCards/StatsCard';
import DataTable from '../../components/Tables/DataTable';
import Loader from '../../components/Loader/Loader';
import Button from '../../components/Buttons/Button';

const StoreManagerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [openOrders, setOpenOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [stats, setStats] = useState({ openOrders: 0, pendingGrns: 0 });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [ordersResponse, grnsResponse] = await Promise.all([
          purchaseOrderApi.getPOs({ status: 'OPEN', limit: 5 }),
          grnApi.getGRNs({ limit: 5 }),
        ]);

        const ordersData = ordersResponse.data?.data || [];
        const grnData = grnsResponse.data?.data || [];

        setOpenOrders(ordersData);
        setGrns(grnData);
        setStats({
          openOrders: ordersResponse.data?.pagination?.total || ordersData.length,
          pendingGrns: grnsResponse.data?.pagination?.total || grnData.length,
        });
      } catch (err) {
        console.error('Failed to load store manager dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <Loader message="Loading Store Manager dashboard..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Manager Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back, {user?.name || 'Store Manager'}. Track open purchase orders and receipt notes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/store-manager/open-purchase-orders">
            <Button variant="primary">View Open POs</Button>
          </Link>
          <Link to="/store-manager/grns">
            <Button variant="outline">View GRNs</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Open Purchase Orders"
          value={stats.openOrders}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
          }
          color="blue"
        />
        <StatsCard
          title="Recent Goods Receipt Notes"
          value={stats.pendingGrns}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m-3-3L9 11m-4 4a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
          }
          color="emerald"
        />
        <StatsCard
          title="Open Orders This Week"
          value={openOrders.length}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="yellow"
        />
        <StatsCard
          title="Recent GRNs"
          value={grns.length}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          }
          color="gray"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Open Purchase Orders</h2>
            <p className="text-sm text-gray-500">Most recent open and partially received orders.</p>
          </div>
          <Link to="/store-manager/open-purchase-orders" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
            View All
          </Link>
        </div>

        <DataTable
          loading={false}
          data={openOrders}
          columns={[
            { key: 'poNumber', label: 'PO Number' },
            { key: 'supplierName', label: 'Supplier', render: (_, row) => row.supplier?.companyName || row.supplier?.name || 'N/A' },
            { key: 'remainingQuantity', label: 'Remaining Qty', render: (_, row) => row.remainingQuantity ?? 0 },
            { key: 'status', label: 'Status', render: (value) => value?.toUpperCase() || 'N/A' },
            { key: 'grandTotal', label: 'Amount', render: (_, row) => `$${row.grandTotal?.toFixed(2) || '0.00'}` },
          ]}
          emptyMessage="No open purchase orders found."
        />
      </div>
    </div>
  );
};

export default StoreManagerDashboard;
