import express from 'express';
import multer from 'multer';
import pool from '../config/database.js';
import cloudinary from '../config/cloudinary.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();
// Store uploaded file in memory temporarily
const upload = multer({ storage: multer.memoryStorage() });
// Upload a photo
router.post('/', authMiddleware, upload.single('photo'), async (req, res) => {
    try {
        const userId = req.userId;
        if (!req.file) {
            return res.status(400).json({ error: 'No photo uploaded' });
        }
        // Get the user's profile id
        const profileResult = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [userId]);
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Create a profile first' });
        }
        const profileId = profileResult.rows[0].id;
        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: 'diegos-connect' }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
            stream.end(req.file.buffer);
        });
        // Count existing photos for display order
        const countResult = await pool.query('SELECT COUNT(*) FROM photos WHERE user_id = $1', [userId]);
        const displayOrder = parseInt(countResult.rows[0].count);
        // Save photo record
        const photoResult = await pool.query(`INSERT INTO photos (user_id, profile_id, url, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, url, display_order`, [userId, profileId, uploadResult.secure_url, displayOrder]);
        // If this is the first photo, set it as primary
        if (displayOrder === 0) {
            await pool.query('UPDATE profiles SET primary_photo_url = $1 WHERE user_id = $2', [uploadResult.secure_url, userId]);
        }
        res.json({ success: true, photo: photoResult.rows[0] });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to upload photo', details: error.message });
    }
});
// Get all my photos
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const result = await pool.query(`SELECT id, url, display_order FROM photos
       WHERE user_id = $1
       ORDER BY display_order ASC`, [userId]);
        res.json({ photos: result.rows, count: result.rows.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get photos', details: error.message });
    }
});
// Delete a photo
router.delete('/:photoId', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { photoId } = req.params;
        const result = await pool.query('DELETE FROM photos WHERE id = $1 AND user_id = $2 RETURNING id', [photoId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }
        res.json({ success: true, message: 'Photo deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete photo', details: error.message });
    }
});
export default router;
//# sourceMappingURL=photos.js.map