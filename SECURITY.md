# Security Documentation

This document describes the security measures implemented in the Peta Rawan Narkoba application.

## Security Features

### 1. HTTP Security Headers (Helmet)

The application uses [Helmet](https://helmetjs.github.io/) middleware to set various HTTP headers that help protect against common web vulnerabilities:

- **Content Security Policy (CSP)**: Restricts sources of content that can be loaded
- **HSTS**: Forces HTTPS connections
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-XSS-Protection**: Enables browser XSS protection

Configuration in `middleware/security.js`:
```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      // ... other directives
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})
```

### 2. Rate Limiting

Multiple rate limiters protect against abuse:

#### API Rate Limiter
- 100 requests per 15 minutes per IP
- Applied to all public API endpoints
- Protects against DoS attacks

#### Authentication Rate Limiter
- 10 attempts per 15 minutes per IP
- Applied to login and admin endpoints
- Prevents brute force attacks

#### Upload Rate Limiter
- 20 uploads per hour per IP
- Applied to file upload endpoints
- Prevents resource exhaustion

Configuration in `middleware/security.js`:
```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  message: 'Too many requests from this IP, please try again later.'
});
```

### 3. Authentication

#### Basic HTTP Authentication
- Used for admin panel and protected endpoints
- Credentials configurable via environment variables
- Constant-time comparison to prevent timing attacks

Configuration:
```bash
# Set custom admin credentials
export ADMIN_USER=your_username
export ADMIN_PASS=your_secure_password
npm start
```

#### Security Best Practices
- **Never use default credentials in production**
- Use strong passwords (minimum 12 characters, mixed case, numbers, symbols)
- Consider implementing JWT or OAuth2 for production deployments
- Regularly rotate credentials

### 4. Input Validation

All user inputs are validated before processing:

#### Point Validation
- Name: Required, max 200 characters
- Coordinates: Required, valid lat/lng ranges
- Category: Must be one of: 'rendah', 'sedang', 'tinggi'
- Description: Optional, max 1000 characters

#### News Validation
- Title: Required, max 200 characters
- Content: Required, max 10000 characters
- Author: Required, max 100 characters

#### Image Validation
- Format: Base64 encoded
- Size: Maximum 50MB
- Types: PNG, JPEG, SVG, WebP

### 5. XSS Protection

HTML sanitization prevents Cross-Site Scripting attacks:

```javascript
function sanitizeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
```

### 6. SQL Injection Protection

- Uses prepared statements (parameterized queries)
- better-sqlite3 automatically escapes parameters
- No string concatenation in SQL queries

Example:
```javascript
db.prepare('SELECT * FROM points WHERE id = ?').get(id);
```

### 7. CORS Configuration

Cross-Origin Resource Sharing is enabled but can be restricted:

```javascript
app.use(cors()); // Allow all origins (development)
// Production: Restrict to specific origins
app.use(cors({ origin: 'https://yourdomain.com' }));
```

### 8. Compression

Gzip compression is enabled to:
- Reduce bandwidth usage
- Improve response times
- Protect against BREACH attacks (when combined with HTTPS)

## Security Checklist for Production

### Before Deployment

- [ ] Change default admin credentials
- [ ] Set strong admin password (min 12 chars)
- [ ] Enable HTTPS/SSL certificate
- [ ] Configure CORS for specific origins only
- [ ] Review and adjust rate limits based on traffic
- [ ] Set secure environment variables
- [ ] Remove or disable debug logging
- [ ] Update all dependencies to latest versions
- [ ] Run security audit: `npm audit`
- [ ] Review CSP policy for your domain

### Environment Variables

Required environment variables for production:

```bash
# Authentication (REQUIRED)
ADMIN_USER=your_admin_username
ADMIN_PASS=your_secure_password

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Optional
GOOGLE_MAPS_API_KEY=your_api_key
RAILWAY_VOLUME_MOUNT_PATH=/data
```

### Recommended Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
```

## Monitoring and Logging

### Log Security Events

Consider logging:
- Failed authentication attempts
- Rate limit violations
- Invalid input attempts
- Database errors
- File upload attempts

### Health Checks

The `/health` endpoint provides:
- Server status
- Database connectivity
- Timestamp
- Point count

Use for monitoring and alerting.

## Vulnerability Scanning

### NPM Audit
```bash
npm audit
npm audit fix
```

### Regular Updates
```bash
npm outdated
npm update
```

### Security Tools
- [Snyk](https://snyk.io/) - Vulnerability scanning
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing
- [npm-check](https://www.npmjs.com/package/npm-check) - Dependency checking

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email security concerns to: [project maintainer email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Updates

This application's security is actively maintained:
- Dependencies are regularly updated
- Security patches are applied promptly
- New security features are added as needed

Last security review: December 2025

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet Documentation](https://helmetjs.github.io/)

## Compliance

This application implements security measures that help meet:
- OWASP Top 10 security standards
- Basic data protection requirements
- API security best practices

For specific compliance requirements (GDPR, HIPAA, etc.), additional measures may be needed.
