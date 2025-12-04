# Peta Rawan Narkoba (Tanjungpinang) - Simple Web App

This is a minimal open-source implementation of a landing page + admin UI to visualize "Peta Rawan Narkoba" using Leaflet (OpenStreetMap) and a lightweight Express + SQLite backend.

Features
- User page with header/banner (uploadable by admin) and caption under the banner.
- Leaflet map showing per-kelurahan polygons (GeoJSON) as colored areas and markers for reported user locations.
- Admin page to upload banner/caption and add/remove points either by clicking the map or entering coordinates.

Quick start (Windows PowerShell)
1. Install dependencies:
```
npm install
```
2. Start server:
```
npm start
```
3. Open pages:
- User: `http://localhost:3000/index.html`

Admin access
- The admin page `http://localhost:3000/admin.html` is protected with HTTP Basic Auth.
- Default credentials (change before deploying):
	- username: `admin`
	- password: `password`
- To change credentials, set environment variables before starting the server (PowerShell):
```
$env:ADMIN_USER = 'youruser'; $env:ADMIN_PASS = 'yourpass'; npm start
```
- When you open `admin.html` the browser will prompt for username/password.


Notes
- The app ships with a small sample `public/data/kelurahan.geojson`. Replace it with official Tanjungpinang kelurahan GeoJSON for production.
- There is no admin authentication in this scaffold — add auth before deploying publicly.
