/**
 * Input validation middleware using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
}

/**
 * Validation rules for creating/updating points
 */
const validatePoint = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 200 }).withMessage('Name must be between 1 and 200 characters')
    .escape(),
  body('lat')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('lng')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['rendah', 'sedang', 'tinggi']).withMessage('Category must be rendah, sedang, or tinggi'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters')
    .escape(),
  handleValidationErrors
];

/**
 * Validation rules for updating banner
 */
const validateBanner = [
  body('caption')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Caption must not exceed 500 characters')
    .escape(),
  body('data')
    .optional()
    .custom((value) => {
      if (value && !value.match(/^data:image\/(jpeg|jpg|png|gif|svg\+xml);base64,/)) {
        throw new Error('Invalid image data format');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Validation rules for news
 */
const validateNews = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 300 }).withMessage('Title must be between 1 and 300 characters')
    .escape(),
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ min: 1, max: 10000 }).withMessage('Content must be between 1 and 10000 characters'),
  body('author')
    .trim()
    .notEmpty().withMessage('Author is required')
    .isLength({ min: 1, max: 100 }).withMessage('Author must be between 1 and 100 characters')
    .escape(),
  body('image_data')
    .optional()
    .custom((value) => {
      if (value && !value.match(/^data:image\/(jpeg|jpg|png|gif);base64,/)) {
        throw new Error('Invalid image data format');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Validation rules for ID parameter
 */
const validateId = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors
];

/**
 * Validation rules for search query
 */
const validateSearchQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Search query must not exceed 200 characters')
    .escape(),
  handleValidationErrors
];

module.exports = {
  validatePoint,
  validateBanner,
  validateNews,
  validateId,
  validateSearchQuery,
  handleValidationErrors
};
