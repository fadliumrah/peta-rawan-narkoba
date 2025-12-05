const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic Admin credentials (change via env vars)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

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
  if (idx === -1) return res.status(401).send('Authentication required');
  const user = credentials.slice(0, idx);
  const pass = credentials.slice(idx + 1);
  if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(401).send('Authentication required');
}

// Protect admin routes with Basic Auth
app.use((req, res, next) => {
  const p = req.path || '';
  if (p === '/admin.html' || p === '/admin' || p.startsWith('/admin/')) {
    return basicAuth(req, res, next);
  }
  return next();
});

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
app.post('/api/points', basicAuth, (req, res) => {
  try {
    const { name, lat, lng, category, description } = req.body;
    if (typeof lat === 'undefined' || typeof lng === 'undefined') {
      return res.status(400).json({ error: 'lat,lng required' });
    }
    if (!name || !category) {
      return res.status(400).json({ error: 'name and category required' });
    }
    if (!['rendah', 'sedang', 'tinggi'].includes(category)) {
      return res.status(400).json({ error: 'category must be rendah, sedang, or tinggi' });
    }
    
    const id = db.createPoint(name, Number(lat), Number(lng), category, description || null);
    const point = db.getPointById(id);
    res.json(point);
  } catch (err) {
    console.error('Error adding point:', err);
    res.status(500).json({ error: 'Failed to add point' });
  }
});

// API: delete point
app.delete('/api/points/:id', basicAuth, (req, res) => {
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
app.patch('/api/points/:id', basicAuth, (req, res) => {
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

// API: banner get
app.get('/api/banner', (req, res) => {
  try {
    const banner = db.getBanner();
    res.json({ 
      url: banner.image_data || null, 
      caption: banner.caption || 'Informasi Area Rawan Narkoba - Kota Tanjungpinang'
    });
  } catch (err) {
    console.error('Error fetching banner:', err);
    res.status(500).json({ error: 'Failed to fetch banner' });
  }
});

// API: banner upload
app.post('/api/banner', basicAuth, (req, res) => {
  try {
    const caption = req.body.caption || 'Informasi Area Rawan Narkoba - Kota Tanjungpinang';
    const data = req.body.data; // base64 string with data:... prefix
    if (!data) return res.status(400).json({ error: 'data (base64) required' });
    
    db.updateBanner(data, caption);
    
    // Backup banner to JSON file for persistence across redeploys
    try {
      const bannerBackup = { image_data: data, caption: caption };
      fs.writeFileSync(path.join(__dirname, 'banner-backup.json'), JSON.stringify(bannerBackup, null, 2));
      console.log('✅ Banner backed up to banner-backup.json');
    } catch (backupErr) {
      console.warn('⚠️ Failed to backup banner:', backupErr.message);
    }
    
    res.json({ ok: true, caption });
  } catch (err) {
    console.error('Error uploading banner:', err);
    res.status(500).json({ error: 'Failed to upload banner' });
  }
});

// API: logo upload
// Logo upload via JSON { filename, data: base64... }
app.post('/api/logo', basicAuth, (req, res) => {
  try {
    const filename = req.body.filename || 'logo.svg';
    const data = req.body.data; // base64 string possibly with data:... prefix
    if (!data) return res.status(400).json({ error: 'data (base64) required' });
    // strip prefix
    const m = data.match(/^data:.*;base64,(.*)$/);
    const b64 = m ? m[1] : data;
    const buffer = Buffer.from(b64, 'base64');
    const outName = 'logo-bnn' + path.extname(filename);
    const outPath = path.join(PUBLIC_DIR, outName);
    
    // Ensure public directory exists
    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    
    fs.writeFileSync(outPath, buffer);
    console.log('Logo uploaded to:', outPath);
    res.json({ ok: true, filename: outName });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
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

// Search news
app.get('/api/news/search', (req, res) => {
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
app.post('/api/news', basicAuth, (req, res) => {
  try {
    const { title, content, image_data, author } = req.body;
    if (!title || !content || !author) {
      return res.status(400).json({ error: 'Title, content, and author are required' });
    }
    const result = db.createNews(title, content, image_data || null, author);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Error creating news:', err);
    res.status(500).json({ error: 'Failed to create news' });
  }
});

// Update news (admin only)
app.put('/api/news/:id', basicAuth, (req, res) => {
  try {
    const { title, content, image_data, author } = req.body;
    if (!title || !content || !author) {
      return res.status(400).json({ error: 'Title, content, and author are required' });
    }
    db.updateNews(req.params.id, title, content, image_data || null, author);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating news:', err);
    res.status(500).json({ error: 'Failed to update news' });
  }
});

// Delete news (admin only)
app.delete('/api/news/:id', basicAuth, (req, res) => {
  try {
    db.deleteNews(req.params.id);
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
