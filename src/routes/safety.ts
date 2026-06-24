import express from 'express';
import type { Response } from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Block a user
router.post('/block', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { blocked_id, reason } = req.body;

    if (!blocked_id) {
      return res.status(400).json({ error: 'blocked_id required' });
    }

    if (blocked_id === userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Record the block (ignore if already blocked)
    await pool.query(
      `INSERT INTO blocks (blocker_id, blocked_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [userId, blocked_id, reason || null]
    );

    // End any active match between them
    await pool.query(
      `UPDATE matches SET status = 'blocked'
       WHERE (user_id_1 = $1 AND user_id_2 = $2)
          OR (user_id_1 = $2 AND user_id_2 = $1)`,
      [userId, blocked_id]
    );

    res.json({ success: true, message: 'User blocked' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to block', details: error.message });
  }
});

// Unblock a user
router.delete('/block/:blockedId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { blockedId } = req.params;

    await pool.query(
      'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [userId, blockedId]
    );

    res.json({ success: true, message: 'User unblocked' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to unblock', details: error.message });
  }
});

// Get my blocked users
router.get('/blocks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT b.blocked_id, b.reason, b.created_at, p.first_name
       FROM blocks b
       LEFT JOIN profiles p ON p.user_id = b.blocked_id
       WHERE b.blocker_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    res.json({ blocked: result.rows, count: result.rows.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get blocks', details: error.message });
  }
});

// Report a user
router.post('/report', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { reported_user_id, report_type, description } = req.body;

    if (!reported_user_id || !report_type) {
      return res.status(400).json({ error: 'reported_user_id and report_type required' });
    }

    const validTypes = ['fake_profile', 'spam', 'harassment', 'inappropriate_photo', 'other'];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json({ error: 'Invalid report_type' });
    }

    const result = await pool.query(
      `INSERT INTO reports (reporter_id, reported_user_id, report_type, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, reported_user_id, report_type, description || null]
    );

    res.json({
      success: true,
      report_id: result.rows[0].id,
      message: "Report submitted. We'll review it shortly."
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to report', details: error.message });
  }
});

export default router;