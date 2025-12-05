/**
 * Centralized error handling middleware
 */

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (required by Express)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const statusCode = err.statusCode || 500;
  const message = isDevelopment ? err.message : 'Internal server error';
  
  res.status(statusCode).json({
    error: message,
    ...(isDevelopment && { stack: err.stack })
  });
}

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
