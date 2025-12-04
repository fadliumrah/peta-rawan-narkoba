// Admin UI: upload banner, click-to-add points, manual add, list & delete
(function(){
  // map
  const map = L.map('adminMap').setView([0.9167, 104.4510], 12);
  // Choose Google Maps when API key available, else use Voyager
  function loadAdminBaseMap(){
    fetch('/api/config').then(r=>r.json()).then(cfg=>{
      const key = cfg && cfg.GOOGLE_MAPS_API_KEY;
      if (key) {
        window._initGoogleMapsAdmin = function(){
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/leaflet.gridlayer.googlemutant/Leaflet.GoogleMutant.js';
          s.onload = function(){
            try{
              const gm = L.gridLayer.googleMutant({ type: 'roadmap' });
              gm.addTo(map);
            }catch(e){
              L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom:19, attribution: '&copy; OpenStreetMap contributors &amp; CARTO', subdomains:'abcd' }).addTo(map);
            }
          };
          document.head.appendChild(s);
        };
        const g = document.createElement('script');
        g.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=_initGoogleMapsAdmin`;
        g.async = true; g.defer = true;
        document.head.appendChild(g);
      } else {
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom:19, attribution: '&copy; OpenStreetMap contributors &amp; CARTO', subdomains:'abcd' }).addTo(map);
      }
    }).catch(()=>{
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom:19, attribution: '&copy; OpenStreetMap contributors &amp; CARTO', subdomains:'abcd' }).addTo(map);
    });
  }
  loadAdminBaseMap();
  // kelurahan boundary display removed per request

  // Kelurahan dropdown removed - using name, category, description instead

  let tempMarker;
  map.on('click', (e)=>{
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.marker(e.latlng).addTo(map);
    document.querySelector('#pointForm [name=lat]').value = e.latlng.lat.toFixed(6);
    document.querySelector('#pointForm [name=lng]').value = e.latlng.lng.toFixed(6);
  });

  // GPS Geolocation handler
  const gpsBtn = document.getElementById('gpsBtn');
  const gpsStatus = document.getElementById('gpsStatus');
  const gpsStatusText = document.getElementById('gpsStatusText');
  
  gpsBtn.addEventListener('click', function(e){
    e.preventDefault();
    if (!navigator.geolocation) {
      alert('❌ Geolocation tidak didukung browser Anda');
      return;
    }
    
    gpsBtn.disabled = true;
    gpsStatus.style.display = 'flex';
    gpsStatusText.textContent = '📍 Mengakses GPS...';
    
    navigator.geolocation.getCurrentPosition(
      function(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        // Update form fields
        document.querySelector('#pointForm [name=lat]').value = lat.toFixed(6);
        document.querySelector('#pointForm [name=lng]').value = lng.toFixed(6);
        
        // Update map marker
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = L.marker([lat, lng]).addTo(map);
        map.setView([lat, lng], 16);
        
        // Show success message
        gpsStatusText.innerHTML = `✅ GPS Diperoleh (akurasi: ±${Math.round(accuracy)}m)`;
        setTimeout(() => {
          gpsBtn.disabled = false;
          gpsStatus.style.display = 'none';
        }, 3000);
      },
      function(error) {
        let msg = 'Error mengakses GPS';
        switch(error.code) {
          case error.PERMISSION_DENIED: msg = '❌ Akses GPS ditolak. Izinkan akses lokasi di browser.'; break;
          case error.POSITION_UNAVAILABLE: msg = '❌ Informasi lokasi tidak tersedia'; break;
          case error.TIMEOUT: msg = '❌ Request GPS timeout'; break;
        }
        gpsStatusText.textContent = msg;
        setTimeout(() => {
          gpsBtn.disabled = false;
          gpsStatus.style.display = 'none';
        }, 3000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  // logo form - handle logo upload with drag-drop
  const logoForm = document.getElementById('logoForm');
  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');
  const logoDragDrop = document.getElementById('logoDragDrop');
  
  // Click to open file dialog
  logoDragDrop.addEventListener('click', () => logoInput.click());
  
  // Drag-drop handlers
  logoDragDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    logoDragDrop.classList.add('drag-over');
  });
  logoDragDrop.addEventListener('dragleave', () => {
    logoDragDrop.classList.remove('drag-over');
  });
  logoDragDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    logoDragDrop.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      logoInput.files = files;
      previewLogo(files[0]);
    }
  });
  
  // File input change handler
  logoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      previewLogo(e.target.files[0]);
    }
  });
  
  // Preview function
  function previewLogo(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      logoPreview.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  logoForm.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const file = logoInput.files[0];
    if (!file) {
      alert('Pilih file logo terlebih dahulu');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File terlalu besar (max 2MB)');
      return;
    }
    
    // Check file type
    const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      alert('Format file tidak valid. Gunakan SVG, PNG, atau JPG.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(){
      const dataUrl = reader.result;
      const payload = { filename: file.name, data: dataUrl };
      try {
        const res = await fetch('/api/logo', { 
          method:'POST', 
          headers:{ 'Content-Type':'application/json' }, 
          body: JSON.stringify(payload) 
        });
        const result = await res.json();
        if (res.ok) { 
          alert('✅ Logo berhasil diupdate');
          logoForm.reset();
          logoPreview.src = '/logo-bnn' + (file.name.match(/\.[^.]*$/)?.[0] || '.svg') + '?' + Date.now();
        } else { 
          alert('❌ Upload gagal: ' + (result.error || 'Unknown error')); 
        }
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    };
    reader.onerror = function() {
      alert('❌ Gagal membaca file');
    };
    reader.readAsDataURL(file);
  });

  // banner form - read file as base64 and send JSON so server doesn't need multipart parser
  const bannerForm = document.getElementById('bannerForm');
  const fileInput = document.getElementById('bannerInput');
  
  bannerForm.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const file = fileInput.files[0];
    const caption = bannerForm.querySelector('[name=caption]').value || '';
    if (!file) {
      alert('Pilih file banner terlebih dahulu');
      return;
    }
    const reader = new FileReader();
    reader.onload = async function(){
      const dataUrl = reader.result;
      const payload = { filename: file.name, data: dataUrl, caption };
      const res = await fetch('/api/banner', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { 
        alert('✅ Banner berhasil diupdate'); 
        bannerForm.reset();
      } else { 
        alert('❌ Upload gagal'); 
      }
    };
    reader.readAsDataURL(file);
  });

  // points listing with empty state
  async function loadPoints(){
    const res = await fetch('/api/points');
    const pts = await res.json();
    const ul = document.getElementById('pointsList');
    const emptyState = document.getElementById('emptyState');
    ul.innerHTML = '';

    if (pts.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      pts.forEach((p, idx) => {
        const li = document.createElement('li');
        const date = new Date(p.created_at).toLocaleDateString('id-ID', { hour:'2-digit', minute:'2-digit' });
        
        // Category emoji mapping
        const categoryEmoji = { rendah: '🟢', sedang: '🟡', tinggi: '🔴' };
        const categoryText = { rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi' };

        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `<strong>#${idx + 1} - ${p.name || '(tanpa nama)'}</strong><br/><small>${categoryEmoji[p.category] || '⚪'} ${categoryText[p.category] || p.category}</small><br/><small>📍 ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</small><br/><small>📝 ${p.description || '(tanpa deskripsi)'}</small><br/><small style="color:#999;">🕐 ${date}</small>`;

        const delBtn = document.createElement('button'); 
        delBtn.textContent = '🗑️ Hapus'; 
        delBtn.className='btn btn-danger'; 
        delBtn.style.marginTop='8px';
        delBtn.addEventListener('click', async () => {
          if (!confirm('Yakin hapus titik ini?')) return;
          await fetch('/api/points/' + p.id, { method: 'DELETE' });
          loadPoints();
        });

        li.appendChild(infoDiv);
        li.appendChild(delBtn);
        ul.appendChild(li);
      });
    }
    // (approximate admin boundaries removed)
  }
  loadPoints();

  // (Export GeoJSON button functionality removed per user request)

  // (Bulk assign, GeoJSON upload and auto-tag features removed per request)

  // form add point
  document.getElementById('pointForm').addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const payload = { 
      name: fd.get('name'),
      lat: Number(fd.get('lat')), 
      lng: Number(fd.get('lng')), 
      category: fd.get('category'),
      description: fd.get('description') || null
    };
    if (!payload.name || !payload.category) { 
      alert('Nama dan kategori wajib diisi.'); 
      return; 
    }
    const res = await fetch('/api/points', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { 
      alert('Titik berhasil ditambahkan'); 
      ev.target.reset(); 
      if (tempMarker){ map.removeLayer(tempMarker); tempMarker=null; } 
      loadPoints(); 
    }
    else {
      const txt = await res.text();
      alert('Gagal menambahkan titik: ' + txt);
    }
  });

})();
