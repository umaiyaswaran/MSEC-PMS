const { Invoice, Intent, PurchaseOrder, Supplier, Payment, AuditLog } = require('../models/index');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { INVOICE_STATUSES, INTENT_STATUSES } = require('../utils/constants');

const uploadInvoice = async (req, res) => {
  try {
    const { intentId, purchaseOrderId, supplierId, invoiceNumber, invoiceDate, dueDate, amount, tax, totalAmount } = req.body;

    if (!intentId || !purchaseOrderId || !supplierId || !invoiceNumber || !invoiceDate) {
      return errorResponse(res, 400, 'Intent ID, Purchase Order ID, Supplier ID, Invoice Number, and Invoice Date are required');
    }

    const intent = await Intent.findById(intentId);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    const existingInvoice = await Invoice.findOne({ invoiceNumber });
    if (existingInvoice) {
      return errorResponse(res, 400, 'Invoice with this number already exists');
    }

    const files = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        files.push({
          name: file.originalname,
          url: file.path,
          type: file.mimetype,
        });
      });
    }

    const computedTotal = totalAmount || (amount || 0) + (tax || 0);

    const invoice = await Invoice.create({
      intent: intentId,
      purchaseOrder: purchaseOrderId,
      supplier: supplierId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      amount: amount || 0,
      tax: tax || 0,
      totalAmount: computedTotal,
      files,
      status: INVOICE_STATUSES.UPLOADED,
      paymentStatus: 'UNPAID',
    });

    await Intent.findByIdAndUpdate(intentId, { status: INTENT_STATUSES.INVOICE_UPLOADED });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE',
      entity: 'Invoice',
      entityId: invoice._id,
      newData: { invoiceNumber, amount, totalAmount: computedTotal },
      ipAddress: req.ip,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson');

    return successResponse(res, 201, 'Invoice uploaded successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to upload invoice');
  }
};

const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, startDate, endDate, search, sort = '-createdAt' } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('intent', 'intentId title status')
        .populate('purchaseOrder', 'poNumber')
        .populate('supplier', 'companyName contactPerson')
        .populate('verifiedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return paginatedResponse(res, invoices, pageNum, limitNum, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch invoices');
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('intent', 'intentId title description status requester')
      .populate({
        path: 'intent',
        populate: [
          { path: 'requester', select: 'name email department' },
          { path: 'department', select: 'name' },
        ],
      })
      .populate('purchaseOrder', 'poNumber type items totalAmount grandTotal')
      .populate('supplier', 'companyName contactPerson email phone address')
      .populate('verifiedBy', 'name email')
      .lean();

    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    return successResponse(res, 200, 'Invoice retrieved successfully', invoice);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch invoice');
  }
};

const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    const allowedUpdates = ['invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'tax', 'totalAmount', 'files'];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map((file) => ({
        name: file.originalname,
        url: file.path,
        type: file.mimetype,
      }));
      updates.files = [...(invoice.files || []), ...newFiles];
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, 'No valid fields to update');
    }

    if (updates.amount !== undefined || updates.tax !== undefined) {
      const amt = updates.amount !== undefined ? updates.amount : invoice.amount;
      const tx = updates.tax !== undefined ? updates.tax : invoice.tax;
      updates.totalAmount = amt + tx;
    }

    const oldData = {
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      tax: invoice.tax,
      totalAmount: invoice.totalAmount,
    };

    Object.assign(invoice, updates);
    await invoice.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'UPDATE',
      entity: 'Invoice',
      entityId: invoice._id,
      oldData,
      newData: updates,
      ipAddress: req.ip,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson');

    return successResponse(res, 200, 'Invoice updated successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to update invoice');
  }
};

const verifyInvoice = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Only admins can verify invoices');
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    if (invoice.status === INVOICE_STATUSES.VERIFIED || invoice.status === INVOICE_STATUSES.APPROVED) {
      return errorResponse(res, 400, 'Invoice is already verified or approved');
    }

    invoice.status = INVOICE_STATUSES.VERIFIED;
    invoice.verifiedBy = req.user._id;
    invoice.verifiedAt = new Date();

    await invoice.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'VERIFY',
      entity: 'Invoice',
      entityId: invoice._id,
      newData: { status: INVOICE_STATUSES.VERIFIED },
      ipAddress: req.ip,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson')
      .populate('verifiedBy', 'name email');

    return successResponse(res, 200, 'Invoice verified successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to verify invoice');
  }
};

const approveInvoice = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Only admins can approve invoices');
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    if (invoice.status === INVOICE_STATUSES.APPROVED || invoice.status === INVOICE_STATUSES.PAID) {
      return errorResponse(res, 400, 'Invoice is already approved or paid');
    }

    invoice.status = INVOICE_STATUSES.APPROVED;
    await invoice.save();

    await Intent.findByIdAndUpdate(invoice.intent, { status: INTENT_STATUSES.PAYMENT_PENDING });

    await AuditLog.create({
      user: req.user._id,
      action: 'APPROVE',
      entity: 'Invoice',
      entityId: invoice._id,
      newData: { status: INVOICE_STATUSES.APPROVED },
      ipAddress: req.ip,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson')
      .populate('verifiedBy', 'name email');

    return successResponse(res, 200, 'Invoice approved for payment', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to approve invoice');
  }
};

const rejectInvoice = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Only admins can reject invoices');
    }

    const { reason } = req.body;
    if (!reason) {
      return errorResponse(res, 400, 'Rejection reason is required');
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    invoice.status = INVOICE_STATUSES.REJECTED;
    await invoice.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'REJECT',
      entity: 'Invoice',
      entityId: invoice._id,
      newData: { status: INVOICE_STATUSES.REJECTED, reason },
      ipAddress: req.ip,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson');

    return successResponse(res, 200, 'Invoice rejected', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to reject invoice');
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, paymentReference, paymentAmount } = req.body;
    const validPaymentStatuses = ['UNPAID', 'PARTIAL', 'PAID'];

    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
      return errorResponse(res, 400, `Payment status must be one of: ${validPaymentStatuses.join(', ')}`);
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    const oldPaymentStatus = invoice.paymentStatus;

    invoice.paymentStatus = paymentStatus;
    invoice.paymentMethod = paymentMethod || invoice.paymentMethod;
    invoice.paymentReference = paymentReference || invoice.paymentReference;

    if (paymentStatus === 'PAID') {
      invoice.paymentDate = new Date();
      invoice.status = INVOICE_STATUSES.PAID;
    } else if (paymentStatus === 'PARTIAL' && paymentAmount) {
      invoice.paymentDate = new Date();
    }

    await invoice.save();

    if (paymentStatus === 'PAID') {
      await Intent.findByIdAndUpdate(invoice.intent, { status: INTENT_STATUSES.PAYMENT_COMPLETED });

      await Payment.create({
        intent: invoice.intent,
        invoice: invoice._id,
        purchaseOrder: invoice.purchaseOrder,
        amount: paymentAmount || invoice.totalAmount,
        paymentDate: new Date(),
        paymentMethod: invoice.paymentMethod,
        referenceNumber: invoice.paymentReference,
        status: 'COMPLETED',
        processedBy: req.user._id,
      });
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'UPDATE_PAYMENT_STATUS',
      entity: 'Invoice',
      entityId: invoice._id,
      oldData: { paymentStatus: oldPaymentStatus },
      newData: { paymentStatus, paymentMethod, paymentReference },
      ipAddress: req.ip,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson');

    return successResponse(res, 200, 'Payment status updated successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to update payment status');
  }
};

const getInvoicesByIntent = async (req, res) => {
  try {
    const { intentId } = req.params;
    const { page = 1, limit = 20, status, paymentStatus } = req.query;

    const filter = { intent: intentId };
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('intent', 'intentId title')
        .populate('purchaseOrder', 'poNumber')
        .populate('supplier', 'companyName contactPerson')
        .populate('verifiedBy', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return paginatedResponse(res, invoices, pageNum, limitNum, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch invoices');
  }
};

module.exports = {
  uploadInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  verifyInvoice,
  approveInvoice,
  rejectInvoice,
  updatePaymentStatus,
  getInvoicesByIntent,
};
