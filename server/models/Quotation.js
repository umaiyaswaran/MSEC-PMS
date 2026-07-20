const mongoose = require('mongoose');

const QuotationItemSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    unitPrice: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
    totalPrice: { type: Number, min: [0, 'Total cannot be negative'] },
    deliveryTime: { type: String, trim: true },
    warranty: { type: String, trim: true },
  },
  { _id: false }
);

const QuotationFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const QuotationSchema = new mongoose.Schema(
  {
    intent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Intent',
      required: [true, 'Intent reference is required'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required'],
    },
    quotationNumber: {
      type: String,
      trim: true,
    },
    files: [QuotationFileSchema],
    images: {
      type: [QuotationFileSchema],
      validate: {
        validator: function (v) {
          return v.length <= 3;
        },
        message: 'Maximum 3 quotation images allowed',
      },
    },
    items: [QuotationItemSchema],
    totalAmount: {
      type: Number,
      min: [0, 'Amount cannot be negative'],
    },
    deliveryDays: {
      type: Number,
      min: [0, 'Delivery days cannot be negative'],
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    validityDays: {
      type: Number,
      min: [1, 'Validity must be at least 1 day'],
    },
    notes: {
      type: String,
      trim: true,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'SELECTED', 'REJECTED'],
      default: 'DRAFT',
    },
  },
  { timestamps: true }
);

QuotationSchema.index({ intent: 1 });
QuotationSchema.index({ supplier: 1 });
QuotationSchema.index({ status: 1 });
QuotationSchema.index({ intent: 1, supplier: 1 });

module.exports = mongoose.model('Quotation', QuotationSchema);
