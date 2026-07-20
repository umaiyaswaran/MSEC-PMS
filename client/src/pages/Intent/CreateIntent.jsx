import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import intentApi from '../../api/intentApi';
import departmentApi from '../../api/departmentApi';
import { FormInput, FormSelect, FormTextArea, Button, FileUpload } from '../../components';
import { PRIORITY_LEVELS, PRIORITY_LABELS } from '../../utils/constants';
import useNavPrefix from '../../hooks/useNavPrefix';

const EMPTY_ITEM = {
  name: '',
  description: '',
  quantity: 1,
  unit: '',
  category: '',
};

const PRIORITY_OPTIONS = Object.values(PRIORITY_LEVELS).map((val) => ({
  value: val,
  label: PRIORITY_LABELS[val] || val,
}));

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'ltr', label: 'Liters' },
  { value: 'box', label: 'Box' },
  { value: 'set', label: 'Set' },
  { value: 'pair', label: 'Pair' },
  { value: 'roll', label: 'Roll' },
  { value: 'carton', label: 'Carton' },
];

const CATEGORY_OPTIONS = [
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'it_equipment', label: 'IT Equipment' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'services', label: 'Services' },
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'maintenance', label: 'Maintenance' },
];

const INTENT_CATEGORY_OPTIONS = [
  { value: 'GOODS', label: 'Goods' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'SUB_CONTRACTOR', label: 'Sub Contractor' },
];

const CreateIntent = () => {
  const navigate = useNavigate();
  const navPrefix = useNavPrefix();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    department: '',
    priority: PRIORITY_LEVELS.MEDIUM,
    category: 'GOODS',
    items: [{ ...EMPTY_ITEM }],
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data } = await departmentApi.getDepartments();
        const departments = data.data?.departments || data.departments || data.data || data || [];
        const options = (Array.isArray(departments) ? departments : []).map((d) => ({
          value: d._id,
          label: d.name,
        }));
        setDepartmentOptions(options);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
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

  const handleFileSelect = (selectedFiles) => {
    setFiles(Array.isArray(selectedFiles) ? selectedFiles : selectedFiles ? [selectedFiles] : []);
  };

  const validate = () => {
    const newErrors = {};

    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.department) newErrors.department = 'Department is required';

    form.items.forEach((item, idx) => {
      if (!item.name.trim()) newErrors[`item_${idx}_name`] = 'Item name is required';
      if (!item.quantity || item.quantity < 1) newErrors[`item_${idx}_quantity`] = 'Quantity must be at least 1';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft = true) => {
    if (!validate()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('department', form.department);
      formData.append('priority', form.priority);
      formData.append('category', form.category);
      formData.append('estimatedCost', 0);
      formData.append('items', JSON.stringify(form.items));

      if (files.length > 0) {
        files.forEach((file) => formData.append('documents', file));
      }

      const { data } = await intentApi.createIntent(formData);
      const createdIntent = data.data?.intent || data.intent;

      if (!isDraft && createdIntent?._id) {
        await intentApi.submitIntent(createdIntent._id);
      }

      navigate(`${navPrefix}/intents`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create intent';
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Intent</h1>
        <p className="mt-1 text-sm text-gray-500">Fill in the details to create a procurement intent request.</p>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormInput
                label="Title"
                name="title"
                value={form.title}
                onChange={handleChange}
                error={errors.title}
                placeholder="Enter intent title"
                required
              />
            </div>
            <div className="md:col-span-2">
              <FormTextArea
                label="Description"
                name="description"
                value={form.description}
                onChange={handleChange}
                error={errors.description}
                placeholder="Describe the procurement need"
                rows={3}
                required
              />
            </div>
            <FormSelect
              label="Department"
              name="department"
              value={form.department}
              onChange={handleChange}
              options={departmentOptions}
              error={errors.department}
              required
            />
            <FormSelect
              label="Priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
              options={PRIORITY_OPTIONS}
            />
            <FormSelect
              label="Intent Category"
              name="category"
              value={form.category}
              onChange={handleChange}
              options={INTENT_CATEGORY_OPTIONS}
              required
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            <Button variant="outline" size="sm" onClick={addItem}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </Button>
          </div>

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <FormInput
                      label="Item Name"
                      name={`item_name_${idx}`}
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      error={errors[`item_${idx}_name`]}
                      placeholder="e.g., Laptop, Desk Chair"
                      required
                    />
                  </div>
                  <FormInput
                    label="Category"
                    name={`item_category_${idx}`}
                    value={item.category}
                    onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                    placeholder="e.g., IT Equipment"
                  />
                  <div className="md:col-span-3">
                    <FormTextArea
                      label="Description"
                      name={`item_desc_${idx}`}
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Item specifications or details"
                      rows={2}
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
                    required
                  />
                  <FormSelect
                    label="Unit"
                    name={`item_unit_${idx}`}
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    options={UNIT_OPTIONS}
                    placeholder="Select unit"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Supporting Documents</h2>
          <FileUpload
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onFileSelect={handleFileSelect}
            multiple
            maxSize={10 * 1024 * 1024}
          />
        </div>

        <div className="flex items-center justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate(`${navPrefix}/intents`)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit(true)}
            loading={loading}
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSubmit(false)}
            loading={loading}
          >
            Submit for Approval
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateIntent;
