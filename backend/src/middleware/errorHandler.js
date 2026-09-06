const multer = require('multer');

/**
 * Centralized Express error handler.
 * Prevents sensitive credentials or raw stack traces from reaching clients.
 */
function errorHandler(err, req, res, next) {
  console.error('API Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size exceeds the 25 MB limit. Please upload a smaller PDF.'
      });
    }
    return res.status(400).json({
      error: `File upload error: ${err.message}`
    });
  }

  // Handle known client errors
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      error: err.message
    });
  }

  // Handle generic errors safely
  const statusCode = err.statusCode || 500;
  const userMessage = err.message || 'An internal server error occurred. Please try again.';

  res.status(statusCode).json({
    error: userMessage
  });
}

module.exports = {
  errorHandler
};
