const Supplier = require('../models/Supplier');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const createSupplier = async (req, res) => {
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      taxId,
      bankDetails,
      rating,
      documents,
    } = req.body;

    const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier) {
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
      rating,
      documents,
    });

    return successResponse(res, 201, 'Supplier created successfully', supplier);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 400, 'Supplier with this email already exists');
    }
    return errorResponse(res, 500, error.message || 'Error creating supplier');
  }
};

const getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;

    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    return paginatedResponse(res, suppliers, page, limit, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error fetching suppliers');
  }
};

const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }
    return successResponse(res, 200, 'Supplier retrieved successfully', supplier);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid supplier ID format');
    }
    return errorResponse(res, 500, error.message || 'Error fetching supplier');
  }
};

const updateSupplier = async (req, res) => {
  try {
    const allowedFields = [
      'companyName',
      'contactPerson',
      'email',
      'phone',
      'address',
      'taxId',
      'bankDetails',
      'rating',
      'documents',
      'isActive',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, 'No valid fields to update');
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    if (updates.email && updates.email !== supplier.email) {
      const emailExists = await Supplier.findOne({
        email: updates.email,
        _id: { $ne: supplier._id },
      });
      if (emailExists) {
        return errorResponse(res, 400, 'Email is already in use by another supplier');
      }
    }

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return successResponse(res, 200, 'Supplier updated successfully', updatedSupplier);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 400, 'Supplier email already exists');
    }
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid supplier ID format');
    }
    return errorResponse(res, 500, error.message || 'Error updating supplier');
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    supplier.isActive = false;
    await supplier.save({ validateBeforeSave: false });

    return successResponse(res, 200, 'Supplier deactivated successfully');
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid supplier ID format');
    }
    return errorResponse(res, 500, error.message || 'Error deleting supplier');
  }
};

const getActiveSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true })
      .select('companyName contactPerson email phone rating')
      .sort({ companyName: 1 });

    return successResponse(res, 200, 'Active suppliers retrieved successfully', suppliers);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error fetching active suppliers');
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getActiveSuppliers,
};
