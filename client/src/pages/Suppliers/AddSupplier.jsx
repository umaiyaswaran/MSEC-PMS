import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supplierApi from '../../api/supplierApi';
import { FormInput, FormTextArea, Button, FileUpload } from '../../components';

const AddSupplier = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);

  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    taxId: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFileSelect = (selectedFiles) => {
    setFiles(Array.isArray(selectedFiles) ? selectedFiles : selectedFiles ? [selectedFiles] : []);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!form.contactPerson.trim()) newErrors.contactPerson = 'Contact person is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email format';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.country.trim()) newErrors.country = 'Country is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        companyName: form.companyName,
        contactPerson: form.contactPerson,
        email: form.email,
        phone: form.phone,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
        taxId: form.taxId || undefined,
        bankDetails: {
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          routingNumber: form.routingNumber,
        },
        documents: files.length > 0 ? files : undefined,
      };

      await supplierApi.createSupplier(payload);
      navigate('/suppliers');
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to create supplier' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/suppliers')}
          className="text-sm text-blue-600 hover:text-blue-500 flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Suppliers
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Supplier</h1>
        <p className="mt-1 text-sm text-gray-500">Fill in the details to add a new supplier.</p>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormInput
                label="Company Name"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                error={errors.companyName}
                placeholder="e.g., ABC Supplies Inc."
                required
              />
            </div>
            <FormInput
              label="Contact Person"
              name="contactPerson"
              value={form.contactPerson}
              onChange={handleChange}
              error={errors.contactPerson}
              placeholder="Full name"
              required
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="supplier@company.com"
              required
            />
            <FormInput
              label="Phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="+1 (555) 000-0000"
              required
            />
            <FormInput
              label="Tax ID"
              name="taxId"
              value={form.taxId}
              onChange={handleChange}
              placeholder="e.g., 12-3456789"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormInput
                label="Street Address"
                name="street"
                value={form.street}
                onChange={handleChange}
                placeholder="123 Main Street"
              />
            </div>
            <FormInput
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
              error={errors.city}
              placeholder="New York"
              required
            />
            <FormInput
              label="State / Province"
              name="state"
              value={form.state}
              onChange={handleChange}
              placeholder="NY"
            />
            <FormInput
              label="ZIP / Postal Code"
              name="zip"
              value={form.zip}
              onChange={handleChange}
              placeholder="10001"
            />
            <FormInput
              label="Country"
              name="country"
              value={form.country}
              onChange={handleChange}
              error={errors.country}
              placeholder="United States"
              required
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <FormInput
                label="Bank Name"
                name="bankName"
                value={form.bankName}
                onChange={handleChange}
                placeholder="e.g., Chase Bank"
              />
            </div>
            <FormInput
              label="Account Number"
              name="accountNumber"
              value={form.accountNumber}
              onChange={handleChange}
              placeholder="Account number"
            />
            <FormInput
              label="Routing Number"
              name="routingNumber"
              value={form.routingNumber}
              onChange={handleChange}
              placeholder="Routing number"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents (Optional)</h2>
          <FileUpload
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onFileSelect={handleFileSelect}
            multiple
            maxSize={10 * 1024 * 1024}
          />
        </div>

        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate('/suppliers')} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Add Supplier
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddSupplier;
