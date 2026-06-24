import express from 'express';
import type { Response } from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get discovery cards - profiles to swipe on
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await pool.query(
      `SELECT p.user_id, p.first_name, p.age, p.gender, p.city,
              p.bio, p.interests, p.primary_photo_url, p.is_verified
       FROM profiles p
       WHERE p.user_id != $1
         AND p.profile_complete = true
         AND p.user_id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = $1
         )
         AND p.user_id NOT IN (
           SELECT blocked_id FROM blocks WHERE blocker_id = $1
         )
         AND p.user_id NOT IN (
           SELECT blocker_id FROM blocks WHERE blocked_id = $1
         )
       ORDER BY RANDOM()
       LIMIT $2`,
      [userId, limit]
    );

    res.json({
      cards: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get discovery cards', details: error.message });
  }
});

export default router;