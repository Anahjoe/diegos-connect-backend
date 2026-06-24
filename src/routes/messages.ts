import express from 'express';
import type { Response } from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all my matches (with last message preview)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT m.id AS match_id, m.matched_at,
              p.user_id, p.first_name, p.primary_photo_url, p.city
       FROM matches m
       JOIN profiles p ON (
         p.user_id = CASE
           WHEN m.user_id_1 = $1 THEN m.user_id_2
           ELSE m.user_id_1
         END
       )
       WHERE (m.user_id_1 = $1 OR m.user_id_2 = $1)
         AND m.status = 'active'
       ORDER BY m.matched_at DESC`,
      [userId]
    );

    res.json({ matches: result.rows, count: result.rows.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get matches', details: error.message });
  }
});

// Get messages in a specific match
router.get('/:matchId/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { matchId } = req.params;

    // Verify user is part of this match
    const matchCheck = await pool.query(
      `SELECT id FROM matches
       WHERE id = $1 AND (user_id_1 = $2 OR user_id_2 = $2)`,
      [matchId, userId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not part of this match' });
    }

    const result = await pool.query(
      `SELECT id, sender_id, recipient_id, text, is_read, created_at
       FROM messages
       WHERE match_id = $1
       ORDER BY created_at ASC`,
      [matchId]
    );

    res.json({ messages: result.rows, count: result.rows.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get messages', details: error.message });
  }
});

// Send a message in a match
router.post('/:matchId/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { matchId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text required' });
    }

    // Verify match and get the other user
    const matchCheck = await pool.query(
      `SELECT user_id_1, user_id_2 FROM matches
       WHERE id = $1 AND (user_id_1 = $2 OR user_id_2 = $2) AND status = 'active'`,
      [matchId, userId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not part of this match' });
    }

    const match = matchCheck.rows[0];
    const recipientId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    const result = await pool.query(
      `INSERT INTO messages (match_id, sender_id, recipient_id, text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, text, created_at, is_read`,
      [matchId, userId, recipientId, text]
    );

    res.json({ success: true, message: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

// Mark messages as read
router.post('/:matchId/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { matchId } = req.params;

    const result = await pool.query(
      `UPDATE messages
       SET is_read = true, read_at = NOW()
       WHERE match_id = $1 AND recipient_id = $2 AND is_read = false`,
      [matchId, userId]
    );

    res.json({ success: true, marked_read: result.rowCount });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mark read', details: error.message });
  }
});

export default router;