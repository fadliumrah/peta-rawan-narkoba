// Input validation middleware

// Validate point data
function validatePoint(req, res, next) {
  const { name, lat, lng, category, description } = req.body;
  
  // Check required fields
  if (typeof lat === 'undefined' || typeof lng === 'undefined') {
    return res.status(400).json({ error: 'lat,lng required' });
  }
  if (!name || !category) {
    return res.status(400).json({ error: 'name and category required' });
  }
  
  // Validate category
  if (!['rendah', 'sedang', 'tinggi'].includes(category)) {
    return res.status(400).json({ error: 'category must be rendah, sedang, or tinggi' });
  }
  
  // Validate coordinates
  const latitude = Number(lat);
  const longitude = Number(lng);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
  }
  
  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
  }
  
  // Validate name length
  if (name.length > 200) {
    return res.status(400).json({ error: 'Name too long (max 200 characters)' });
  }
  
  // Validate description length if provided
  if (description && description.length > 1000) {
    return res.status(400).json({ error: 'Description too long (max 1000 characters)' });
  }
  
  next();
}

// Validate news data
function validateNews(req, res, next) {
  const { title, content, author } = req.body;
  
  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Title, content, and author are required' });
  }
  
  // Validate lengths
  if (title.length > 200) {
    return res.status(400).json({ error: 'Title too long (max 200 characters)' });
  }
  
  if (content.length > 10000) {
    return res.status(400).json({ error: 'Content too long (max 10000 characters)' });
  }
  
  if (author.length > 100) {
    return res.status(400).json({ error: 'Author name too long (max 100 characters)' });
  }
  
  next();
}

// Validate image data
function validateImageData(data) {
  if (!data) return { valid: false, error: 'No image data provided' };
  
  // Check if it's a base64 data URL
  const match = data.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    // Try without data URL prefix
    if (!/^[A-Za-z0-9+/]+=*$/.test(data)) {
      return { valid: false, error: 'Invalid base64 data' };
    }
  }
  
  // Check file size (50MB limit)
  const base64Length = match ? match[2].length : data.length;
  const sizeInBytes = (base64Length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  if (sizeInMB > 50) {
    return { valid: false, error: 'Image too large (max 50MB)' };
  }
  
  return { valid: true };
}

// Sanitize HTML to prevent XSS
function sanitizeHtml(text) {
  if (!text) return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

module.exports = {
  validatePoint,
  validateNews,
  validateImageData,
  sanitizeHtml
};
