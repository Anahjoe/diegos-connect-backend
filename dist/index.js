import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint works' });
});
app.use('/v1/auth', authRoutes);
app.listen(PORT, () => {
    console.log(`🚀 Diego's Connect API running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map