import express from 'express';
import type { Request, Response } from 'express';
import pool from '../config/database.js';
import { generateOtp } from '../utils/otp.js';
import { generateToken } from '../utils/jwt.js';

const router = express.Router();

// Send OTP
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number required' });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60000);

    await pool.query(
      `INSERT INTO verification_codes (phone_number, code, expires_at)
       VALUES ($1, $2, $3)`,
      [phone_number, code, expiresAt]
    );
    await pool.query(
  `INSERT INTO verification_codes (phone_number, code, expires_at)
   VALUES ($1, $2, $3)`,
  [phone_number, code, expiresAt]
);


    console.log(`📱 OTP for ${phone_number}: ${code}`);

    res.json({
      success: true,
      message: `OTP sent to ${phone_number}`,
      test_otp: code
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to send OTP', details: error.message });
  }
});

// Verify OTP & Create Account / Login
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone_number, code, username } = req.body;

    if (!phone_number || !code) {
      return res.status(400).json({ error: 'phone_number and code required' });
    }

    const otpResult = await pool.query(
      `SELECT id FROM verification_codes
       WHERE phone_number = $1 AND code = $2 AND expires_at > NOW() AND is_used = false`,
      [phone_number, code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await pool.query(
      `UPDATE verification_codes SET is_used = true, used_at = NOW()
       WHERE id = $1`,
      [otpResult.rows[0].id]
    );

    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phone_number]
    );

    let userId: string;

    if (userResult.rows.length === 0) {
      if (!username) {
        return res.status(400).json({ error: 'username required for signup' });
      }

      const newUserResult = await pool.query(
        `INSERT INTO users (phone_number, username)
         VALUES ($1, $2)
         RETURNING id`,
        [phone_number, username]
      );

      userId = newUserResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    const token = generateToken(userId);

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        phone_number,
        profile_complete: false
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'OTP verification failed', details: error.message });
  }
});

export default router;