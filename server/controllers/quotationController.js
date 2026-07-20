const Quotation = require('../models/Quotation');
const Intent = require('../models/Intent');
const Supplier = require('../models/Supplier');
const { successResponse, errorResponse } = require('../utils/response');
const { INTENT_STATUSES } = require('../utils/constants');

const uploadQuotation = async (req, res) => {
  try {
    const { intentId } = req.params;
    const {
      supplier,
      quotationNumber,
      items,
      totalAmount,
      deliveryDays,
      paymentTerms,
      validityDays,
    } = req.body;

    const intent = await Intent.findById(intentId);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    const existingQuotation = await Quotation.findOne({
      intent: intentId,
      supplier,
    });
    if (existingQuotation) {
      return errorResponse(
        res,
        400,
        'A quotation from this supplier already exists for this intent'
      );
    }

    const files = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        files.push({
          name: file.originalname,
          url: file.path || `/uploads/quotations/${file.filename}`,
          uploadedAt: new Date(),
        });
      }
    }

    const quotation = await Quotation.create({
      intent: intentId,
      supplier,
      quotationNumber,
      files,
      items,
      totalAmount,
      deliveryDays,
      paymentTerms,
      validityDays,
      status: 'SUBMITTED',
    });

    intent.quotations.push(quotation._id);

    if (
      intent.status === INTENT_STATUSES.PENDING_QUOTATION ||
      intent.status === INTENT_STATUSES.PENDING_MANAGER_APPROVAL
    ) {
      intent.status = INTENT_STATUSES.PENDING_QUOTATION;
      intent.statusHistory.push({
        status: INTENT_STATUSES.PENDING_QUOTATION,
        changedBy: req.user._id,
        changedAt: new Date(),
        remarks: `Quotation received from ${supplierDoc.companyName}`,
      });
    }

    await intent.save();

    const populatedQuotation = await Quotation.findById(quotation._id)
      .populate('supplier', 'companyName contactPerson email')
      .populate('intent', 'intentId title');

    return successResponse(res, 201, 'Quotation uploaded successfully', populatedQuotation);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error uploading quotation');
  }
};

const getQuotationsByIntent = async (req, res) => {
  try {
    const { intentId } = req.params;

    const intent = await Intent.findById(intentId);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    const quotations = await Quotation.find({ intent: intentId })
      .populate('supplier', 'companyName contactPerson email phone rating')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Quotations retrieved successfully', quotations);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid intent ID format');
    }
    return errorResponse(res, 500, error.message || 'Error fetching quotations');
  }
};

const selectSupplier = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const { remarks } = req.body;

    const quotation = await Quotation.findById(quotationId).populate('supplier', 'companyName');
    if (!quotation) {
      return errorResponse(res, 404, 'Quotation not found');
    }

    const intent = await Intent.findById(quotation.intent);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    const selectableStatuses = [
      INTENT_STATUSES.PENDING_QUOTATION,
      INTENT_STATUSES.QUOTATION_COLLECTED,
      INTENT_STATUSES.PENDING_MANAGER_APPROVAL,
    ];

    if (!selectableStatuses.includes(intent.status)) {
      return errorResponse(
        res,
        400,
        `Cannot select supplier for intent with status: ${intent.status}`
      );
    }

    await Quotation.updateMany(
      { intent: intent._id, _id: { $ne: quotationId } },
      { $set: { isSelected: false, status: 'REJECTED' } }
    );

    quotation.isSelected = true;
    quotation.status = 'SELECTED';
    await quotation.save();

    intent.selectedSupplier = quotation.supplier._id;
    intent.status = INTENT_STATUSES.QUOTATION_COLLECTED;
    intent.statusHistory.push({
      status: INTENT_STATUSES.QUOTATION_COLLECTED,
      changedBy: req.user._id,
      changedAt: new Date(),
      remarks: remarks || `Supplier selected: ${quotation.supplier.companyName}`,
    });

    await intent.save();

    const updatedIntent = await Intent.findById(intent._id)
      .populate('requester', 'name email')
      .populate('department', 'name')
      .populate('selectedSupplier', 'companyName contactPerson email');

    return successResponse(res, 200, 'Supplier selected successfully', {
      quotation,
      intent: updatedIntent,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid quotation ID format');
    }
    return errorResponse(res, 500, error.message || 'Error selecting supplier');
  }
};

const updateQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const {
      quotationNumber,
      items,
      totalAmount,
      deliveryDays,
      paymentTerms,
      validityDays,
    } = req.body;

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return errorResponse(res, 404, 'Quotation not found');
    }

    if (quotation.status === 'SELECTED') {
      return errorResponse(res, 400, 'Cannot update a selected quotation');
    }

    const updates = {};
    if (quotationNumber !== undefined) updates.quotationNumber = quotationNumber;
    if (items !== undefined) updates.items = items;
    if (totalAmount !== undefined) updates.totalAmount = totalAmount;
    if (deliveryDays !== undefined) updates.deliveryDays = deliveryDays;
    if (paymentTerms !== undefined) updates.paymentTerms = paymentTerms;
    if (validityDays !== undefined) updates.validityDays = validityDays;

    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map((file) => ({
        name: file.originalname,
        url: file.path || `/uploads/quotations/${file.filename}`,
        uploadedAt: new Date(),
      }));
      updates.$push = { files: { $each: newFiles } };
    }

    let updatedQuotation;
    if (updates.$push) {
      const { $push, ...setUpdates } = updates;
      updatedQuotation = await Quotation.findByIdAndUpdate(
        quotationId,
        { $set: setUpdates, $push },
        { new: true, runValidators: true }
      ).populate('supplier', 'companyName contactPerson email');
    } else {
      updatedQuotation = await Quotation.findByIdAndUpdate(
        quotationId,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('supplier', 'companyName contactPerson email');
    }

    return successResponse(res, 200, 'Quotation updated successfully', updatedQuotation);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid quotation ID format');
    }
    return errorResponse(res, 500, error.message || 'Error updating quotation');
  }
};

const deleteQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return errorResponse(res, 404, 'Quotation not found');
    }

    if (quotation.status === 'SELECTED') {
      return errorResponse(res, 400, 'Cannot delete a selected quotation');
    }

    const intent = await Intent.findById(quotation.intent);
    if (intent) {
      intent.quotations = intent.quotations.filter(
        (id) => id.toString() !== quotationId
      );
      await intent.save();
    }

    await Quotation.findByIdAndDelete(quotationId);

    return successResponse(res, 200, 'Quotation deleted successfully');
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid quotation ID format');
    }
    return errorResponse(res, 500, error.message || 'Error deleting quotation');
  }
};

module.exports = {
  uploadQuotation,
  getQuotationsByIntent,
  selectSupplier,
  updateQuotation,
  deleteQuotation,
};
