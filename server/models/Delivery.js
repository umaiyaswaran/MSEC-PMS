const mongoose = require('mongoose');

const DeliveryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    orderedQuantity: { type: Number, required: true, min: [1, 'Ordered quantity must be at least 1'] },
    deliveredQuantity: { type: Number, default: 0, min: [0, 'Delivered quantity cannot be negative'] },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'DELIVERED', 'REJECTED'],
      default: 'PENDING',
    },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const DeliveryDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String },
  },
  { _id: false }
);

const DeliverySchema = new mongoose.Schema(
  {
    intent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Intent',
      required: [true, 'Intent reference is required'],
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
    deliveryNumber: {
      type: String,
      unique: true,
    },
    items: [DeliveryItemSchema],
    type: {
      type: String,
      enum: ['PARTIAL', 'FULL'],
    },
    deliveryDate: {
      type: Date,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    condition: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    documents: [DeliveryDocumentSchema],
    status: {
      type: String,
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

DeliverySchema.index({ deliveryNumber: 1 });
DeliverySchema.index({ intent: 1 });
DeliverySchema.index({ purchaseOrder: 1 });
DeliverySchema.index({ supplier: 1 });
DeliverySchema.index({ status: 1 });
DeliverySchema.index({ createdAt: -1 });

DeliverySchema.pre('save', async function (next) {
  if (this.isNew && !this.deliveryNumber) {
    const Counter = mongoose.model('Counter');
    const counter = await Counter.findOneAndUpdate(
      { _id: 'deliveryNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.deliveryNumber = `DEL-${String(counter.seq).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Delivery', DeliverySchema);
