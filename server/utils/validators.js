const { body, query, param } = require('express-validator');

const validateEmail = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const validatePassword = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),
];

const validatePhone = [
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]{7,15}$/)
    .withMessage('Please provide a valid phone number'),
];

const validateIntent = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required'),
  body('items.*.quantity')
    .isNumeric()
    .withMessage('Item quantity must be a number')
    .custom((value) => value > 0)
    .withMessage('Item quantity must be greater than 0'),
  body('items.*.unit')
    .trim()
    .notEmpty()
    .withMessage('Item unit is required'),
  body('items.*.estimatedPrice')
    .optional()
    .isNumeric()
    .withMessage('Estimated price must be a number'),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required'),
  body('estimatedCost')
    .isNumeric()
    .withMessage('Estimated cost must be a number')
    .custom((value) => value > 0)
    .withMessage('Estimated cost must be greater than 0'),
  body('priority')
    .trim()
    .notEmpty()
    .withMessage('Priority is required')
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, MEDIUM, HIGH, or URGENT'),
  body('justification')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Justification must not exceed 1000 characters'),
  body('deliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Delivery date must be a valid date'),
];

const validateQuotation = [
  body('supplierName')
    .trim()
    .notEmpty()
    .withMessage('Supplier name is required'),
  body('supplierContact')
    .optional()
    .trim(),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required'),
  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .custom((value) => value > 0)
    .withMessage('Quantity must be greater than 0'),
  body('items.*.unitPrice')
    .isNumeric()
    .withMessage('Unit price must be a number')
    .custom((value) => value >= 0)
    .withMessage('Unit price must be non-negative'),
  body('totalAmount')
    .isNumeric()
    .withMessage('Total amount must be a number')
    .custom((value) => value > 0)
    .withMessage('Total amount must be greater than 0'),
  body('validUntil')
    .optional()
    .isISO8601()
    .withMessage('Valid until must be a valid date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
];

const validatePurchaseOrder = [
  body('intentId')
    .trim()
    .notEmpty()
    .withMessage('Intent ID is required'),
  body('supplierName')
    .trim()
    .notEmpty()
    .withMessage('Supplier name is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required'),
  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .custom((value) => value > 0)
    .withMessage('Quantity must be greater than 0'),
  body('items.*.unitPrice')
    .isNumeric()
    .withMessage('Unit price must be a number')
    .custom((value) => value >= 0)
    .withMessage('Unit price must be non-negative'),
  body('totalAmount')
    .isNumeric()
    .withMessage('Total amount must be a number')
    .custom((value) => value > 0)
    .withMessage('Total amount must be greater than 0'),
  body('paymentTerms')
    .optional()
    .trim(),
  body('deliveryTerms')
    .optional()
    .trim(),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
];

const validateDelivery = [
  body('purchaseOrderId')
    .trim()
    .notEmpty()
    .withMessage('Purchase Order ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required'),
  body('items.*.quantityDelivered')
    .isNumeric()
    .withMessage('Quantity delivered must be a number')
    .custom((value) => value >= 0)
    .withMessage('Quantity delivered must be non-negative'),
  body('deliveryDate')
    .isISO8601()
    .withMessage('Delivery date must be a valid date'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'IN_TRANSIT', 'PARTIAL', 'COMPLETED', 'RETURNED'])
    .withMessage('Invalid delivery status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
];

const validateInvoice = [
  body('purchaseOrderId')
    .trim()
    .notEmpty()
    .withMessage('Purchase Order ID is required'),
  body('invoiceNumber')
    .trim()
    .notEmpty()
    .withMessage('Invoice number is required'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => value > 0)
    .withMessage('Amount must be greater than 0'),
  body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateIntent,
  validateQuotation,
  validatePurchaseOrder,
  validateDelivery,
  validateInvoice,
  validatePagination,
};
