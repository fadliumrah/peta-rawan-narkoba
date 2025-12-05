/**
 * Security middleware for authentication and authorization
 */

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

/**
 * Basic authentication middleware for admin routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function basicAuth(req, res, next) {
  const auth = req.headers.authorization;
  
  if (!auth) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required');
  }
  
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Basic') {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required');
  }
  
  const credentials = Buffer.from(parts[1], 'base64').toString();
  const idx = credentials.indexOf(':');
  
  if (idx === -1) {
    return res.status(401).send('Authentication required');
  }
  
  const user = credentials.slice(0, idx);
  const pass = credentials.slice(idx + 1);
  
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return next();
  }
  
  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(401).send('Authentication required');
}

/**
 * Middleware to protect admin routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function adminProtection(req, res, next) {
  const p = req.path || '';
  if (p === '/admin.html' || p === '/admin' || p.startsWith('/admin/')) {
    return basicAuth(req, res, next);
  }
  return next();
}

module.exports = {
  basicAuth,
  adminProtection
};
