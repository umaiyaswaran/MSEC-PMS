import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deliveryApi, purchaseOrderApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function PartialDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState(null);
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    conditionNotes: '',
    remarks: '',
    items: [],
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const deliveryData = await deliveryApi.getDeliveryById(id);
      setDelivery(deliveryData);

      const poData = await purchaseOrderApi.getPOById(deliveryData.poId);
      setPo(poData);

      const items = poData.items?.map((item) => ({
        name: item.name,
        orderedQty: item.quantity,
        deliveredQty: 0,
        status: 'pending',
        notes: '',
      })) || [];
      setFormData((prev) => ({ ...prev, items }));
    } catch (err) {
      console.error('Failed to load delivery data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasErrors = formData.items.some((item) => {
      if (item.deliveredQty < 0) return true;
      if (item.deliveredQty > item.orderedQty) return true;
      return false;
    });

    if (hasErrors) {
      alert('Please check delivered quantities. They cannot exceed ordered quantities or be negative.');
      return;
    }

    try {
      setSubmitting(true);
      await deliveryApi.recordPartialDelivery(id, {
        ...formData,
        receivedBy: user?.name || user?.email,
      });
      alert('Partial delivery recorded successfully');
      navigate(`/deliveries/${id}`);
    } catch (err) {
      alert('Failed to record delivery: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!delivery || !po) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Failed to load delivery information</p>
          <button onClick={() => navigate(-1)} className="mt-2 text-sm text-red-600 underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Record Partial Delivery</h1>
        <p className="text-sm text-gray-500 mt-1">Record items received in this partial delivery</p>
      </div>

      {/* Delivery Info Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Delivery Number:</span>
            <p className="font-medium">{delivery.deliveryNumber}</p>
          </div>
          <div>
            <span className="text-gray-500">Intent Request ID:</span>
            <p className="font-medium">{delivery.intentId}</p>
          </div>
          <div>
            <span className="text-gray-500">Supplier:</span>
            <p className="font-medium">{delivery.supplier?.name || po.supplier?.name}</p>
          </div>
          <div>
            <span className="text-gray-500">PO Number:</span>
            <p className="font-medium">{po.poNumber}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Delivery Date */}
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
                <input
                  type="text"
                  value={user?.name || user?.email || ''}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Items to Receive</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">#</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Item Name</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Ordered Qty</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Delivered Qty</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                      <td className="py-2 px-3 font-medium">{item.name}</td>
                      <td className="py-2 px-3 text-right">{item.orderedQty}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          max={item.orderedQty}
                          value={item.deliveredQty}
                          onChange={(e) => handleItemChange(index, 'deliveredQty', parseInt(e.target.value) || 0)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={item.status}
                          onChange={(e) => handleItemChange(index, 'status', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="received">Received</option>
                          <option value="damaged">Damaged</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          placeholder="Notes..."
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Condition Notes & Remarks */}
          <div className="p-4 border-t border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition Notes</label>
              <textarea
                value={formData.conditionNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, conditionNotes: e.target.value }))}
                rows={3}
                placeholder="Describe the condition of received items..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                rows={2}
                placeholder="Additional remarks..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Recording...' : 'Record Partial Delivery'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
