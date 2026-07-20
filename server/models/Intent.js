const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

const IntentItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    unit: { type: String, trim: true },
    estimatedUnitPrice: { type: Number, min: [0, 'Price cannot be negative'] },
    category: { type: String, trim: true },
  },
  { _id: false }
);

const StatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ApprovalSchema = new mongoose.Schema(
  {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    remarks: { type: String, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  { _id: false }
);

const IntentSchema = new mongoose.Schema(
  {
    intentId: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester is required'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    items: [IntentItemSchema],
    estimatedCost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
      default: 0,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      default: 'DRAFT',
    },
    category: {
      type: String,
      enum: ['GOODS', 'SERVICE', 'SUB_CONTRACTOR'],
      default: 'GOODS',
    },
    statusHistory: [StatusHistorySchema],
    documents: [DocumentSchema],
    managerApproval: ApprovalSchema,
    adminApproval: ApprovalSchema,
    selectedSupplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    quotations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation',
      },
    ],
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery',
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
  },
  { timestamps: true }
);

IntentSchema.index({ intentId: 1 });
IntentSchema.index({ requester: 1 });
IntentSchema.index({ department: 1 });
IntentSchema.index({ status: 1 });
IntentSchema.index({ priority: 1 });
IntentSchema.index({ createdAt: -1 });

IntentSchema.pre('save', async function (next) {
  if (this.isNew && !this.intentId) {
    const Counter = mongoose.model('Counter');
    const counter = await Counter.findOneAndUpdate(
      { _id: 'intentId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.intentId = `INT-${String(counter.seq).padStart(6, '0')}`;
  }
  next();
});

IntentSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: 'DRAFT',
      changedBy: this.requester,
      changedAt: new Date(),
      remarks: 'Intent created',
    });
  }
  next();
});

module.exports = mongoose.model('Intent', IntentSchema);
