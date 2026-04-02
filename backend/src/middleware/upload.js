const multer = require('multer');
const { AppError } = require('./errorHandler');

// Use memory storage — files are buffered in memory and then
// uploaded to Cloudflare R2 in the route handler.
const storage = multer.memoryStorage();

// File filter — only PDF and DOCX
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF and DOCX files are allowed.', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
});

module.exports = upload;
