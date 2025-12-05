const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const db = require('./database');
const { basicAuth, adminProtection } = require('./middleware/security');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { 
  validatePoint, 
  validateBanner, 
  validateNews, 
  validateId,
  validateSearchQuery 
} = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://maps.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "https://nominatim.openstreetmap.org", "https://*.tile.openstreetmap.org", "https://*.basemaps.cartocdn.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Enable CORS with configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Enable compression
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many admin requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Body parsing middleware with size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Protect admin routes with Basic Auth
app.use(adminProtection);

// Serve public static files
app.use(express.static(PUBLIC_DIR));

// Route /admin to /admin.html (clean URL)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});


// Database storage (SQLite)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// API: get points
app.get('/api/points', (req, res) => {
  try {
    const points = db.getAllPoints();
    res.json(points);
  } catch (err) {
    console.error('Error fetching points:', err);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// API: add point
app.post('/api/points', adminLimiter, basicAuth, validatePoint, (req, res, next) => {
  try {
    const { name, lat, lng, category, description } = req.body;
    
    const id = db.createPoint(name, Number(lat), Number(lng), category, description || null);
    const point = db.getPointById(id);
    res.json(point);
  } catch (err) {
    next(err);
  }
});

// API: delete point
app.delete('/api/points/:id', adminLimiter, basicAuth, validateId, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = db.deletePoint(id);
    res.json({ ok: true, removed: result.changes });
  } catch (err) {
    next(err);
  }
});

// API: update point
app.patch('/api/points/:id', adminLimiter, basicAuth, validateId, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const point = db.getPointById(id);
    if (!point) return res.status(404).json({ error: 'not found' });
    
    const { name, lat, lng, category, description } = req.body;
    const updatedName = name !== undefined ? name : point.name;
    const updatedLat = lat !== undefined ? Number(lat) : point.lat;
    const updatedLng = lng !== undefined ? Number(lng) : point.lng;
    const updatedCategory = category !== undefined ? category : point.category;
    const updatedDescription = description !== undefined ? description : point.description;
    
    if (updatedCategory && !['rendah', 'sedang', 'tinggi'].includes(updatedCategory)) {
      return res.status(400).json({ error: 'category must be rendah, sedang, or tinggi' });
    }
    
    db.updatePoint(id, updatedName, updatedLat, updatedLng, updatedCategory, updatedDescription);
    const updated = db.getPointById(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// API: Get banner image as BLOB
app.get('/api/banner/image', (req, res) => {
  try {
    const banner = db.getBanner();
    if (!banner || !banner.image_data) {
      return res.status(404).send('Banner not found');
    }
    res.set('Content-Type', banner.mime_type || 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(banner.image_data);
  } catch (err) {
    console.error('Error serving banner:', err);
    res.status(500).send('Failed to serve banner');
  }
});

// API: Get banner caption
app.get('/api/banner', (req, res) => {
  try {
    const banner = db.getBanner();
    res.json({ 
      caption: banner?.caption || 'Informasi Area Rawan Narkoba - Kota Tanjungpinang'
    });
  } catch (err) {
    console.error('Error fetching banner:', err);
    res.status(500).json({ error: 'Failed to fetch banner' });
  }
});

// API: Upload banner as BLOB to database
app.post('/api/banner', adminLimiter, basicAuth, validateBanner, (req, res, next) => {
  try {
    const caption = req.body.caption || 'Informasi Area Rawan Narkoba - Kota Tanjungpinang';
    const data = req.body.data; // base64 string with data:... prefix (optional)
    
    // If no image data provided, only update caption
    if (!data) {
      db.updateBanner(null, null, caption);
      console.log('✅ Banner caption updated');
      return res.json({ ok: true, caption });
    }
    
    // Extract base64 data and mime type
    const match = data.match(/^data:(image\/\w+);base64,(.*)$/);
    const mimeType = match ? match[1] : 'image/png';
    const b64 = match ? match[2] : data;
    const buffer = Buffer.from(b64, 'base64');
    
    // Save to database as BLOB
    db.updateBanner(buffer, mimeType, caption);
    console.log('✅ Banner saved to database as BLOB');
    
    res.json({ ok: true, caption });
  } catch (err) {
    next(err);
  }
});

// API: Get logo image as BLOB
app.get('/api/logo/image', (req, res) => {
  try {
    const logo = db.getLogo();
    if (!logo || !logo.image_data) {
      return res.status(404).send('Logo not found');
    }
    res.set('Content-Type', logo.mime_type || 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(logo.image_data);
  } catch (err) {
    console.error('Error serving logo:', err);
    res.status(500).send('Failed to serve logo');
  }
});

// API: Upload logo as BLOB to database
app.post('/api/logo', adminLimiter, basicAuth, (req, res, next) => {
  try {
    const data = req.body.data; // base64 string possibly with data:... prefix
    if (!data) return res.status(400).json({ error: 'data (base64) required' });
    
    // Extract base64 data and mime type
    const match = data.match(/^data:(image\/\w+);base64,(.*)$/);
    const mimeType = match ? match[1] : 'image/png';
    const b64 = match ? match[2] : data;
    const buffer = Buffer.from(b64, 'base64');
    
    // Save to database as BLOB
    db.updateLogo(buffer, mimeType);
    console.log('✅ Logo saved to database as BLOB');
    
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ===== NEWS API ENDPOINTS =====

// Get all news
app.get('/api/news', (req, res) => {
  try {
    const news = db.getAllNews();
    res.json(news);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get news image as BLOB
app.get('/api/news/:id/image', (req, res) => {
  try {
    const news = db.getNewsById(req.params.id);
    if (!news || !news.image_data) {
      return res.status(404).send('Image not found');
    }
    res.set('Content-Type', news.mime_type || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(news.image_data);
  } catch (err) {
    console.error('Error serving news image:', err);
    res.status(500).send('Failed to serve image');
  }
});

// Search news
app.get('/api/news/search', validateSearchQuery, (req, res, next) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.json([]);
    }
    const results = db.searchNews(query);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// Get single news by ID
app.get('/api/news/:id', (req, res) => {
  try {
    const news = db.getNewsById(req.params.id);
    if (!news) {
      return res.status(404).json({ error: 'News not found' });
    }
    res.json(news);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Create news (admin only)
app.post('/api/news', adminLimiter, basicAuth, validateNews, (req, res, next) => {
  try {
    const { title, content, image_data, author } = req.body;
    
    // Convert base64 image to BLOB if provided
    let imageBuffer = null;
    let mimeType = null;
    if (image_data) {
      const match = image_data.match(/^data:(image\/\w+);base64,(.*)$/);
      mimeType = match ? match[1] : 'image/jpeg';
      const b64 = match ? match[2] : image_data;
      imageBuffer = Buffer.from(b64, 'base64');
    }
    
    const result = db.createNews(title, content, imageBuffer, mimeType, author);
    console.log('✅ News saved to database with BLOB image');
    
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

// Update news (admin only)
app.put('/api/news/:id', adminLimiter, basicAuth, validateId, validateNews, (req, res, next) => {
  try {
    const { title, content, image_data, author } = req.body;
    
    // Convert base64 image to BLOB if provided
    let imageBuffer = null;
    let mimeType = null;
    if (image_data) {
      const match = image_data.match(/^data:(image\/\w+);base64,(.*)$/);
      mimeType = match ? match[1] : 'image/jpeg';
      const b64 = match ? match[2] : image_data;
      imageBuffer = Buffer.from(b64, 'base64');
    }
    
    db.updateNews(req.params.id, title, content, imageBuffer, mimeType, author);
    console.log('✅ News updated in database with BLOB image');
    
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Delete news (admin only)
app.delete('/api/news/:id', adminLimiter, basicAuth, validateId, (req, res, next) => {
  try {
    db.deleteNews(req.params.id);
    console.log('✅ News deleted from database');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// API: upload kelurahan GeoJSON (admin)
// (GeoJSON upload endpoint removed - upload via admin UI disabled)

// serve demo GeoJSON data
app.get('/data/kelurahan.geojson', (req, res) => {
  const geoPath = path.join(PUBLIC_DIR, 'data', 'kelurahan.geojson');
  if (fs.existsSync(geoPath)) {
    res.sendFile(geoPath);
  } else {
    res.status(404).json({ error: 'geojson not found' });
  }
});

// Expose minimal runtime config for frontend (e.g., Google Maps API key)
app.get('/api/config', (req, res) => {
  res.json({ GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '' });
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// (kelurahan upload endpoint removed)

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server - listen on 0.0.0.0 for Railway/Docker compatibility
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server started on ${HOST}:${PORT}`);
  console.log(`📍 Public map: http://localhost:${PORT}`);
  console.log(`🔐 Admin panel: http://localhost:${PORT}/admin`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`👤 Admin credentials: ${process.env.ADMIN_USER || 'admin'} / ${process.env.ADMIN_PASS || 'password'}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.db.close();
    process.exit(0);
  });
});

// Export for testing and Railway/other platforms
module.exports = app;
