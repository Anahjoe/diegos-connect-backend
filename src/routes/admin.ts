import express from 'express';
import type { Request, Response } from 'express';
import pool from '../config/database.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = express.Router();

// Dashboard stats
router.get('/stats', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const totalUsers = await pool.query(
      "SELECT COUNT(*) FROM users WHERE status = 'active'"
    );
    const newToday = await pool.query(
      "SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '1 day'"
    );
    const totalMatches = await pool.query('SELECT COUNT(*) FROM matches');
    const totalMessages = await pool.query('SELECT COUNT(*) FROM messages');
    const pendingReports = await pool.query(
      "SELECT COUNT(*) FROM reports WHERE status = 'pending'"
    );
    const cities = await pool.query(
      `SELECT city, COUNT(*) as count FROM profiles
       WHERE city IS NOT NULL
       GROUP BY city ORDER BY count DESC LIMIT 10`
    );

    res.json({
      users: {
        total: parseInt(totalUsers.rows[0].count),
        new_today: parseInt(newToday.rows[0].count)
      },
      matches: parseInt(totalMatches.rows[0].count),
      messages: parseInt(totalMessages.rows[0].count),
      pending_reports: parseInt(pendingReports.rows[0].count),
      cities: cities.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

// Get all reports
router.get('/reports', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending';

    const result = await pool.query(
      `SELECT r.id, r.report_type, r.description, r.status, r.created_at,
              reporter.username AS reporter_username,
              reported.username AS reported_username,
              r.reported_user_id
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       JOIN users reported ON r.reported_user_id = reported.id
       WHERE r.status = $1
       ORDER BY r.created_at DESC`,
      [status]
    );

    res.json({ reports: result.rows, count: result.rows.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get reports', details: error.message });
  }
});

// Resolve a report (take action)
router.post('/reports/:reportId/resolve', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { action } = req.body; // warning, suspended, deleted, dismissed

    const validActions = ['warning', 'suspended', 'deleted', 'dismissed'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Get the report to find the reported user
    const reportResult = await pool.query(
      'SELECT reported_user_id FROM reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const reportedUserId = reportResult.rows[0].reported_user_id;

    // Apply action to the user
    if (action === 'suspended') {
      await pool.query(
        "UPDATE users SET status = 'suspended' WHERE id = $1",
        [reportedUserId]
      );
    } else if (action === 'deleted') {
      await pool.query(
        "UPDATE users SET status = 'deleted' WHERE id = $1",
        [reportedUserId]
      );
    }

    // Mark report as resolved
    await pool.query(
      "UPDATE reports SET status = 'resolved' WHERE id = $1",
      [reportId]
    );

    res.json({ success: true, action, message: `Report resolved with action: ${action}` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to resolve report', details: error.message });
  }
});

// Suspend a user directly
router.post('/users/:userId/suspend', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    await pool.query(
      "UPDATE users SET status = 'suspended' WHERE id = $1",
      [userId]
    );

    res.json({ success: true, message: 'User suspended' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to suspend user', details: error.message });
  }
});

// Reactivate a user
router.post('/users/:userId/reactivate', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    await pool.query(
      "UPDATE users SET status = 'active' WHERE id = $1",
      [userId]
    );

    res.json({ success: true, message: 'User reactivated' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reactivate user', details: error.message });
  }
});

export default router;