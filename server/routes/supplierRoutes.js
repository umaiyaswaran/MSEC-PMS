const express = require('express');
const { body, validationResult } = require('express-validator');
const Supplier = require('../models/Supplier');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const router = express.Router();

// POST /api/suppliers
router.post(
  '/',
  protect,
  authorize('admin', 'manager'),
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('contactPerson').trim().notEmpty().withMessage('Contact person is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const {
        companyName, contactPerson, email, phone,
        address, taxId, bankDetails, rating, documents,
      } = req.body;

      const existing = await Supplier.findOne({ email });
      if (existing) {
        return errorResponse(res, 400, 'Supplier with this email already exists');
      }

      const supplier = await Supplier.create({
        companyName,
        contactPerson,
        email,
        phone,
        address,
        taxId,
        bankDetails,
        rating: rating || 0,
        documents: documents || [],
      });

      return successResponse(res, 201, 'Supplier created', { supplier });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/suppliers/active
router.get('/active', protect, async (req, res, next) => {
  try {
    const suppliers = await Supplier.find({ isActive: true })
      .sort({ companyName: 1 })
      .lean();

    return successResponse(res, 200, 'Active suppliers retrieved', { suppliers });
  } catch (error) {
    next(error);
  }
});

// GET /api/suppliers
router.get('/', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive, minRating } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (minRating) filter.rating = { $gte: parseFloat(minRating) };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .sort({ companyName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Supplier.countDocuments(filter),
    ]);

    return paginatedResponse(res, suppliers, page, limit, total);
  } catch (error) {
    next(error);
  }
});

// GET /api/suppliers/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id).lean();

    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    return successResponse(res, 200, 'Supplier retrieved', { supplier });
  } catch (error) {
    next(error);
  }
});

// PUT /api/suppliers/:id
router.put(
  '/:id',
  protect,
  authorize('admin', 'manager'),
  async (req, res, next) => {
    try {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) {
        return errorResponse(res, 404, 'Supplier not found');
      }

      const allowedFields = [
        'companyName', 'contactPerson', 'email', 'phone',
        'address', 'taxId', 'bankDetails', 'rating', 'isActive', 'documents',
      ];

      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (updates.email && updates.email !== supplier.email) {
        const existing = await Supplier.findOne({ email: updates.email });
        if (existing) {
          return errorResponse(res, 400, 'Email already in use');
        }
      }

      const updated = await Supplier.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });

      return successResponse(res, 200, 'Supplier updated', { supplier: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/suppliers/:id
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    await Supplier.findByIdAndDelete(req.params.id);

    return successResponse(res, 200, 'Supplier deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
