const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zip: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    taxId: {
      type: String,
      trim: true,
    },
    bankDetails: {
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      routingNumber: { type: String, trim: true },
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
      },
    ],
  },
  { timestamps: true }
);

SupplierSchema.index({ companyName: 1 });
SupplierSchema.index({ email: 1 });
SupplierSchema.index({ isActive: 1 });

module.exports = mongoose.model('Supplier', SupplierSchema);
