const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const cors = require('cors');
const db = require('./database');
const { securityHeaders, apiLimiter, authLimiter, uploadLimiter } = require('./middleware/security');
const { basicAuth, requireAuthForPath, ADMIN_USER, ADMIN_PASS } = require('./middleware/auth');
const { validatePoint, validateNews } = require('./middleware/validation');
const { parseImageData } = require('./utils/imageHandler');

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Security middleware
app.use(securityHeaders);
app.use(compression()); // Enable gzip compression
app.use(cors()); // Enable CORS for API endpoints

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply auth rate limiting to admin paths before authentication check
app.use((req, res, next) => {
  const p = req.path || '';
  if (p === '/admin.html' || p === '/admin' || p.startsWith('/admin/')) {
    return authLimiter(req, res, next);
  }
  return next();
});

// Protect admin routes with Basic Auth
app.use(requireAuthForPath);

// Serve public static files
app.use(express.static(PUBLIC_DIR));

// Route /admin to /admin.html (clean URL) - with auth rate limiting
app.get('/admin', authLimiter, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});


// Database storage (SQLite)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// API: get points
app.get('/api/points', apiLimiter, (req, res) => {
  try {
    const points = db.getAllPoints();
    res.json(points);
  } catch (err) {
    console.error('Error fetching points:', err);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// API: add point
app.post('/api/points', authLimiter, basicAuth, validatePoint, (req, res) => {
  try {
    const { name, lat, lng, category, description } = req.body;
    const id = db.createPoint(name, Number(lat), Number(lng), category, description || null);
    const point = db.getPointById(id);
    res.json(point);
  } catch (err) {
    console.error('Error adding point:', err);
    res.status(500).json({ error: 'Failed to add point' });
  }
});

// API: delete point
app.delete('/api/points/:id', authLimiter, basicAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = db.deletePoint(id);
    res.json({ ok: true, removed: result.changes });
  } catch (err) {
    console.error('Error deleting point:', err);
    res.status(500).json({ error: 'Failed to delete point' });
  }
});

// API: update point
app.patch('/api/points/:id', authLimiter, basicAuth, (req, res) => {
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
    console.error('Error updating point:', err);
    res.status(500).json({ error: 'Failed to update point' });
  }
});

// API: Get banner image as BLOB
app.get('/api/banner/image', apiLimiter, (req, res) => {
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
app.get('/api/banner', apiLimiter, (req, res) => {
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
app.post('/api/banner', uploadLimiter, basicAuth, (req, res) => {
  try {
    const caption = req.body.caption || 'Informasi Area Rawan Narkoba - Kota Tanjungpinang';
    const data = req.body.data;
    
    // If no image data provided, only update caption
    if (!data) {
      db.updateBanner(null, null, caption);
      console.log('✅ Banner caption updated');
      return res.json({ ok: true, caption });
    }
    
    // Parse image data using utility function
    const { buffer, mimeType } = parseImageData(data);
    
    // Save to database as BLOB
    db.updateBanner(buffer, mimeType, caption);
    console.log('✅ Banner saved to database as BLOB');
    
    res.json({ ok: true, caption });
  } catch (err) {
    console.error('Error uploading banner:', err);
    res.status(500).json({ error: 'Failed to upload banner: ' + err.message });
  }
});

// API: Get logo image as BLOB
app.get('/api/logo/image', apiLimiter, (req, res) => {
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
app.post('/api/logo', uploadLimiter, basicAuth, (req, res) => {
  try {
    const data = req.body.data;
    if (!data) return res.status(400).json({ error: 'data (base64) required' });
    
    // Parse image data using utility function
    const { buffer, mimeType } = parseImageData(data);
    
    // Save to database as BLOB
    db.updateLogo(buffer, mimeType);
    console.log('✅ Logo saved to database as BLOB');
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// ===== NEWS API ENDPOINTS =====

// Get all news
app.get('/api/news', apiLimiter, (req, res) => {
  try {
    const news = db.getAllNews();
    res.json(news);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get news image as BLOB
app.get('/api/news/:id/image', apiLimiter, (req, res) => {
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
app.get('/api/news/search', apiLimiter, (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.json([]);
    }
    const results = db.searchNews(query);
    res.json(results);
  } catch (err) {
    console.error('Error searching news:', err);
    res.status(500).json({ error: 'Failed to search news' });
  }
});

// Get single news by ID
app.get('/api/news/:id', apiLimiter, (req, res) => {
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
app.post('/api/news', uploadLimiter, basicAuth, validateNews, (req, res) => {
  try {
    const { title, content, image_data, author } = req.body;
    
    // Convert base64 image to BLOB if provided
    let imageBuffer = null;
    let mimeType = null;
    if (image_data) {
      const parsed = parseImageData(image_data);
      imageBuffer = parsed.buffer;
      mimeType = parsed.mimeType;
    }
    
    const result = db.createNews(title, content, imageBuffer, mimeType, author);
    console.log('✅ News saved to database with BLOB image');
    
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Error creating news:', err);
    res.status(500).json({ error: 'Failed to create news: ' + err.message });
  }
});

// Update news (admin only)
app.put('/api/news/:id', uploadLimiter, basicAuth, validateNews, (req, res) => {
  try {
    const { title, content, image_data, author } = req.body;
    
    // Convert base64 image to BLOB if provided
    let imageBuffer = null;
    let mimeType = null;
    if (image_data) {
      const parsed = parseImageData(image_data);
      imageBuffer = parsed.buffer;
      mimeType = parsed.mimeType;
    }
    
    db.updateNews(req.params.id, title, content, imageBuffer, mimeType, author);
    console.log('✅ News updated in database with BLOB image');
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating news:', err);
    res.status(500).json({ error: 'Failed to update news: ' + err.message });
  }
});

// Delete news (admin only)
app.delete('/api/news/:id', authLimiter, basicAuth, (req, res) => {
  try {
    db.deleteNews(req.params.id);
    console.log('✅ News deleted from database');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting news:', err);
    res.status(500).json({ error: 'Failed to delete news' });
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
app.get('/api/config', apiLimiter, (req, res) => {
  res.json({ GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '' });
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  try {
    // Check database connectivity
    const points = db.getAllPoints();
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      pointsCount: points.length
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// (kelurahan upload endpoint removed)

// Start server - listen on 0.0.0.0 for Railway/Docker compatibility
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`✅ Server started on ${HOST}:${PORT}`);
  console.log(`📍 Public map: http://localhost:${PORT}`);
  console.log(`🔐 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`👤 Admin credentials: ${ADMIN_USER} / ${ADMIN_PASS}`);
});

// Export for Railway/other platforms
module.exports = app;
