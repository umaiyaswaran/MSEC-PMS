const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadGRNFiles, handleUploadError } = require('../middleware/uploadMiddleware');
const {
  createGoodsReceiptNote,
  getGoodsReceiptNotes,
  getGoodsReceiptNoteById,
} = require('../controllers/goodsReceiptNoteController');

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('store_manager', 'admin'),
  uploadGRNFiles,
  handleUploadError,
  createGoodsReceiptNote
);

router.get('/', protect, authorize('store_manager', 'manager', 'admin'), getGoodsReceiptNotes);
router.get('/:id', protect, authorize('store_manager', 'manager', 'admin'), getGoodsReceiptNoteById);

module.exports = router;
