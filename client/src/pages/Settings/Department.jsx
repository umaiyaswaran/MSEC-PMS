import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import Loader from '../../components/Loader/Loader';
import Button from '../../components/Buttons/Button';
import DataTable from '../../components/Tables/DataTable';
import SearchInput from '../../components/Inputs/SearchInput';
import Modal from '../../components/Modal/Modal';
import FormInput from '../../components/Forms/FormInput';
import FormTextArea from '../../components/Forms/FormTextArea';
import FormSelect from '../../components/Forms/FormSelect';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { showSuccess, showError } from '../../components/Notification/NotificationToast';

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', head: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, name: '' });

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/departments');
      setDepartments(data.departments || data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/users', { params: { limit: 100 } });
      setUsers(data.users || data.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditingDept(null);
    setFormData({ name: '', description: '', head: '' });
    setShowModal(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name || '',
      description: dept.description || '',
      head: dept.head?._id || dept.head || '',
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDept) {
        await axios.put(`/departments/${editingDept._id || editingDept.id}`, formData);
        showSuccess('Department updated successfully');
      } else {
        await axios.post('/departments', formData);
        showSuccess('Department created successfully');
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      showError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/departments/${confirmDialog.id}`);
      showSuccess('Department deleted successfully');
      fetchDepartments();
    } catch (err) {
      showError('Failed to delete department');
    }
    setConfirmDialog({ open: false, id: null, name: '' });
  };

  const userOptions = users.map((u) => ({ value: u._id || u.id, label: u.name }));

  const columns = [
    {
      key: 'name',
      label: 'Department Name',
      render: (value) => <span className="font-medium text-gray-900">{value}</span>,
    },
    {
      key: 'head',
      label: 'Head',
      render: (value) => value?.name || value || 'N/A',
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => <span className="text-gray-600">{value || '-'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDialog({ open: true, id: row._id || row.id, name: row.name })}
            className="text-red-600 hover:text-red-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
          <p className="mt-1 text-sm text-gray-600">Manage organizational departments.</p>
        </div>
        <Button onClick={openAddModal}>Add Department</Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="w-full sm:w-80">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search departments..." />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataTable columns={columns} data={filteredDepartments} loading={loading} emptyMessage="No departments found." />
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingDept ? 'Edit Department' : 'Add Department'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Department Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            required
          />
          <FormTextArea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            rows={3}
          />
          <FormSelect
            label="Department Head"
            name="head"
            value={formData.head}
            onChange={handleFormChange}
            options={userOptions}
            placeholder="Select a head..."
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingDept ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: null, name: '' })}
        onConfirm={handleDelete}
        title="Delete Department"
        message={`Are you sure you want to delete "${confirmDialog.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Department;
