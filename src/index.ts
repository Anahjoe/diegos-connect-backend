import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import discoveryRoutes from './routes/discovery.js';
import swipeRoutes from './routes/swipes.js';
import messageRoutes from './routes/messages.js';
import photoRoutes from './routes/photos.js';
import safetyRoutes from './routes/safety.js';
import adminRoutes from './routes/admin.js';
import accountRoutes from './routes/account.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware MUST come before routes
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/profiles', profileRoutes);
app.use('/v1/discovery', discoveryRoutes);
app.use('/v1/swipes', swipeRoutes);
app.use('/v1/matches', messageRoutes);
app.use('/v1/photos', photoRoutes);
app.use('/v1/safety', safetyRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/account', accountRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  try {
    const schemaPath = path.join(__dirname, '../migrations/001_create_tables.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(schema);
      console.log('✅ Database schema ready');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Diego's Connect API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

start();