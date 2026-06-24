import photoRoutes from './routes/photos.js';
import messageRoutes from './routes/messages.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import discoveryRoutes from './routes/discovery.js';
import swipeRoutes from './routes/swipes.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware MUST come before routes
app.use(cors());
app.use(express.json());
// Health checks
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
app.listen(PORT, () => {
    console.log(`🚀 Diego's Connect API running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map