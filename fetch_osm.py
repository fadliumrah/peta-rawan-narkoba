#!/usr/bin/env python3
import urllib.request
import json

# Overpass API query untuk kelurahan Tanjungpinang
query = """
[bbox:0.7,104.3,1.1,104.6];
(
  relation["boundary"="administrative"]["admin_level"="8"];
);
out geom;
"""

url = "https://overpass-api.de/api/interpreter"

try:
    print("Fetching data dari Overpass API...")
    req = urllib.request.Request(url, data=query.encode('utf-8'), method='POST')
    with urllib.request.urlopen(req, timeout=60) as response:
        data = response.read()
        print(f"Downloaded {len(data)} bytes")
        
        # Parse OSM format dan convert ke GeoJSON
        osm_data = json.loads(data)
        
        # Simple conversion: extract ways and relations
        geojson = {
            "type": "FeatureCollection",
            "features": []
        }
        
        # Collect all elements
        if 'elements' in osm_data:
            for elem in osm_data['elements']:
                if elem['type'] == 'relation' and elem.get('tags', {}).get('boundary') == 'administrative':
                    name = elem.get('tags', {}).get('name', 'Unknown')
                    members = elem.get('members', [])
                    
                    # Extract geometry dari members
                    geometry = None
                    
                    # Coba parse outer way dari members
                    for member in members:
                        if member.get('role') == 'outer' and member['type'] == 'way':
                            # In full OSM dump, ways memiliki nodes dengan lat/lon
                            pass
                    
                    # Untuk sekarang, skip relations yang kompleks
                    # Kita hanya process jika ada geometry langsung
                    if 'geometry' in elem:
                        geom_points = elem['geometry']
                        if len(geom_points) > 2:
                            coords = [[pt['lon'], pt['lat']] for pt in geom_points]
                            coords.append(coords[0])  # close polygon
                            
                            feature = {
                                "type": "Feature",
                                "properties": {
                                    "name": name,
                                    "boundary": "administrative",
                                    "admin_level": elem.get('tags', {}).get('admin_level', '8')
                                },
                                "geometry": {
                                    "type": "Polygon",
                                    "coordinates": [coords]
                                }
                            }
                            geojson['features'].append(feature)
        
        print(f"Converted {len(geojson['features'])} features")
        
        # Save to file
        with open('d:/PROJECT BNNK/public/data/kelurahan_osm.json', 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        
        print("✅ Saved to public/data/kelurahan_osm.json")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
