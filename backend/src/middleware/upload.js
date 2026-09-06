const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads folder exists
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(6).toString('hex');
    // Sanitize original filename: remove dangerous characters and keep base name
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);

    const safeFilename = `${timestamp}-${randomHex}-${baseName}${ext}`;
    cb(null, safeFilename);
  }
});

// File filter: strictly enforce PDF
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype !== 'application/pdf' && ext !== '.pdf') {
    return cb(new Error('Invalid file type. Only PDF documents are allowed.'), false);
  }
  cb(null, true);
};

// 25 MB limit
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  }
});

module.exports = {
  upload,
  uploadsDir
};
