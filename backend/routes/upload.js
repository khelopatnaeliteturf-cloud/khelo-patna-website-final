const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middlewares/auth');
const { uploadToCloudinary } = require('../services/cloudinary');

const path = require('path');

// Setup multer to store file in memory temporarily
const allowedUploadMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
]);

const allowedUploadExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // Limit to 10MB
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (!allowedUploadMimeTypes.has(file.mimetype) || !allowedUploadExtensions.has(ext)) {
            return cb(new Error('Only JPG, PNG, WebP, and PDF files are allowed.'));
        }
        cb(null, true);
    }
});

const handleSingleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File is too large. Maximum size is 10MB.' });
        }

        return res.status(400).json({ error: err.message || 'Invalid upload.' });
    });
};

// POST /api/upload
router.post('/upload', authenticateToken, handleSingleUpload, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        const url = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        res.json({
            success: true,
            url: url
        });
    } catch (err) {
        console.error('Upload route error:', err);
        res.status(500).json({ error: err.message || 'Error uploading file to storage.' });
    }
});

module.exports = router;
