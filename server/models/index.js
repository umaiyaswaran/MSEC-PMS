const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

module.exports = {
  Counter,
  User: require('./User'),
  Department: require('./Department'),
  Supplier: require('./Supplier'),
  Intent: require('./Intent'),
  Quotation: require('./Quotation'),
  PurchaseOrder: require('./PurchaseOrder'),
  Delivery: require('./Delivery'),
  GoodsReceiptNote: require('./GoodsReceiptNote'),
  Invoice: require('./Invoice'),
  Notification: require('./Notification'),
  AuditLog: require('./AuditLog'),
  Payment: require('./Payment'),
};
