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

  // Color mapping for markers based on category
  const categoryMap = {
    rendah: { color: '#4CAF50', emoji: '🟢' },
    sedang: { color: '#FFC107', emoji: '🟡' },
    tinggi: { color: '#F44336', emoji: '🔴' }
  };

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
    
    // Content container (will be populated with kelurahan names)
    legendContent = document.createElement('div');
    legendContent.className = 'legend-content';
    legendContent.style.padding = '8px 10px';
    legendContent.style.maxHeight = '250px';
    legendContent.style.overflowY = 'auto';
    legendContent.innerHTML = '<div style="color:#999; font-size:0.75rem; text-align:center; padding:8px;">Memuat data...</div>';
    
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
    div.style.maxWidth = '200px';
    div.style.fontSize = '0.8rem';
    legendDiv = div;
    return div;
  };
  
  legend.updateKelurahan = function(points){
    if (!legendContent) return;
    
    if (!points || points.length === 0) {
      legendContent.innerHTML = '<div style="color:#999; font-size:0.75rem; text-align:center; padding:8px;">Belum ada data</div>';
      return;
    }
    
    // Group by kelurahan name
    const kelurahanMap = {};
    points.forEach(p => {
      const name = p.name || 'Tidak Diketahui';
      if (!kelurahanMap[name]) {
        kelurahanMap[name] = {
          count: 0,
          category: p.category || 'sedang'
        };
      }
      kelurahanMap[name].count++;
    });
    
    // Sort by name
    const sortedNames = Object.keys(kelurahanMap).sort();
    
    // Build legend HTML
    let html = '';
    sortedNames.forEach(name => {
      const data = kelurahanMap[name];
      const catInfo = categoryMap[data.category] || categoryMap.sedang;
      html += `
        <div style="margin:4px 0; font-size:0.75rem; display:flex; align-items:center; gap:4px;">
          <span style="width:8px; height:8px; background:${catInfo.color}; border-radius:50%; flex-shrink:0;"></span>
          <span style="flex:1; font-size:0.75rem;">${name}</span>
        </div>
      `;
    });
    
    legendContent.innerHTML = html;
  };
  
  legend.addTo(map);

  // Load points with category-based colors
  let markersLayer = L.layerGroup().addTo(map);
  
  function loadPoints(){
    fetch('/api/points').then(r=>r.json()).then(points=>{
      markersLayer.clearLayers();
      
      points.forEach(p=>{
        const category = p.category || 'sedang';
        const catInfo = categoryMap[category] || categoryMap.sedang;
        
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
              <strong>📍 Koordinat:</strong><br/>
              ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}
            </div>
            ${p.description ? `<div style="margin-bottom:6px;"><strong>📝 Keterangan:</strong><br/>${p.description}</div>` : ''}
            <div style="color:#999; font-size:0.85rem; margin-top:8px;">
              <small>🕐 ${new Date(p.created_at).toLocaleDateString('id-ID', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</small>
            </div>
          </div>
        `;
        m.bindPopup(popupContent);
        m.bindTooltip(p.name || 'Lokasi Rawan', {direction:'top', offset:[0,-8]});
      });
      
      // Update legend with kelurahan names
      legend.updateKelurahan(points);
      
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
