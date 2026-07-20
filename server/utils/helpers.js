const Intent = require('../models/Intent');

const generateIntentId = async () => {
  const year = new Date().getFullYear();
  const prefix = `INT-${year}-`;

  const lastIntent = await Intent.findOne({
    intentId: { $regex: `^${prefix}` },
  })
    .sort({ intentId: -1 })
    .lean();

  let sequence = 1;
  if (lastIntent && lastIntent.intentId) {
    const lastSeq = parseInt(lastIntent.intentId.split('-')[2], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
};

const truncate = (str, len = 50) => {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
};

const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

module.exports = {
  generateIntentId,
  formatDate,
  calculatePercentage,
  truncate,
  capitalize,
};
