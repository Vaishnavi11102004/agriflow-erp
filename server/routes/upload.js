const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { validate, validationSchemas, validateFileUpload } = require('../middleware/validation');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// POST /api/upload
// Accepts JSON body: { image: "data:image/png;base64,iVBORw0K..." }
// Returns: { url: "/api/uploads/abc123.png" }
router.post('/', validate(validationSchemas.upload), validateFileUpload, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    // Parse the data URI (supports images and pdf)
    const match = image.match(/^data:(image\/(png|jpeg|jpg|gif|webp)|application\/pdf);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid file format. Must be an image or pdf base64 data URI.' });

    const mimeType = match[1];
    const ext = mimeType === 'application/pdf' ? 'pdf' : (mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1]);
    const base64Data = match[3];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate a unique filename
    const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Write to disk
    fs.writeFileSync(filepath, buffer);

    // Return the full absolute URL so it works when opened directly in a browser
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const url = `${protocol}://${host}/api/uploads/${filename}`;
    res.json({ url, filename });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
