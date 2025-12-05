// User map: load banner, draw points colored by risk category (rendah/sedang/tinggi)
(function(){
  // Common date formatting patterns
  const DATE_FORMAT_FULL = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  const DATE_FORMAT_WITH_TIME = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const DATE_FORMAT_LONG = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  const TIME_FORMAT = {
    hour: '2-digit',
    minute: '2-digit'
  };
  
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
  const map = L.map('map').setView([0.9167, 104.4510], 12);

  // Load basemap with CartoDB Voyager
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &amp; CARTO',
    subdomains: 'abcd'
  }).addTo(map);

  // Load banner caption from database
  fetch('/api/banner?t=' + Date.now()).then(r=>r.json()).then(b=>{
    const bannerCaption = document.getElementById('bannerCaption');
    if (b && b.caption) {
      bannerCaption.textContent = b.caption;
    }
  }).catch(err => {
    console.error('Failed to load banner caption:', err);
  });

  // Kelurahan data with predefined colors (18 kelurahan)
  const kelurahanList = [
    { "name": "Dompak", "color": "#1f78b4" },
    { "name": "Sei Jang", "color": "#33a02c" },
    { "name": "Tanjung Ayun Sakti", "color": "#e31a1c" },
    { "name": "Tanjungpinang Timur", "color": "#ff7f00" },
    { "name": "Tanjung Unggat", "color": "#6a3d9a" },
    { "name": "Bukit Cermin", "color": "#b15928" },
    { "name": "Kampung Baru", "color": "#a6cee3" },
    { "name": "Kemboja", "color": "#b2df8a" },
    { "name": "Tanjungpinang Barat", "color": "#fb9a99" },
    { "name": "Kampung Bugis", "color": "#fdbf6f" },
    { "name": "Penyengat", "color": "#cab2d6" },
    { "name": "Senggarang", "color": "#ffff99" },
    { "name": "Tanjungpinang Kota", "color": "#8dd3c7" },
    { "name": "Air Raja", "color": "#e41a1c" },
    { "name": "Batu IX", "color": "#377eb8" },
    { "name": "Kampung Bulang", "color": "#4daf4a" },
    { "name": "Melayu Kota Piring", "color": "#984ea3" },
    { "name": "Pinang Kencana", "color": "#ff7f00" }
  ];

  // Create kelurahan color map for quick lookup
  const kelurahanColorMap = {};
  kelurahanList.forEach(k => {
    kelurahanColorMap[k.name] = k.color;
  });

  const legend = L.control({ position: 'bottomright' });
  let legendDiv;
  let legendContent;
  let isExpanded = false;
  
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'legend legend-mobile');
    
    // Add collapsible header
    const header = document.createElement('div');
    header.className = 'legend-header';
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.style.padding = '8px 10px';
    header.style.borderBottom = '1px solid #eee';
    header.innerHTML = '<span style="font-size:0.9rem; font-weight:700;">📍 Legenda Kelurahan</span><span id="legend-toggle" style="float:right; font-size:0.8rem; color:#666;">▼</span>';
    div.appendChild(header);
    
    // Content container with all 18 kelurahan
    legendContent = document.createElement('div');
    legendContent.className = 'legend-content';
    legendContent.style.padding = '8px 10px';
    legendContent.style.maxHeight = '300px';
    legendContent.style.overflowY = 'auto';
    
    // Build legend HTML with all kelurahan
    let html = '';
    kelurahanList.forEach(k => {
      html += `
        <div style="margin:4px 0; font-size:0.75rem; display:flex; align-items:center; gap:6px;">
          <span style="width:14px; height:14px; background:${k.color}; border-radius:2px; flex-shrink:0; border:1px solid rgba(0,0,0,0.1);"></span>
          <span style="flex:1; font-size:0.75rem;" data-kelurahan="${k.name}">${k.name}</span>
          <span style="background:#f0f0f0; padding:1px 5px; border-radius:8px; font-size:0.7rem; min-width:18px; text-align:center;" data-count="${k.name}">0</span>
        </div>
      `;
    });
    legendContent.innerHTML = html;
    
    div.appendChild(legendContent);
    
    // Toggle functionality
    const toggleIcon = () => {
      const icon = document.getElementById('legend-toggle');
      if (icon) icon.textContent = isExpanded ? '▲' : '▼';
    };
    
    header.addEventListener('click', function() {
      isExpanded = !isExpanded;
      legendContent.style.display = isExpanded ? 'block' : 'none';
      toggleIcon();
    });
    
    // Auto-collapse on mobile by default
    const checkMobile = () => {
      const isMobile = window.innerWidth <= 768;
      legendContent.style.display = isMobile ? 'none' : 'block';
      isExpanded = !isMobile;
      toggleIcon();
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    div.style.background = 'white';
    div.style.borderRadius = '6px';
    div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
    div.style.maxWidth = '220px';
    div.style.fontSize = '0.8rem';
    legendDiv = div;
    return div;
  };
  
  legend.updateCounts = function(counts){
    if (!legendContent) return;
    
    // Reset all counts to 0
    kelurahanList.forEach(k => {
      const el = legendContent.querySelector(`[data-count="${k.name}"]`);
      if (el) el.textContent = '0';
    });
    
    // Update counts from data
    Object.keys(counts || {}).forEach(name => {
      const el = legendContent.querySelector(`[data-count="${name}"]`);
      if (el) el.textContent = String(counts[name] || 0);
    });
  };
  
  legend.addTo(map);

  // Load points with kelurahan-based colors
  let markersLayer = L.layerGroup().addTo(map);
  
  function loadPoints(){
    fetch('/api/points').then(r=>r.json()).then(points=>{
      markersLayer.clearLayers();
      
      // Count points per kelurahan
      const counts = {};
      
      points.forEach(p=>{
        const kelurahanName = p.name || 'Tidak Diketahui';
        counts[kelurahanName] = (counts[kelurahanName] || 0) + 1;
        
        // Get color from kelurahan map, default to gray if not found
        const markerColor = kelurahanColorMap[kelurahanName] || '#999999';
        
        const m = L.circleMarker([p.lat, p.lng], {
          radius: 10,
          color: '#ffffff',
          weight: 2,
          fillColor: markerColor,
          fillOpacity: 0.9
        }).addTo(markersLayer);
        
        const popupContent = `
          <div style="min-width:200px;">
            <h3 style="margin:0 0 8px 0; font-size:1rem;">${kelurahanName}</h3>
            <div style="margin-bottom:6px;">
              <strong>📍 Koordinat:</strong><br/>
              ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}
            </div>
            ${p.description ? `<div style="margin-bottom:6px;"><strong>📝 Keterangan:</strong><br/>${p.description}</div>` : ''}
            <div style="color:#999; font-size:0.85rem; margin-top:8px;">
              <small>🕐 ${formatDateWIB(p.created_at, DATE_FORMAT_WITH_TIME)} WIB</small>
            </div>
          </div>
        `;
        m.bindPopup(popupContent);
        m.bindTooltip(kelurahanName, {direction:'top', offset:[0,-8]});
      });
      
      // Update legend counts
      legend.updateCounts(counts);
      
      // Fit bounds if there are points
      if(points.length) {
        try { 
          map.fitBounds(markersLayer.getBounds(), { padding:[50,50], maxZoom: 14 }); 
        } catch(e) {
          console.warn('Could not fit bounds:', e);
        }
      }
    }).catch(err => {
      console.error('Failed to load points:', err);
    });
  }
  
  // Load points initially and poll every 30 seconds
  loadPoints();
  setInterval(loadPoints, 30000);

  // ===== NEWS SECTION =====
  
  let allNews = [];
  let displayedCount = 6;
  let currentSearchQuery = '';

  // Load news from API
  async function loadNews() {
    try {
      const res = await fetch('/api/news');
      allNews = await res.json();
      displayNews();
      checkUrlParameter(); // Auto-open news from URL parameter
    } catch (err) {
      console.error('Error loading news:', err);
      document.getElementById('newsEmptyState').style.display = 'block';
    }
  }

  // Display news based on current filters
  function displayNews() {
    const newsGrid = document.getElementById('newsGrid');
    const emptyState = document.getElementById('newsEmptyState');
    const showMoreBtn = document.getElementById('showMoreNews');
    
    let newsToDisplay = currentSearchQuery ? 
      allNews.filter(n => 
        n.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
        n.author.toLowerCase().includes(currentSearchQuery.toLowerCase())
      ) : allNews;
    
    if (newsToDisplay.length === 0) {
      newsGrid.innerHTML = '';
      emptyState.style.display = 'block';
      showMoreBtn.style.display = 'none';
      return;
    }
    
    emptyState.style.display = 'none';
    
    const newsToShow = newsToDisplay.slice(0, displayedCount);
    
    newsGrid.innerHTML = newsToShow.map(news => {
      // Strip HTML tags for excerpt
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = news.content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      return `
        <div class="news-card" onclick="openNewsModal(${news.id})">
          ${news.image_data ? 
            `<img src="/api/news/${news.id}/image" alt="${news.title}" class="news-card-image" />` : 
            '<div class="news-card-image" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); display:flex; align-items:center; justify-content:center; color:white; font-size:3rem;">📰</div>'
          }
          <div class="news-card-content">
            <h3 class="news-card-title">${news.title}</h3>
            <div class="news-card-meta">
              <span>📅 ${formatDateWIB(news.created_at, DATE_FORMAT_FULL)}</span>
              <span>👤 ${news.author}</span>
            </div>
            <p class="news-card-excerpt">${plainText}</p>
          </div>
        </div>
      `;
    }).join('');
    
    // Show/hide "Show More" button
    if (newsToDisplay.length > displayedCount) {
      showMoreBtn.style.display = 'inline-block';
    } else {
      showMoreBtn.style.display = 'none';
    }
  }

  // Open news detail modal (Detik.com style)
  window.openNewsModal = function(newsId) {
    const news = allNews.find(n => n.id === newsId);
    if (!news) return;
    
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('newsModalBody');
    
    const formattedDate = formatDateWIB(news.created_at, DATE_FORMAT_LONG);
    const formattedTime = formatDateWIB(news.created_at, TIME_FORMAT);
    
    // Build unique share URLs for this news article
    const baseUrl = window.location.origin + window.location.pathname;
    const newsUrl = `${baseUrl}?news=${news.id}`;
    const shareUrl = encodeURIComponent(newsUrl);
    const shareTitle = encodeURIComponent(news.title);
    const shareText = encodeURIComponent(`${news.title} - BNN Kota Tanjungpinang`);
    
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
    const twShareUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
    const waShareUrl = `https://wa.me/?text=${shareText}%20${shareUrl}`;
    const copyUrl = newsUrl;
    
    modalBody.innerHTML = `
      <div class="modal-header">
        <span class="modal-category">BERITA BNN</span>
        <h1 class="modal-title">${news.title}</h1>
        <div class="modal-meta">
          <span><strong>${formattedDate}</strong>, ${formattedTime} WIB</span>
          <span>|</span>
          <span>Oleh: <strong>${news.author}</strong></span>
        </div>
      </div>
      
      ${news.image_data ? `
        <img src="/api/news/${news.id}/image" alt="${news.title}" class="modal-image" />
        <div class="modal-image-caption">Foto: BNN Kota Tanjungpinang</div>
      ` : ''}
      
      <div class="modal-body">
        <div class="modal-social">
          <span class="modal-social-label">Bagikan:</span>
          <a href="${fbShareUrl}" target="_blank" rel="noopener noreferrer" class="modal-social-btn modal-social-fb">📘 Facebook</a>
          <a href="${twShareUrl}" target="_blank" rel="noopener noreferrer" class="modal-social-btn modal-social-tw">🐦 Twitter</a>
          <a href="${waShareUrl}" target="_blank" rel="noopener noreferrer" class="modal-social-btn modal-social-wa">💬 WhatsApp</a>
          <button onclick="copyNewsLink('${copyUrl}')" class="modal-social-btn modal-social-copy">🔗 Salin Link</button>
        </div>
        
        ${news.content}
        
        <div class="modal-social" style="margin-top:40px;">
          <span class="modal-social-label">Bagikan Artikel Ini:</span>
          <a href="${fbShareUrl}" target="_blank" rel="noopener noreferrer" class="modal-social-btn modal-social-fb">📘 Facebook</a>
          <a href="${twShareUrl}" target="_blank" rel="noopener noreferrer" class="modal-social-btn modal-social-tw">🐦 Twitter</a>
          <a href="${waShareUrl}" target="_blank" rel="noopener noreferrer" class="modal-social-btn modal-social-wa">💬 WhatsApp</a>
          <button onclick="copyNewsLink('${copyUrl}')" class="modal-social-btn modal-social-copy">🔗 Salin Link</button>
        </div>
      </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
  };

  // Copy news link function
  window.copyNewsLink = function(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert('✅ Link berhasil disalin ke clipboard!');
      }).catch(() => {
        fallbackCopyLink(url);
      });
    } else {
      fallbackCopyLink(url);
    }
  };

  function fallbackCopyLink(url) {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      alert('✅ Link berhasil disalin ke clipboard!');
    } catch (err) {
      alert('❌ Gagal menyalin link. Silakan salin manual: ' + url);
    }
    document.body.removeChild(textarea);
  }

  // Auto-open news from URL parameter
  function checkUrlParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = urlParams.get('news');
    if (newsId && allNews && allNews.length > 0) {
      const news = allNews.find(n => n.id === parseInt(newsId));
      if (news) {
        setTimeout(() => openNewsModal(parseInt(newsId)), 500);
      }
    }
  }

  // Close modal
  const modal = document.getElementById('newsModal');
  const closeBtn = document.querySelector('.modal-close');
  
  closeBtn.onclick = function() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  };
  
  window.onclick = function(event) {
    if (event.target === modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  };

  // Search news
  const searchInput = document.getElementById('newsSearchInput');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearchQuery = e.target.value.trim();
      displayedCount = 6; // Reset to initial count
      displayNews();
    }, 300);
  });

  // Show more button
  document.getElementById('showMoreNews').addEventListener('click', () => {
    displayedCount += 6;
    displayNews();
  });

  // Load news on page load
  loadNews();

})();
