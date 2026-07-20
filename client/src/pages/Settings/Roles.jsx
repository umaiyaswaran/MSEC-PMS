import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import Loader from '../../components/Loader/Loader';

const ROLES_DATA = [
  {
    name: 'User',
    value: 'user',
    description: 'Standard user with basic procurement request capabilities.',
    permissions: [
      'Create procurement intents',
      'View own intents',
      'Upload supporting documents',
      'Track intent status',
      'View own reports',
      'Manage own profile',
    ],
    color: 'bg-gray-100 border-gray-300',
    badgeColor: 'bg-gray-200 text-gray-800',
  },
  {
    name: 'Manager',
    value: 'manager',
    description: 'Team manager with review and approval responsibilities.',
    permissions: [
      'All User permissions',
      'Review team procurement intents',
      'Approve/Reject intents',
      'Request revisions',
      'View team reports',
      'Manage team members',
      'Delegate approval tasks',
    ],
    color: 'bg-blue-50 border-blue-300',
    badgeColor: 'bg-blue-200 text-blue-800',
  },
  {
    name: 'Administrator',
    value: 'admin',
    description: 'System administrator with full access to all features and settings.',
    permissions: [
      'All Manager permissions',
      'Manage all users',
      'Manage departments',
      'System configuration',
      'View all reports and analytics',
      'Manage system roles',
      'Access audit logs',
      'Export system data',
    ],
    color: 'bg-red-50 border-red-300',
    badgeColor: 'bg-red-200 text-red-800',
  },
];

const Roles = () => {
  const [roleCounts, setRoleCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoleCounts();
  }, []);

  const fetchRoleCounts = async () => {
    try {
      const { data } = await axios.get('/users/role-counts');
      setRoleCounts(data.counts || data || {});
    } catch (err) {
      console.error('Failed to fetch role counts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader message="Loading roles..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
        <p className="mt-1 text-sm text-gray-600">View system roles and their permissions.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              System roles are predefined and cannot be modified. Contact your system administrator for role changes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ROLES_DATA.map((role) => (
          <div
            key={role.value}
            className={`rounded-lg border-2 p-6 ${role.color}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{role.name}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${role.badgeColor}`}>
                {roleCounts[role.value] || 0} users
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{role.description}</p>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Permissions:</h4>
              <ul className="space-y-1.5">
                {role.permissions.map((permission, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Roles;
