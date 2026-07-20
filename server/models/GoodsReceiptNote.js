const mongoose = require('mongoose');

const GRNItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    orderedQuantity: { type: Number, required: true, min: [1, 'Ordered quantity must be at least 1'] },
    receivedQuantity: { type: Number, required: true, min: [0, 'Received quantity cannot be negative'] },
    remainingQuantity: { type: Number, required: true, min: [0, 'Remaining quantity cannot be negative'] },
    unitPrice: { type: Number, min: [0, 'Unit price cannot be negative'] },
    totalPrice: { type: Number, min: [0, 'Total price cannot be negative'] },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const GRNDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String },
  },
  { _id: false }
);

const GoodsReceiptNoteSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      unique: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'Purchase order reference is required'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required'],
    },
    items: [GRNItemSchema],
    totalOrderedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Total ordered quantity cannot be negative'],
    },
    totalReceivedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Total received quantity cannot be negative'],
    },
    totalRemainingQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Total remaining quantity cannot be negative'],
    },
    deliveryDate: {
      type: Date,
      required: [true, 'Delivery date is required'],
    },
    vehicleNumber: { type: String, trim: true },
    driverName: { type: String, trim: true },
    challanNumber: { type: String, trim: true },
    remarks: { type: String, trim: true },
    challanDocuments: [GRNDocumentSchema],
    deliveryDocuments: [GRNDocumentSchema],
    storeManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Store manager reference is required'],
    },
    status: {
      type: String,
      enum: ['PARTIAL', 'FINAL'],
      default: 'PARTIAL',
    },
  },
  { timestamps: true }
);

GoodsReceiptNoteSchema.index({ grnNumber: 1 });
GoodsReceiptNoteSchema.index({ purchaseOrder: 1 });
GoodsReceiptNoteSchema.index({ supplier: 1 });
GoodsReceiptNoteSchema.index({ storeManager: 1 });
GoodsReceiptNoteSchema.index({ createdAt: -1 });

GoodsReceiptNoteSchema.pre('save', async function (next) {
  if (this.isNew && !this.grnNumber) {
    const Counter = mongoose.model('Counter');
    const counter = await Counter.findOneAndUpdate(
      { _id: 'grnNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.grnNumber = `GRN-${String(counter.seq).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('GoodsReceiptNote', GoodsReceiptNoteSchema);
