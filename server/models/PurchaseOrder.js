const mongoose = require('mongoose');

const POItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    receivedQuantity: { type: Number, default: 0, min: [0, 'Received quantity cannot be negative'] },
    remainingQuantity: { type: Number, default: 0, min: [0, 'Remaining quantity cannot be negative'] },
    unitPrice: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
    totalPrice: { type: Number, min: [0, 'Total cannot be negative'] },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const POStatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const PODocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String },
  },
  { _id: false }
);

const DeliveryAddressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      unique: true,
    },
    intent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Intent',
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required'],
    },
    type: {
      type: String,
      enum: ['SAMPLE', 'ORIGINAL', 'OPEN'],
      default: 'SAMPLE',
    },
    poType: {
      type: String,
      enum: ['NORMAL', 'OPEN'],
      default: 'NORMAL',
    },
    items: [POItemSchema],
    totalOrderedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Total ordered quantity cannot be negative'],
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Received quantity cannot be negative'],
    },
    remainingQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Remaining quantity cannot be negative'],
    },
    totalAmount: {
      type: Number,
      min: [0, 'Amount cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative'],
    },
    grandTotal: {
      type: Number,
      min: [0, 'Grand total cannot be negative'],
    },
    deliveryDate: {
      type: Date,
    },
    deliveryAddress: DeliveryAddressSchema,
    paymentTerms: {
      type: String,
      trim: true,
    },
    specialInstructions: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      default: 'DRAFT',
    },
    statusHistory: [POStatusHistorySchema],
    adminApproval: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date },
      remarks: { type: String, trim: true },
      status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
      },
    },
    documents: [PODocumentSchema],
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ poNumber: 1 });
PurchaseOrderSchema.index({ intent: 1 });
PurchaseOrderSchema.index({ supplier: 1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ createdAt: -1 });

PurchaseOrderSchema.pre('save', async function (next) {
  if (this.items && this.items.length > 0) {
    this.items = this.items.map((item) => {
      const source = item && typeof item.toObject === 'function' ? item.toObject() : item;
      const received = source.receivedQuantity || 0;
      const remaining = source.remainingQuantity !== undefined ? source.remainingQuantity : Math.max(source.quantity - received, 0);
      return {
        ...source,
        receivedQuantity: received,
        remainingQuantity: remaining,
      };
    });

    this.totalOrderedQuantity = this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    this.receivedQuantity = this.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    this.remainingQuantity = Math.max(this.totalOrderedQuantity - this.receivedQuantity, 0);
  } else {
    this.totalOrderedQuantity = 0;
    this.receivedQuantity = 0;
    this.remainingQuantity = 0;
  }

  if (this.isNew && !this.poNumber) {
    const Counter = mongoose.model('Counter');
    const counter = await Counter.findOneAndUpdate(
      { _id: 'poNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.poNumber = `PO-${String(counter.seq).padStart(6, '0')}`;
  }

  if (this.isNew) {
    const initialStatus = this.poType === 'OPEN' ? 'OPEN' : 'DRAFT';
    this.status = this.status || initialStatus;
    this.statusHistory.push({
      status: this.status,
      changedBy: this.adminApproval?.approvedBy || this._id,
      changedAt: new Date(),
      remarks: 'Purchase order created',
    });
  }

  next();
});

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
