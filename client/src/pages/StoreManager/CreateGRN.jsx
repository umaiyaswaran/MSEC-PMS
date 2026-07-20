import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { purchaseOrderApi, grnApi } from '../../services/api';
import { FormInput, FormTextArea, Button, Loader } from '../../components';
import useAuth from '../../hooks/useAuth';

const CreateGRN = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedPOId = searchParams.get('poId') || '';

  const [form, setForm] = useState({
    purchaseOrderId: selectedPOId,
    deliveryDate: '',
    vehicleNumber: '',
    driverName: '',
    challanNumber: '',
    remarks: '',
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [poDetails, setPoDetails] = useState(null);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        setLoading(true);
        if (!selectedPOId) {
          setError('Please select a purchase order to create a GRN.');
          return;
        }

        const response = await purchaseOrderApi.getPOById(selectedPOId);
        const po = response.data?.data?.purchaseOrder || response.data.purchaseOrder || response.data || null;
        if (!po) {
          setError('Selected purchase order not found.');
          return;
        }

        const items = (po.items || []).map((item) => ({
          name: item.name,
          orderedQuantity: item.quantity || 0,
          remainingQuantity: item.remainingQuantity ?? (item.quantity || 0),
          receivedQuantity: 0,
        }));

        setPoDetails(po);
        setForm((prev) => ({
          ...prev,
          purchaseOrderId: selectedPOId,
          deliveryDate: po.deliveryDate ? new Date(po.deliveryDate).toISOString().slice(0, 10) : prev.deliveryDate,
          items,
        }));
      } catch (err) {
        console.error('Failed to fetch purchase order details:', err);
        setError('Unable to load purchase order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPO();
  }, [selectedPOId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleItemQuantityChange = (index, value) => {
    const numericValue = Number(value);
    setForm((prev) => {
      const items = prev.items.map((item, idx) => {
        if (idx !== index) return item;
        const safe = isNaN(numericValue) ? 0 : Math.max(0, numericValue);
        return { ...item, receivedQuantity: safe };
      });
      return { ...prev, items };
    });
  };

  const totalReceived = useMemo(() => {
    return form.items.reduce((sum, item) => sum + (Number(item.receivedQuantity) || 0), 0);
  }, [form.items]);

  const remainingAfterTotal = useMemo(() => {
    const poRemaining = poDetails?.remainingQuantity || 0;
    return Math.max(poRemaining - totalReceived, 0);
  }, [poDetails, totalReceived]);

  const formatAddress = (address) => {
    if (!address) return '';
    const parts = [address.street, address.city, address.state, address.zip, address.country].filter(Boolean);
    return parts.join(', ');
  };

  const validate = () => {
    const errors = [];
    if (!form.purchaseOrderId) errors.push('Purchase order is required');
    if (!form.deliveryDate) errors.push('Delivery date is required');
    if (form.items.length === 0) errors.push('At least one item is required');
    // Only require positive received quantities for items that have remaining quantity
    if (form.items.some((item) => (item.remainingQuantity || 0) > 0 && (Number(item.receivedQuantity) || 0) <= 0)) {
      errors.push('Received quantity must be greater than zero for each item with remaining quantity');
    }
    if (form.items.some((item) => (item.remainingQuantity || 0) > 0 && (Number(item.receivedQuantity) || 0) > (item.remainingQuantity || 0))) {
      errors.push('Received quantity cannot exceed remaining quantity for any item');
    }
    // Validate against PO ordered quantity
    const overOrdered = form.items.find((item) => (Number(item.receivedQuantity) || 0) > (item.orderedQuantity || 0));
    if (overOrdered) {
      errors.push(`Received quantity for '${overOrdered.name}' exceeds the ordered PO quantity`);
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    setSubmitting(true);
    try {
      const shouldForce = form.items.some((item) => (Number(item.receivedQuantity) || 0) > (item.remainingQuantity || 0));
      const payload = {
        purchaseOrderId: form.purchaseOrderId,
        items: form.items
          .map((item) => ({
            name: item.name,
            receivedQuantity: Number(item.receivedQuantity) || 0,
            remarks: '',
          }))
          .filter((it) => (it.receivedQuantity || 0) > 0),
        deliveryDate: form.deliveryDate,
        vehicleNumber: form.vehicleNumber,
        driverName: form.driverName,
        challanNumber: form.challanNumber,
        remarks: form.remarks,
        force: shouldForce,
      };

      await grnApi.createGRN(payload);
      navigate('/store-manager/grns');
    } catch (err) {
      console.error('Failed to create GRN:', err);
      setError(err.response?.data?.message || 'Failed to create GRN');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader message="Loading GRN form..." />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Create Receipt Note</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Create Goods Receipt Note</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Complete the receiving details for the selected purchase order and record the quantities received into inventory.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <p className="font-semibold text-slate-900">Purchase Order</p>
            <p>{poDetails?.poNumber || 'Not selected'}</p>
            <p className="mt-2 text-xs text-slate-500">Store manager: {user?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <form className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Purchase Order</label>
              <input
                type="text"
                value={poDetails?.poNumber || ''}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Supplier</label>
              <input
                type="text"
                value={poDetails?.supplier?.companyName || poDetails?.supplier?.name || 'N/A'}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Intent Request</label>
              <input
                type="text"
                value={poDetails?.intent?.intentId || poDetails?.intent?.title || 'N/A'}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Delivery Address</label>
              <input
                type="text"
                value={formatAddress(poDetails?.deliveryAddress) || 'Not specified'}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput
              label="Delivery Date"
              type="date"
              name="deliveryDate"
              value={form.deliveryDate}
              onChange={handleChange}
              required
            />
            <FormInput
              label="Payment Terms"
              name="paymentTerms"
              value={poDetails?.paymentTerms || ''}
              onChange={() => {}}
              disabled
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput
              label="Vehicle Number"
              name="vehicleNumber"
              value={form.vehicleNumber}
              onChange={handleChange}
              placeholder="Enter vehicle number"
            />
            <FormInput
              label="Driver Name"
              name="driverName"
              value={form.driverName}
              onChange={handleChange}
              placeholder="Enter driver name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput
              label="Challan Number"
              name="challanNumber"
              value={form.challanNumber}
              onChange={handleChange}
              placeholder="Enter challan number"
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Store Manager</label>
              <input
                type="text"
                value={user?.name || 'Store Manager'}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Receipt items</p>
                <p className="text-xs text-slate-500">Enter the quantity received for each item.</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">Total received: {totalReceived}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Item</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Ordered Qty</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Remaining Qty</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Received Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {form.items.map((item, index) => (
                  <tr key={item.name || index}>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-800">{item.name}</td>
                    <td className="px-4 py-4 text-slate-700">{item.orderedQuantity}</td>
                    <td className="px-4 py-4 text-slate-700">{Math.max((item.remainingQuantity || 0) - (Number(item.receivedQuantity) || 0), 0)}</td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="0"
                        value={item.receivedQuantity}
                        onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                        className={`w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-slate-50`}
                      />
                      {item.remainingQuantity === 0 && (
                        <p className="mt-1 text-xs text-amber-600">Remaining is 0 — edit to override if needed (validation will block invalid values)</p>
                      )}
                          {Number(item.receivedQuantity) > (item.orderedQuantity || 0) && (
                            <p className="mt-1 text-xs text-red-600">Received exceeds ordered quantity for this item</p>
                          )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <FormTextArea
            label="Remarks"
            name="remarks"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder="Optional notes or observations"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={() => navigate('/store-manager/grns')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit GRN
            </Button>
          </div>
        </form>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-700">Purchase Order Summary</p>
              <p className="mt-2 text-sm text-slate-600">Review the selected purchase order details before submitting the GRN.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm text-slate-700">
              <div>
                <p className="font-medium text-slate-900">Supplier</p>
                <p>{poDetails?.supplier?.companyName || poDetails?.supplier?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">PO Status</p>
                <p>{poDetails?.status || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Remaining Qty</p>
                <p>{remainingAfterTotal}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Total Amount</p>
                <p>${poDetails?.grandTotal?.toFixed(2) ?? '0.00'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CreateGRN;
