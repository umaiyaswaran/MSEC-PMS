export const API_BASE_URL = '/api';

export const INTENT_STATUSES = {
  DRAFT: 'DRAFT',
  PENDING_MANAGER_APPROVAL: 'PENDING_MANAGER_APPROVAL',
  REJECTED_BY_MANAGER: 'REJECTED_BY_MANAGER',
  PENDING_QUOTATION: 'PENDING_QUOTATION',
  QUOTATION_COLLECTED: 'QUOTATION_COLLECTED',
  PENDING_PO: 'PENDING_PO',
  SAMPLE_PO_CREATED: 'SAMPLE_PO_CREATED',
  PENDING_ADMIN_APPROVAL: 'PENDING_ADMIN_APPROVAL',
  REJECTED_BY_ADMIN: 'REJECTED_BY_ADMIN',
  PO_APPROVED: 'PO_APPROVED',
  PO_SENT: 'PO_SENT',
  DELIVERY_PENDING: 'DELIVERY_PENDING',
  PARTIAL_DELIVERY: 'PARTIAL_DELIVERY',
  FULL_DELIVERY: 'FULL_DELIVERY',
  INVOICE_UPLOADED: 'INVOICE_UPLOADED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  CLOSED: 'CLOSED',
};

export const INTENT_STATUS_LABELS = {
  [INTENT_STATUSES.DRAFT]: 'Draft',
  [INTENT_STATUSES.PENDING_MANAGER_APPROVAL]: 'Pending Manager Approval',
  [INTENT_STATUSES.REJECTED_BY_MANAGER]: 'Rejected by Manager',
  [INTENT_STATUSES.PENDING_QUOTATION]: 'Pending Quotation',
  [INTENT_STATUSES.QUOTATION_COLLECTED]: 'Quotation Collected',
  [INTENT_STATUSES.PENDING_PO]: 'Pending PO',
  [INTENT_STATUSES.SAMPLE_PO_CREATED]: 'Sample PO',
  [INTENT_STATUSES.PENDING_ADMIN_APPROVAL]: 'Pending Admin Approval',
  [INTENT_STATUSES.REJECTED_BY_ADMIN]: 'Rejected by Admin',
  [INTENT_STATUSES.PO_APPROVED]: 'PO Approved',
  [INTENT_STATUSES.PO_SENT]: 'PO Sent',
  [INTENT_STATUSES.DELIVERY_PENDING]: 'Delivery Pending',
  [INTENT_STATUSES.PARTIAL_DELIVERY]: 'Partial Delivery',
  [INTENT_STATUSES.FULL_DELIVERY]: 'Full Delivery',
  [INTENT_STATUSES.INVOICE_UPLOADED]: 'Invoice Uploaded',
  [INTENT_STATUSES.PAYMENT_PENDING]: 'Payment Pending',
  [INTENT_STATUSES.PAYMENT_COMPLETED]: 'Payment Completed',
  [INTENT_STATUSES.CLOSED]: 'Closed',
};

export const INTENT_STATUS_COLORS = {
  [INTENT_STATUSES.DRAFT]: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' },
  [INTENT_STATUSES.PENDING_MANAGER_APPROVAL]: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400' },
  [INTENT_STATUSES.REJECTED_BY_MANAGER]: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-400' },
  [INTENT_STATUSES.PENDING_QUOTATION]: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-400' },
  [INTENT_STATUSES.QUOTATION_COLLECTED]: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-400' },
  [INTENT_STATUSES.PENDING_PO]: { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-400' },
  [INTENT_STATUSES.SAMPLE_PO_CREATED]: { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-400' },
  [INTENT_STATUSES.PENDING_ADMIN_APPROVAL]: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-400' },
  [INTENT_STATUSES.REJECTED_BY_ADMIN]: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-400' },
  [INTENT_STATUSES.PO_APPROVED]: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-400' },
  [INTENT_STATUSES.PO_SENT]: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-400' },
  [INTENT_STATUSES.DELIVERY_PENDING]: { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-400' },
  [INTENT_STATUSES.PARTIAL_DELIVERY]: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-400' },
  [INTENT_STATUSES.FULL_DELIVERY]: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-400' },
  [INTENT_STATUSES.INVOICE_UPLOADED]: { bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-400' },
  [INTENT_STATUSES.PAYMENT_PENDING]: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-400' },
  [INTENT_STATUSES.PAYMENT_COMPLETED]: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-400' },
  [INTENT_STATUSES.CLOSED]: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

export const PRIORITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const PRIORITY_LABELS = {
  [PRIORITY_LEVELS.LOW]: 'Low',
  [PRIORITY_LEVELS.MEDIUM]: 'Medium',
  [PRIORITY_LEVELS.HIGH]: 'High',
  [PRIORITY_LEVELS.URGENT]: 'Urgent',
};

export const PRIORITY_COLORS = {
  [PRIORITY_LEVELS.LOW]: { bg: 'bg-gray-100', text: 'text-gray-800' },
  [PRIORITY_LEVELS.MEDIUM]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [PRIORITY_LEVELS.HIGH]: { bg: 'bg-orange-100', text: 'text-orange-800' },
  [PRIORITY_LEVELS.URGENT]: { bg: 'bg-red-100', text: 'text-red-800' },
};

export const ROLES = {
  USER: 'user',
  MANAGER: 'manager',
  ADMIN: 'admin',
  STORE_MANAGER: 'store_manager',
};

export const ROLE_LABELS = {
  [ROLES.USER]: 'User',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.STORE_MANAGER]: 'Store Manager',
};

export const ROLE_COLORS = {
  [ROLES.USER]: 'badge-gray',
  [ROLES.MANAGER]: 'badge-primary',
  [ROLES.ADMIN]: 'badge-danger',
  [ROLES.STORE_MANAGER]: 'badge-emerald',
};

export const STATUS_BADGE_COLOR = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_MANAGER_APPROVAL: 'bg-yellow-100 text-yellow-800',
  REJECTED_BY_MANAGER: 'bg-red-100 text-red-800',
  PENDING_QUOTATION: 'bg-blue-100 text-blue-800',
  QUOTATION_COLLECTED: 'bg-blue-100 text-blue-800',
  PENDING_PO: 'bg-indigo-100 text-indigo-800',
  SAMPLE_PO_CREATED: 'bg-indigo-100 text-indigo-800',
  PENDING_ADMIN_APPROVAL: 'bg-purple-100 text-purple-800',
  REJECTED_BY_ADMIN: 'bg-red-100 text-red-800',
  PO_APPROVED: 'bg-green-100 text-green-800',
  PO_SENT: 'bg-green-100 text-green-800',
  DELIVERY_PENDING: 'bg-indigo-100 text-indigo-800',
  PARTIAL_DELIVERY: 'bg-orange-100 text-orange-800',
  FULL_DELIVERY: 'bg-green-100 text-green-800',
  INVOICE_UPLOADED: 'bg-teal-100 text-teal-800',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
  PAYMENT_COMPLETED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-600',
};

export const PRIORITY_BADGE_COLOR = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
export const TIME_FORMAT = 'HH:mm';

export const ITEMS_PER_PAGE = 10;

export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:token',
  DASHBOARD: '/dashboard',
  INTENTS: '/intents',
  INTENT_NEW: '/intents/create',
  INTENT_DETAIL: '/intents/:id',
  INTENT_EDIT: '/intents/:id/edit',
  MANAGER: '/manager',
  MANAGER_REVIEWS: '/manager/reviews',
  MANAGER_TEAM: '/manager/team',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_DEPARTMENTS: '/admin/departments',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_SETTINGS: '/admin/settings',
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_SECURITY: '/settings/security',
};
