import express from 'express';
import type { Response } from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Like a user
router.post('/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { swiped_id } = req.body;

    if (!swiped_id) {
      return res.status(400).json({ error: 'swiped_id required' });
    }

    if (swiped_id === userId) {
      return res.status(400).json({ error: 'Cannot swipe yourself' });
    }

    // Record the like (ignore if already swiped)
    await pool.query(
      `INSERT INTO swipes (swiper_id, swiped_id, action)
       VALUES ($1, $2, 'like')
       ON CONFLICT (swiper_id, swiped_id) DO NOTHING`,
      [userId, swiped_id]
    );

    // Check if the other person already liked us
    const mutualCheck = await pool.query(
      `SELECT id FROM swipes
       WHERE swiper_id = $1 AND swiped_id = $2 AND action = 'like'`,
      [swiped_id, userId]
    );

    if (mutualCheck.rows.length > 0) {
      // It's a match! Create it
      const matchResult = await pool.query(
        `INSERT INTO matches (user_id_1, user_id_2)
         VALUES ($1, $2)
         RETURNING id, matched_at`,
        [userId, swiped_id]
      );

      // Get the matched user's basic info
      const matchedUser = await pool.query(
        `SELECT first_name, primary_photo_url FROM profiles WHERE user_id = $1`,
        [swiped_id]
      );

      return res.json({
        success: true,
        action: 'like',
        is_match: true,
        match: {
          id: matchResult.rows[0].id,
          matched_at: matchResult.rows[0].matched_at,
          user: matchedUser.rows[0]
        }
      });
    }

    res.json({
      success: true,
      action: 'like',
      is_match: false
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to like', details: error.message });
  }
});

// Pass on a user
router.post('/pass', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { swiped_id } = req.body;

    if (!swiped_id) {
      return res.status(400).json({ error: 'swiped_id required' });
    }

    await pool.query(
      `INSERT INTO swipes (swiper_id, swiped_id, action)
       VALUES ($1, $2, 'pass')
       ON CONFLICT (swiper_id, swiped_id) DO NOTHING`,
      [userId, swiped_id]
    );

    res.json({ success: true, action: 'pass' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to pass', details: error.message });
  }
});

export default router;