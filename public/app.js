// User map: load banner, draw points colored by risk category (rendah/sedang/tinggi)
(function(){
  const map = L.map('map').setView([0.9167, 104.4510], 12);

  // Load basemap with CartoDB Voyager
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &amp; CARTO',
    subdomains: 'abcd'
  }).addTo(map);

  // load banner
  fetch('/api/banner').then(r=>r.json()).then(b=>{
    const bannerImg = document.getElementById('bannerImg');
    const bannerCaption = document.getElementById('bannerCaption');
    
    if (b && b.caption) {
      bannerCaption.textContent = b.caption;
    }
    
    if (b && b.url) {
      bannerImg.src = b.url;
      bannerImg.style.display = 'block';
    } else {
      bannerImg.style.display = 'none';
    }
  }).catch(err => {
    console.error('Failed to load banner:', err);
    const caption = document.getElementById('bannerCaption');
    if (caption) caption.textContent = 'Informasi Area Rawan Narkoba - Kota Tanjungpinang';
  });

  // Setup legend for risk categories
  const categoryMap = {
    rendah: { color: '#4CAF50', label: 'Tingkat Rendah', emoji: '🟢' },
    sedang: { color: '#FFC107', label: 'Tingkat Sedang', emoji: '🟡' },
    tinggi: { color: '#F44336', label: 'Tingkat Tinggi', emoji: '🔴' }
  };

  const legend = L.control({ position: 'bottomright' });
  let legendDiv;
  let legendContent;
  let isExpanded = false;
  
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'legend legend-mobile');
    
    // Add collapsible header - show/hide on tap
    const header = document.createElement('div');
    header.className = 'legend-header';
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.style.padding = '8px 10px';
    header.style.borderBottom = '1px solid #eee';
    header.innerHTML = '<span style="font-size:0.9rem; font-weight:700;">📍 Tingkat Kerawanan</span><span id="legend-toggle" style="float:right; font-size:0.8rem; color:#666;">▼</span>';
    div.appendChild(header);
    
    // Content container (collapsible)
    legendContent = document.createElement('div');
    legendContent.className = 'legend-content';
    legendContent.style.padding = '8px 10px';
    
    Object.keys(categoryMap).forEach(cat => {
      const info = categoryMap[cat];
      const row = document.createElement('div');
      row.style.margin = '5px 0';
      row.style.fontSize = '0.85rem';
      row.innerHTML = `<span style="display:inline-block; width:12px; height:12px; background:${info.color}; border-radius:50%; margin-right:6px; vertical-align:middle;"></span><span style="vertical-align:middle;">${info.emoji} ${info.label}</span><span data-category="${cat}" style="float:right; background:#f0f0f0; padding:1px 5px; border-radius:10px; font-size:0.75rem; margin-left:6px; min-width:18px; text-align:center;">0</span>`;
      legendContent.appendChild(row);
    });
    
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
    if (window.innerWidth <= 768) {
      legendContent.style.display = 'none';
      isExpanded = false;
    } else {
      legendContent.style.display = 'block';
      isExpanded = true;
    }
    toggleIcon();
    
    div.style.background = 'white';
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    div.style.maxWidth = '220px';
    div.style.fontSize = '0.85rem';
    legendDiv = div;
    return div;
  };
  
  legend.updateCounts = function(counts){
    if (!legendDiv) return;
    Object.keys(counts||{}).forEach(cat => {
      const el = legendDiv.querySelector(`[data-category="${cat}"]`);
      if (el) el.textContent = String(counts[cat] || 0);
    });
  };
  
  legend.addTo(map);

  // Load points with category-based colors
  let markersLayer = L.layerGroup().addTo(map);
  
  function loadPoints(){
    fetch('/api/points').then(r=>r.json()).then(points=>{
      markersLayer.clearLayers();
      
      // Count points per category
      const counts = { rendah: 0, sedang: 0, tinggi: 0 };
      
      points.forEach(p=>{
        const category = p.category || 'rendah';
        counts[category] = (counts[category] || 0) + 1;
        
        const catInfo = categoryMap[category] || categoryMap.rendah;
        const m = L.circleMarker([p.lat, p.lng], {
          radius: 10,
          color: '#ffffff',
          weight: 2,
          fillColor: catInfo.color,
          fillOpacity: 0.95
        }).addTo(markersLayer);
        
        const popupContent = `
          <div style="min-width:200px;">
            <h3 style="margin:0 0 8px 0; font-size:1rem;">${p.name || 'Lokasi Rawan'}</h3>
            <div style="margin-bottom:6px;">
              <strong>${catInfo.emoji} Tingkat:</strong> ${catInfo.label}
            </div>
            <div style="margin-bottom:6px;">
              <strong>📍 Koordinat:</strong><br/>
              ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}
            </div>
            ${p.description ? `<div style="margin-bottom:6px;"><strong>📝 Deskripsi:</strong><br/>${p.description}</div>` : ''}
            <div style="color:#999; font-size:0.85rem; margin-top:8px;">
              <small>🕐 ${new Date(p.created_at).toLocaleDateString('id-ID', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</small>
            </div>
          </div>
        `;
        m.bindPopup(popupContent);
        m.bindTooltip(p.name || 'Lokasi Rawan', {direction:'top', offset:[0,-8]});
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
})();
