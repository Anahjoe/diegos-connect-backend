import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();
// Get my profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const result = await pool.query(`SELECT u.id, u.username, u.phone_number,
              p.first_name, p.bio, p.age, p.gender, p.city,
              p.looking_for, p.interests, p.primary_photo_url,
              p.is_verified, p.profile_complete
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get profile', details: error.message });
    }
});
// Create or complete profile
router.post('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { first_name, bio, age, gender, city, latitude, longitude, looking_for, interests } = req.body;
        if (!first_name || !age || !gender || !city) {
            return res.status(400).json({ error: 'first_name, age, gender, and city are required' });
        }
        // Check if profile already exists
        const existing = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [userId]);
        if (existing.rows.length > 0) {
            // Update existing profile
            const result = await pool.query(`UPDATE profiles
         SET first_name = $1, bio = $2, age = $3, gender = $4, city = $5,
             latitude = $6, longitude = $7, looking_for = $8, interests = $9,
             profile_complete = true, updated_at = NOW()
         WHERE user_id = $10
         RETURNING *`, [first_name, bio, age, gender, city, latitude, longitude, looking_for, interests, userId]);
            return res.json({ success: true, profile: result.rows[0] });
        }
        // Create new profile
        const result = await pool.query(`INSERT INTO profiles
        (user_id, first_name, bio, age, gender, city, latitude, longitude, looking_for, interests, profile_complete)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
       RETURNING *`, [userId, first_name, bio, age, gender, city, latitude, longitude, looking_for, interests]);
        res.json({ success: true, profile: result.rows[0] });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create profile', details: error.message });
    }
});
// Update profile
router.patch('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { bio, interests, looking_for } = req.body;
        const result = await pool.query(`UPDATE profiles
       SET bio = COALESCE($1, bio),
           interests = COALESCE($2, interests),
           looking_for = COALESCE($3, looking_for),
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`, [bio, interests, looking_for, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json({ success: true, profile: result.rows[0] });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }
});
export default router;
//# sourceMappingURL=profiles.js.map