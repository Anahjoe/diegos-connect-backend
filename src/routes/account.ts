import express from 'express';
import type { Response } from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get account settings
router.get('/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, username, phone_number, email, status, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ account: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get settings', details: error.message });
  }
});

// Update email
router.post('/email', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }

    await pool.query(
      'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
      [email, userId]
    );

    res.json({ success: true, message: 'Email updated' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update email', details: error.message });
  }
});

// Deactivate account (temporary - can be reactivated)
router.post('/deactivate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    await pool.query(
      "UPDATE users SET status = 'deactivated', updated_at = NOW() WHERE id = $1",
      [userId]
    );

    res.json({ success: true, message: 'Account deactivated. You can reactivate by logging in again.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to deactivate', details: error.message });
  }
});

// Delete account permanently
router.post('/delete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { confirmation } = req.body;

    if (confirmation !== true) {
      return res.status(400).json({ error: 'confirmation must be true to delete account' });
    }

    // Deleting the user cascades to profiles, photos, swipes, matches, messages
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});

export default router;