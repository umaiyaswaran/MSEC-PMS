import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import quotationApi from '../../api/quotationApi';
import supplierApi from '../../api/supplierApi';
import intentApi from '../../api/intentApi';
import { FormInput, FormSelect, Button, Loader } from '../../components';
import useNavPrefix from '../../hooks/useNavPrefix';

const EMPTY_ITEM = {
  name: '',
  quantity: '',
  unitPrice: '',
  deliveryTime: '',
  warranty: '',
};

const UploadQuotation = () => {
  const { intentId } = useParams();
  const navigate = useNavigate();
  const navPrefix = useNavPrefix();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [intent, setIntent] = useState(null);

  const [form, setForm] = useState({
    supplier: '',
    quotationNumber: '',
    items: [{ ...EMPTY_ITEM }],
    paymentTerms: '',
    validityDays: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supplierRes, intentRes] = await Promise.all([
          supplierApi.getActiveSuppliers(),
          intentApi.getIntentById(intentId),
        ]);
        setSuppliers(supplierRes.data?.data?.suppliers || supplierRes.data?.suppliers || []);
        setIntent(intentRes.data?.data?.intent || intentRes.data?.intent || null);

        const intentData = intentRes.data?.data?.intent || intentRes.data?.intent || intentRes.data;
        if (intentData?.items) {
          const intentItems = intentData.items;
          if (intentItems.length > 0) {
            setForm((prev) => ({
              ...prev,
              items: intentItems.map((item) => ({
                name: item.name || '',
                quantity: item.quantity || 1,
                unitPrice: 0,
                deliveryTime: '',
                warranty: '',
              })),
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [intentId]);

  const totalAmount = form.items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }));
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const newErrors = {};
    const supplierName = form.supplier?.trim();
    if (!supplierName) {
      newErrors.supplier = 'Supplier name is required';
    }
    if (!form.quotationNumber.trim()) newErrors.quotationNumber = 'Quotation number is required';
    if (!form.paymentTerms.trim()) newErrors.paymentTerms = 'Payment terms are required';

    const enteredItems = form.items.filter((item) => {
      const hasAnyValue = item.name.trim() || item.quantity !== '' || item.unitPrice !== '';
      return hasAnyValue;
    });

    if (!enteredItems.length) {
      newErrors.items = 'Enter item prices for quotation items';
    }

    enteredItems.forEach((item, idx) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      if (quantity <= 0 || unitPrice <= 0) {
        newErrors[`item_${idx}_unitPrice`] = 'Quantity and unit price are required for each item';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const supplierOption = supplierOptions.find((option) =>
        option.value === form.supplier || option.label.toLowerCase() === form.supplier.trim().toLowerCase()
      );
      const resolvedSupplier = supplierOption ? supplierOption.value : form.supplier;

      const payload = {
        intent: intentId,
        supplier: resolvedSupplier,
        quotationNumber: form.quotationNumber,
        items: form.items
          .filter((item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            return quantity > 0 && unitPrice > 0;
          })
          .map((item) => ({
            name: item.name,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            total: parseFloat(item.quantity) * parseFloat(item.unitPrice),
            deliveryTime: item.deliveryTime ? parseInt(item.deliveryTime, 10) : undefined,
            warranty: item.warranty || undefined,
          })),
        totalAmount,
        paymentTerms: form.paymentTerms,
        validityDays: form.validityDays ? parseInt(form.validityDays, 10) : undefined,
      };
      await quotationApi.uploadQuotation(payload);
      navigate(`${navPrefix}/intents/${intentId}`);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to upload quotation' });
    } finally {
      setSubmitting(false);
    }
  };

  // Ensure suppliers is always an array before mapping
  const supplierList = Array.isArray(suppliers)
    ? suppliers
    : (suppliers && suppliers.data) || [];

  const supplierOptions = Array.isArray(supplierList)
    ? supplierList.map((s) => ({ value: s._id, label: s.companyName || s.companyName }))
    : [];

  if (loading) return <Loader message="Loading form data..." />;

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
        <h1 className="text-2xl font-bold text-gray-900">Upload Quotation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Intent: <span className="font-medium text-gray-700">{intent?.intentId || intentId}</span>
          {intent?.title && <span className="text-gray-400 ml-2">- {intent.title}</span>}
        </p>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quotation Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Supplier"
              name="supplier"
              value={form.supplier}
              onChange={handleChange}
              options={supplierOptions}
              error={errors.supplier}
              placeholder="Select supplier"
              required
              searchable
            />
            <FormInput
              label="Quotation Number"
              name="quotationNumber"
              value={form.quotationNumber}
              onChange={handleChange}
              error={errors.quotationNumber}
              placeholder="e.g., QT-2024-001"
              required
            />
            <FormInput
              label="Payment Terms"
              name="paymentTerms"
              value={form.paymentTerms}
              onChange={handleChange}
              error={errors.paymentTerms}
              placeholder="e.g., Net 30 days"
              required
            />
            <FormInput
              label="Validity Days"
              name="validityDays"
              type="number"
              value={form.validityDays}
              onChange={handleChange}
              placeholder="e.g., 30"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Price Details</h2>
              <p className="text-sm text-gray-500">Enter prices from the quotation details below</p>
            </div>
            <Button variant="outline" size="sm" onClick={addItem}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </Button>
          </div>

          {errors.items && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.items}</p>
            </div>
          )}

          <div className="space-y-4">
            {form.items.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 relative">
                {form.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <FormInput
                      label="Item Name"
                      name={`item_name_${idx}`}
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      error={errors[`item_${idx}_name`]}
                      placeholder="e.g., Laptop, Desk Chair"
                    />
                  </div>
                  <FormInput
                    label="Quantity"
                    name={`item_qty_${idx}`}
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    error={errors[`item_${idx}_quantity`]}
                    placeholder="1"
                  />
                  <FormInput
                    label="Unit Price"
                    name={`item_price_${idx}`}
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    error={errors[`item_${idx}_unitPrice`]}
                    placeholder="0.00"
                  />
                  <FormInput
                    label="Delivery Time (days)"
                    name={`item_delivery_${idx}`}
                    type="number"
                    value={item.deliveryTime}
                    onChange={(e) => handleItemChange(idx, 'deliveryTime', e.target.value)}
                    placeholder="e.g., 14"
                  />
                  <FormInput
                    label="Warranty"
                    name={`item_warranty_${idx}`}
                    value={item.warranty}
                    onChange={(e) => handleItemChange(idx, 'warranty', e.target.value)}
                    placeholder="e.g., 12 months"
                  />
                  <div className="md:col-span-2 flex items-end">
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-xs text-gray-500">Total</span>
                      <p className="text-sm font-semibold text-gray-900">
                        {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Amount</h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Quotation Total</span>
            <span className="text-2xl font-bold text-gray-900">
              {totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate(`/intents/${intentId}`)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            Submit Quotation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UploadQuotation;
