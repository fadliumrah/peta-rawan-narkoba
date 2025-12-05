// Image handling utilities

/**
 * Parse base64 image data and extract buffer and mime type
 * @param {string} data - Base64 string with or without data URL prefix
 * @returns {Object} { buffer, mimeType }
 */
function parseImageData(data) {
  if (!data) {
    throw new Error('No image data provided');
  }
  
  // Extract base64 data and mime type
  const match = data.match(/^data:(image\/[\w+]+);base64,(.*)$/);
  const mimeType = match ? match[1] : 'image/png';
  const b64 = match ? match[2] : data;
  
  try {
    const buffer = Buffer.from(b64, 'base64');
    return { buffer, mimeType };
  } catch (error) {
    throw new Error('Invalid base64 data: ' + error.message);
  }
}

/**
 * Validate image size
 * @param {Buffer} buffer - Image buffer
 * @param {number} maxSizeMB - Maximum size in MB (default 50)
 * @returns {boolean}
 */
function validateImageSize(buffer, maxSizeMB = 50) {
  const sizeInMB = buffer.length / (1024 * 1024);
  return sizeInMB <= maxSizeMB;
}

/**
 * Get appropriate mime type for image
 * @param {string} data - Base64 string with data URL prefix
 * @returns {string} Mime type
 */
function getMimeType(data) {
  const match = data.match(/^data:(image\/[\w+]+);base64,/);
  return match ? match[1] : 'image/png';
}

module.exports = {
  parseImageData,
  validateImageSize,
  getMimeType
};
