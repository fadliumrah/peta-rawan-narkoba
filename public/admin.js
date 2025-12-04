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

  // Load kelurahan reference for dropdown/lookup but DO NOT draw polygons on admin map
  let kelurahList = [];
  const kelurahanSelect = document.getElementById('kelurahanSelect');

  function populateKelurahanSelect(list){
    list.forEach(k => {
      const name = k.name || k.kelurahan || k.kecamatan;
      const color = k.color || '#FF6B6B';
      kelurahList.push({ name, color, geometry: k.geometry });
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      kelurahanSelect.appendChild(opt);
    });
  }

  // Prefer static list first, fallback to geojson with geometries
  fetch('/data/kelurahan_list.json').then(r=>{
    if (!r.ok) throw new Error('no list');
    return r.json();
  }).then(list => populateKelurahanSelect(list)).catch(()=>{
    fetch('/data/kelurahan.geojson').then(r=>r.json()).then(geo=>{
      if (geo && geo.features) {
        const list = geo.features.map(f => ({ name: (f.properties && (f.properties.name || f.properties.kelurahan || f.properties.kecamatan)) || ('area-' + (f.id||Math.random())), color: (f.properties && f.properties.color) || '#FF6B6B', geometry: f.geometry }));
        populateKelurahanSelect(list);
      }
    }).catch(()=>{});
  });

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
    
    // ensure kelurahList is loaded (in case it hasn't yet)
    if (kelurahList.length === 0) {
      try {
        const r = await fetch('/data/kelurahan_list.json');
        if (r.ok) {
          const list = await r.json();
          populateKelurahanSelect(list);
        }
      } catch (e) { /* ignore */ }
    }

    if (pts.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      pts.forEach((p, idx) => {
        const li = document.createElement('li');
        const date = new Date(p.created_at).toLocaleDateString('id-ID', { hour:'2-digit', minute:'2-digit' });

        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `<strong>#${idx + 1}</strong><br/><small>📍 ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</small><br/><small>📝 ${p.note || '(tanpa catatan)'}</small><br/><small style="color:#999;">🕐 ${date}</small>`;

        const controlsDiv = document.createElement('div');
        controlsDiv.style.display = 'flex';
        controlsDiv.style.gap = '8px';
        controlsDiv.style.alignItems = 'center';

        // kelurahan select
        const sel = document.createElement('select');
        sel.style.minWidth = '160px';
        const emptyOpt = document.createElement('option'); emptyOpt.value = ''; emptyOpt.textContent = '-- Kelurahan --'; sel.appendChild(emptyOpt);
        kelurahList.forEach(k => {
          const o = document.createElement('option'); o.value = k.name; o.textContent = k.name; if (p.kelurahan && String(p.kelurahan) === String(k.name)) o.selected = true; sel.appendChild(o);
        });

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Simpan';
        saveBtn.className = 'btn';
        saveBtn.style.width = 'auto';
        saveBtn.addEventListener('click', async () => {
          const newKel = sel.value || '';
          if (!newKel) { alert('Pilih kelurahan sebelum menyimpan'); return; }
          try {
            const r = await fetch('/api/points/' + p.id, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ kelurahan: newKel }) });
            if (r.ok) { alert('Kelurahan diperbarui'); loadPoints(); }
            else {
              const txt = await r.text();
              alert('Gagal menyimpan: ' + txt);
            }
          } catch (e) { alert('Gagal menyimpan'); }
        });

        const delBtn = document.createElement('button'); delBtn.textContent = '🗑️ Hapus'; delBtn.className='btn'; delBtn.style.background='#dc3545'; delBtn.style.color='white';
        delBtn.addEventListener('click', async () => {
          if (!confirm('Yakin hapus titik ini?')) return;
          await fetch('/api/points/' + p.id, { method: 'DELETE' });
          loadPoints();
        });

        controlsDiv.appendChild(sel);
        controlsDiv.appendChild(saveBtn);
        controlsDiv.appendChild(delBtn);

        li.appendChild(infoDiv);
        li.appendChild(controlsDiv);
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
    const payload = { lat: Number(fd.get('lat')), lng: Number(fd.get('lng')), note: fd.get('note') };
    const selectedKel = fd.get('kelurahan');
    if (!selectedKel || String(selectedKel).trim() === '') { alert('Kelurahan wajib diisi.'); return; }
    payload.kelurahan = selectedKel;
    const res = await fetch('/api/points', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { alert('Titik ditambahkan'); ev.target.reset(); if (tempMarker){ map.removeLayer(tempMarker); tempMarker=null; } loadPoints(); }
    else {
      const txt = await res.text();
      alert('Gagal menambahkan titik: ' + txt);
    }
  });

})();
