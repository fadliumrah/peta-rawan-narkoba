// Admin UI: upload banner, manual add points, list & delete
(function(){
  // Utility function to format date/time in WIB (UTC+7)
  function formatDateWIB(dateString, options = {}) {
    // SQLite returns timestamps in format "YYYY-MM-DD HH:MM:SS" which is in UTC
    // We need to add 'Z' suffix to ensure JavaScript interprets it as UTC
    let dateStr = dateString;
    if (dateStr && !dateStr.includes('Z') && !dateStr.includes('+')) {
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    }
    const date = new Date(dateStr);
    // Convert to WIB (UTC+7) by using timezone option
    return date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      ...options
    });
  }
  // Initialize mini map for coordinate selection
  const miniMap = L.map('miniMap').setView([0.9167, 104.4510], 12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &amp; CARTO',
    subdomains: 'abcd'
  }).addTo(miniMap);
  
  // Fix map size after load - multiple times to ensure proper rendering
  setTimeout(() => miniMap.invalidateSize(), 100);
  setTimeout(() => miniMap.invalidateSize(), 500);
  window.addEventListener('resize', () => miniMap.invalidateSize());
  
  // Click handler for coordinate selection
  let tempMarker;
  miniMap.on('click', (e) => {
    if (tempMarker) miniMap.removeLayer(tempMarker);
    tempMarker = L.marker(e.latlng).addTo(miniMap);
    document.querySelector('#pointForm [name=lat]').value = e.latlng.lat.toFixed(6);
    document.querySelector('#pointForm [name=lng]').value = e.latlng.lng.toFixed(6);
  });
  
  function loadAdminBaseMap(){
    // Map functionality disabled
    return;
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
  // Map disabled - admin panel simplified without interactive map

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
    gpsBtn.textContent = '📍 Mengakses GPS...';
    
    navigator.geolocation.getCurrentPosition(
      function(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        // Update form fields
        document.querySelector('#pointForm [name=lat]').value = lat.toFixed(6);
        document.querySelector('#pointForm [name=lng]').value = lng.toFixed(6);
        
        // Update map marker
        if (tempMarker) miniMap.removeLayer(tempMarker);
        tempMarker = L.marker([lat, lng]).addTo(miniMap);
        miniMap.setView([lat, lng], 15);
        
        // Show success message
        alert(`✅ GPS Berhasil!\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}\nAkurasi: ±${Math.round(accuracy)}m`);
        gpsBtn.disabled = false;
        gpsBtn.textContent = '📍 Ambil Koordinat dari GPS Saya';
      },
      function(error) {
        let msg = 'Error mengakses GPS';
        switch(error.code) {
          case error.PERMISSION_DENIED: msg = '❌ Akses GPS ditolak. Izinkan akses lokasi di browser.'; break;
          case error.POSITION_UNAVAILABLE: msg = '❌ Informasi lokasi tidak tersedia'; break;
          case error.TIMEOUT: msg = '❌ Request GPS timeout'; break;
        }
        alert(msg);
        gpsBtn.disabled = false;
        gpsBtn.textContent = '📍 Ambil Koordinat dari GPS Saya';
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
          // Reload logo from database with cache-busting
          logoPreview.src = '/api/logo/image?t=' + Date.now();
          document.getElementById('logoImg').src = '/api/logo/image?t=' + Date.now();
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
  const bannerPreview = document.getElementById('bannerPreview');
  const bannerPlaceholder = document.getElementById('bannerPlaceholder');
  const fileName = document.getElementById('fileName');
  const bannerCaptionInput = document.getElementById('bannerCaption');
  
  // Load existing banner from database
  async function loadBanner() {
    try {
      // Load banner image with cache-busting
      bannerPreview.src = '/api/banner/image?t=' + Date.now();
      bannerPreview.style.display = 'block';
      bannerPlaceholder.style.display = 'none';
      
      // Load banner caption
      const res = await fetch('/api/banner');
      const data = await res.json();
      if (data && data.caption) {
        bannerCaptionInput.value = data.caption;
      }
    } catch (err) {
      console.error('Failed to load banner:', err);
    }
  }
  
  // Load banner on page load
  loadBanner();
  
  // File input change handler - show preview and filename
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      // Show filename
      fileName.style.display = 'block';
      fileName.querySelector('span').textContent = file.name;
      
      // Show preview
      const reader = new FileReader();
      reader.onload = function(event) {
        bannerPreview.src = event.target.result;
        bannerPreview.style.display = 'block';
        bannerPlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });
  
  bannerForm.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const file = fileInput.files[0];
    const caption = bannerCaptionInput.value || '';
    
    // If file is provided, upload both image and caption
    if (file) {
      const reader = new FileReader();
      reader.onload = async function(){
        const dataUrl = reader.result;
        const payload = { data: dataUrl, caption };
        const res = await fetch('/api/banner', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { 
          alert('✅ Banner berhasil diupdate'); 
          loadBanner(); // Reload banner
          fileName.style.display = 'none';
          fileInput.value = '';
        } else { 
          alert('❌ Upload gagal'); 
        }
      };
      reader.readAsDataURL(file);
    } else {
      // If no file, only update caption
      const payload = { caption };
      const res = await fetch('/api/banner', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { 
        alert('✅ Caption banner berhasil diupdate'); 
        loadBanner(); // Reload banner
      } else { 
        alert('❌ Update gagal'); 
      }
    }
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
        const date = formatDateWIB(p.created_at, { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour:'2-digit', 
          minute:'2-digit' 
        });
        
        // Category emoji mapping
        const categoryEmoji = { rendah: '🟢', sedang: '🟡', tinggi: '🔴' };
        const categoryText = { rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi' };

        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `<strong>#${idx + 1} - ${p.name || '(tanpa nama)'}</strong><br/><small>${categoryEmoji[p.category] || '⚪'} ${categoryText[p.category] || p.category}</small><br/><small>📍 ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</small><br/><small>📝 ${p.description || '(tanpa deskripsi)'}</small><br/><small style="color:#999;">🕐 ${date} WIB</small>`;

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
    const kelurahan = fd.get('category');
    const description = fd.get('description') || '';
    
    // Auto-generate name from kelurahan
    const name = `Kelurahan ${kelurahan}`;
    
    const payload = { 
      name: name,
      lat: Number(fd.get('lat')), 
      lng: Number(fd.get('lng')), 
      category: kelurahan,
      description: description
    };
    
    if (!payload.category) { 
      alert('Kelurahan wajib dipilih.'); 
      return; 
    }
    
    const res = await fetch('/api/points', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { 
      alert('✅ Titik berhasil ditambahkan'); 
      ev.target.reset(); 
      if (tempMarker){ miniMap.removeLayer(tempMarker); tempMarker=null; } 
      loadPoints(); 
    }
    else {
      const txt = await res.text();
      alert('❌ Gagal menambahkan titik: ' + txt);
    }
  });

  // ===== NEWS MANAGEMENT =====
  
  // Initialize Quill rich text editor with professional features
  const quill = new Quill('#newsEditor', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['blockquote', 'code-block'],
        ['clean']
      ]
    },
    formats: ['header', 'font', 'size', 'bold', 'italic', 'underline', 'strike', 'color', 'background', 'script', 'list', 'bullet', 'indent', 'align', 'link', 'image', 'video', 'blockquote', 'code-block'],
    placeholder: 'Tulis isi berita lengkap dengan format profesional... (Tekan Enter 2x untuk spasi antar paragraf)'
  });

  // News image preview
  const newsImageInput = document.getElementById('newsImageInput');
  const newsImagePreview = document.getElementById('newsImagePreview');
  const newsImagePlaceholder = document.getElementById('newsImagePlaceholder');
  const newsImageFileName = document.getElementById('newsImageFileName');
  let newsImageData = null;

  newsImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      newsImageFileName.style.display = 'block';
      newsImageFileName.querySelector('span').textContent = file.name;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        newsImageData = ev.target.result;
        newsImagePreview.src = newsImageData;
        newsImagePreview.style.display = 'block';
        newsImagePlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });

  // Load news list
  async function loadNewsList() {
    try {
      const res = await fetch('/api/news');
      const news = await res.json();
      const newsList = document.getElementById('newsList');
      const emptyState = document.getElementById('newsEmptyState');
      
      if (news.length === 0) {
        newsList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }
      
      emptyState.style.display = 'none';
      newsList.innerHTML = news.map(item => {
        const formattedDate = formatDateWIB(item.created_at, {
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        return `
          <div class="news-admin-item" data-id="${item.id}">
            ${item.image_data ? `<img src="/api/news/${item.id}/image" alt="${item.title}" class="news-admin-thumb" />` : '<div class="news-admin-thumb" style="background:#e5e7eb;"></div>'}
            <div class="news-admin-info">
              <h4 class="news-admin-title">${item.title}</h4>
              <div class="news-admin-meta">
                📅 ${formattedDate} WIB | 
                👤 ${item.author}
              </div>
              <p style="color:#6b7280; font-size:0.9rem; margin:0;">${item.content.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
              <div class="news-admin-actions">
                <button class="btn-edit" onclick="editNews(${item.id})">✏️ Edit</button>
                <button class="btn-delete" onclick="deleteNews(${item.id})">🗑️ Hapus</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading news:', err);
    }
  }

  // Submit news form (create or update)
  document.getElementById('newsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('newsTitle').value;
    const author = document.getElementById('newsAuthor').value;
    const content = quill.root.innerHTML; // Get HTML content from Quill
    
    if (!title || !author || !content || content === '<p><br></p>') {
      alert('Semua field wajib diisi!');
      return;
    }
    
    try {
      const url = editingNewsId ? `/api/news/${editingNewsId}` : '/api/news';
      const method = editingNewsId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          content,
          image_data: newsImageData
        })
      });
      
      if (res.ok) {
        alert(editingNewsId ? '✅ Berita berhasil diupdate!' : '✅ Berita berhasil diposting!');
        
        // Reset form
        e.target.reset();
        quill.setContents([]);
        newsImageData = null;
        newsImagePreview.style.display = 'none';
        newsImagePlaceholder.style.display = 'block';
        newsImageFileName.style.display = 'none';
        
        // Reset edit mode
        if (editingNewsId) {
          cancelEdit();
        }
        
        loadNewsList();
      } else {
        alert(editingNewsId ? '❌ Gagal mengupdate berita' : '❌ Gagal memposting berita');
      }
    } catch (err) {
      console.error('Error saving news:', err);
      alert('❌ Terjadi kesalahan saat menyimpan berita');
    }
  });

  // Edit news function
  let editingNewsId = null;
  
  window.editNews = async (id) => {
    try {
      const res = await fetch(`/api/news/${id}`);
      const news = await res.json();
      
      // Populate form with existing data
      document.getElementById('newsTitle').value = news.title;
      document.getElementById('newsAuthor').value = news.author;
      quill.root.innerHTML = news.content;
      
      // Set image if exists
      if (news.image_data) {
        // Image is stored as BLOB, load from endpoint
        newsImageData = null; // Will keep existing image if not changed
        newsImagePreview.src = `/api/news/${id}/image`;
        newsImagePreview.style.display = 'block';
        newsImagePlaceholder.style.display = 'none';
        newsImageFileName.style.display = 'block';
        newsImageFileName.querySelector('span').textContent = 'Gambar saat ini (tidak akan diubah jika tidak upload baru)';
      }
      
      // Set editing mode
      editingNewsId = id;
      
      // Update form UI
      const submitBtn = document.querySelector('#newsForm button[type="submit"]');
      submitBtn.textContent = '💾 Update Berita';
      submitBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      
      // Add cancel button if not exists
      let cancelBtn = document.getElementById('cancelEditBtn');
      if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelEditBtn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn';
        cancelBtn.textContent = '❌ Batal Edit';
        cancelBtn.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
        cancelBtn.style.marginTop = '10px';
        cancelBtn.onclick = cancelEdit;
        submitBtn.parentElement.insertBefore(cancelBtn, submitBtn.nextSibling);
      }
      
      // Scroll to form
      document.querySelector('.admin-card:has(#newsForm)').scrollIntoView({ behavior: 'smooth', block: 'start' });
      
    } catch (err) {
      console.error('Error loading news for edit:', err);
      alert('❌ Gagal memuat data berita');
    }
  };
  
  // Cancel edit function
  function cancelEdit() {
    editingNewsId = null;
    document.getElementById('newsForm').reset();
    quill.setContents([]);
    newsImageData = null;
    newsImagePreview.style.display = 'none';
    newsImagePlaceholder.style.display = 'block';
    newsImageFileName.style.display = 'none';
    
    const submitBtn = document.querySelector('#newsForm button[type="submit"]');
    submitBtn.textContent = '📤 Posting Berita';
    submitBtn.style.background = 'linear-gradient(135deg, #0052b4 0%, #003d82 100%)';
    
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.remove();
  }

  // Delete news function
  window.deleteNews = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus berita ini?')) return;
    
    try {
      const res = await fetch(`/api/news/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ Berita berhasil dihapus');
        loadNewsList();
      } else {
        alert('❌ Gagal menghapus berita');
      }
    } catch (err) {
      console.error('Error deleting news:', err);
      alert('❌ Terjadi kesalahan saat menghapus berita');
    }
  };

  // Load news on page load
  loadNewsList();

})();
