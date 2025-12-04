const express = require('express');
const path = require('path');
const fs = require('fs');
// avoid native modules to keep installs simple

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

// Protect admin static assets (admin.html, admin.js, etc.) using Basic Auth
app.use((req, res, next) => {
  const p = req.path || '';
  // apply protection to any path that begins with '/admin'
  if (p === '/admin.html' || p === '/admin' || p.startsWith('/admin/')) {
    return basicAuth(req, res, next);
  }
  return next();
});

// Route /admin to /admin.html (clean URL)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// Serve public static files (other assets remain public)
app.use(express.static(PUBLIC_DIR));


// simple JSON-file storage instead of sqlite for portability
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const POINTS_FILE = path.join(DATA_DIR, 'points.json');
const BANNER_META = path.join(DATA_DIR, 'banner.json');

// helper: load kelurahan list (names) from public/data/kelurahan_list.json if available
function loadKelurahanNames(){
  try{
    const p = path.join(PUBLIC_DIR, 'data', 'kelurahan_list.json');
    const txt = fs.readFileSync(p, 'utf8');
    const arr = JSON.parse(txt);
    return (arr||[]).map(k => String(k.name || k.kelurahan || k.kecamatan || '').trim().toLowerCase()).filter(Boolean);
  }catch(e){ return []; }
}

function loadPoints(){
  try{ const txt = fs.readFileSync(POINTS_FILE, 'utf8'); return JSON.parse(txt); }catch(e){ return []; }
}
function savePoints(points){ fs.writeFileSync(POINTS_FILE, JSON.stringify(points, null, 2), 'utf8'); }

function loadBannerMeta(){
  try{ const txt = fs.readFileSync(BANNER_META, 'utf8'); return JSON.parse(txt); }catch(e){ return { filename: null, caption: 'Informasi area rawan narkoba - Tanjungpinang' }; }
}
function saveBannerMeta(m){ fs.writeFileSync(BANNER_META, JSON.stringify(m,null,2), 'utf8'); }

// API: get points
app.get('/api/points', (req, res) => {
  const rows = loadPoints();
  // return in reverse chronological order
  rows.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  res.json(rows);
});

// API: add point
app.post('/api/points', basicAuth, (req, res) => {
  const { lat, lng, note, kelurahan } = req.body;
  if (typeof lat === 'undefined' || typeof lng === 'undefined') return res.status(400).json({ error: 'lat,lng required' });
  // require kelurahan to be provided and valid
  const kelNames = loadKelurahanNames();
  if (!kelurahan || String(kelurahan).trim() === '') return res.status(400).json({ error: 'kelurahan required' });
  const kname = String(kelurahan).trim().toLowerCase();
  if (kelNames.length > 0 && !kelNames.includes(kname)) return res.status(400).json({ error: 'invalid kelurahan' });
  const points = loadPoints();
  const id = (points.length ? Math.max(...points.map(p=>p.id)) : 0) + 1;
  const row = { id, lat: Number(lat), lng: Number(lng), note: note || '', kelurahan: kelurahan || null, created_at: new Date().toISOString() };
  points.push(row);
  savePoints(points);
  res.json(row);
});

// API: delete point
app.delete('/api/points/:id', basicAuth, (req, res) => {
  const id = Number(req.params.id);
  let points = loadPoints();
  const before = points.length;
  points = points.filter(p=>p.id !== id);
  savePoints(points);
  res.json({ ok: true, removed: before - points.length });
});

// API: update point (partial) - allow updating kelurahan or note
app.patch('/api/points/:id', basicAuth, (req, res) => {
  const id = Number(req.params.id);
  let points = loadPoints();
  const idx = points.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const allowed = ['kelurahan', 'note', 'lat', 'lng'];
  // if kelurahan is being updated, validate it's non-empty and valid
  if (Object.prototype.hasOwnProperty.call(req.body, 'kelurahan')) {
    const v = req.body.kelurahan;
    if (!v || String(v).trim() === '') return res.status(400).json({ error: 'kelurahan required' });
    const kelNames = loadKelurahanNames();
    const kname = String(v).trim().toLowerCase();
    if (kelNames.length > 0 && !kelNames.includes(kname)) return res.status(400).json({ error: 'invalid kelurahan' });
  }
  Object.keys(req.body || {}).forEach(k => {
    if (allowed.includes(k)) {
      if (k === 'lat' || k === 'lng') points[idx][k] = Number(req.body[k]);
      else points[idx][k] = req.body[k];
    }
  });
  savePoints(points);
  res.json(points[idx]);
});

// API: banner get
app.get('/api/banner', (req, res) => {
  const meta = loadBannerMeta();
  let url = meta && meta.filename ? '/' + meta.filename.replace(/\\\\/g, '/') : '/uploads/banner-default.svg';
  res.json({ url, caption: meta ? meta.caption : '' });
});

// API: banner upload
// Banner upload via JSON { filename, data: base64..., caption }
app.post('/api/banner', basicAuth, (req, res) => {
  const caption = req.body.caption || '';
  const filename = req.body.filename || 'banner.png';
  const data = req.body.data; // base64 string possibly with data:... prefix
  if (!data) return res.status(400).json({ error: 'data (base64) required' });
  // strip prefix
  const m = data.match(/^data:.*;base64,(.*)$/);
  const b64 = m ? m[1] : data;
  const buffer = Buffer.from(b64, 'base64');
  const outName = 'banner' + path.extname(filename);
  const outPath = path.join(UPLOADS_DIR, outName);
  fs.writeFileSync(outPath, buffer);
  saveBannerMeta({ filename: path.join('uploads', outName), caption });
  res.json({ ok: true, filename: outName, caption });
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
// (kelurahan upload endpoint removed)

// Export for Vercel serverless
module.exports = app;

// Only listen if not in Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
}
