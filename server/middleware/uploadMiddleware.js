const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } = require('../utils/constants');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'server/uploads';

    if (req.baseUrl.includes('intents')) {
      uploadPath = 'server/uploads/intents';
    } else if (req.baseUrl.includes('quotations')) {
      uploadPath = 'server/uploads/quotations';
    } else if (req.baseUrl.includes('invoices')) {
      uploadPath = 'server/uploads/invoices';
    } else if (req.baseUrl.includes('purchase-orders')) {
      uploadPath = 'server/uploads/purchase-orders';
    } else if (req.baseUrl.includes('grns') || req.baseUrl.includes('goods-receipt-notes')) {
      uploadPath = 'server/uploads/grns';
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [...ALLOWED_FILE_TYPES.images, ...ALLOWED_FILE_TYPES.documents];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported. Allowed types: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

const uploadIntentFiles = upload.array('files', 5);
const uploadQuotationFiles = upload.fields([
  { name: 'files', maxCount: 5 },
]);
const uploadInvoiceFiles = upload.array('files', 3);
const uploadPurchaseOrderFiles = upload.array('files', 3);
const uploadGRNFiles = upload.fields([
  { name: 'deliveryImages', maxCount: 5 },
  { name: 'challanFiles', maxCount: 5 },
]);

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the 10MB limit',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

module.exports = {
  upload,
  uploadIntentFiles,
  uploadQuotationFiles,
  uploadInvoiceFiles,
  uploadPurchaseOrderFiles,
  uploadGRNFiles,
  handleUploadError,
};
