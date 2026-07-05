const cloudinary = require('cloudinary').v2;
const path = require('path');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

let isConfigured = false;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET
    });
    isConfigured = true;
} else {
    console.log('Cloudinary credentials missing in environment. Running in MOCK Mode.');
}

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer
 * @param {string} originalName
 * @returns {Promise<string>} Uploaded file URL
 */
async function uploadToCloudinary(fileBuffer, originalName) {
    const parsedName = path.parse(originalName || 'upload');
    const safeBaseName = (parsedName.name || 'upload')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80) || 'upload';
    const safeExtension = (parsedName.ext || '.png').replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) || '.png';

    if (!isConfigured) {
        console.log(`[Mock Cloudinary Upload] file: ${originalName}`);
        // Return a mock URL simulating successful upload
        const uniqueId = Date.now() + Math.random().toString(36).substring(2, 9);
        return `https://res.cloudinary.com/demo/image/upload/v1234567890/khelopatna_${uniqueId}${safeExtension}`;
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
                folder: 'khelopatna_uploads',
                public_id: `${safeBaseName}_${Date.now()}`
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(new Error('Failed to upload asset to Cloudinary.'));
                }
                resolve(result.secure_url);
            }
        );
        stream.end(fileBuffer);
    });
}

module.exports = {
    uploadToCloudinary
};
