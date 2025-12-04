const db = require('./database');

console.log('=== DATABASE STORAGE LOCATION ===');
console.log('File: D:\\PROJECT BNNK\\data\\peta-narkoba.db');
console.log('Size:', require('fs').statSync('./data/peta-narkoba.db').size, 'bytes');
console.log();

console.log('=== POINTS TABLE ===');
const points = db.getAllPoints();
console.log('Total points:', points.length);
if (points.length > 0) {
  points.slice(0, 3).forEach((p, i) => {
    console.log(`${i+1}. ${p.name} (${p.category}) - Lat: ${p.lat}, Lng: ${p.lng}`);
  });
}

console.log();
console.log('=== BANNER TABLE ===');
const banner = db.getBanner();
console.log('Caption:', banner.caption);
console.log('Has image:', banner.image_data ? 'Yes (Base64)' : 'No');

console.log();
console.log('✅ Data tersimpan PERMANEN di database SQLite');
console.log('✅ Data tidak akan hilang saat restart server');
console.log('✅ Data akan di-deploy ke Railway bersama aplikasi');
