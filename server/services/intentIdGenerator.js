const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const Counter = mongoose.model('Counter', counterSchema);

const generateIntentId = async () => {
  const year = new Date().getFullYear();
  const prefix = `INT-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: `intentId-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const sequence = String(counter.seq).padStart(4, '0');
  return `${prefix}-${sequence}`;
};

module.exports = generateIntentId;
