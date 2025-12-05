// Authentication middleware

// Get credentials from environment with defaults
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

// Basic authentication middleware
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
  
  let credentials;
  try {
    credentials = Buffer.from(parts[1], 'base64').toString();
  } catch (error) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Invalid authentication format');
  }
  
  const idx = credentials.indexOf(':');
  if (idx === -1) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Invalid authentication format');
  }
  
  const user = credentials.slice(0, idx);
  const pass = credentials.slice(idx + 1);
  
  // Use constant-time comparison to prevent timing attacks
  const userMatch = safeCompare(user, ADMIN_USER);
  const passMatch = safeCompare(pass, ADMIN_PASS);
  
  if (userMatch && passMatch) {
    return next();
  }
  
  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(401).send('Authentication required');
}

// Constant-time string comparison to prevent timing attacks
function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// Middleware to check if path requires authentication
function requireAuthForPath(req, res, next) {
  const p = req.path || '';
  if (p === '/admin.html' || p === '/admin' || p.startsWith('/admin/')) {
    return basicAuth(req, res, next);
  }
  return next();
}

module.exports = {
  basicAuth,
  requireAuthForPath,
  ADMIN_USER,
  ADMIN_PASS
};
