import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import vaccineRoutes from './routes/vaccine';
import webhookRoutes from './routes/webhooks';
import caregiverRoutes from './routes/caregivers';
import childrenRoutes from './routes/children';
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import { initVoiceReminderCron } from './jobs/voice-reminders';

import { requireAuth } from './middleware/auth';
import { logger } from './utils/logger';
import { globalErrorHandler } from './middleware/errorHandler';
import morgan from 'morgan';

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust first-hop proxy (Nginx) for Rate Limiting
const PORT = process.env.PORT || 3000;

// Global HTTP Request Logging
const morganFormat = process.env.NODE_ENV !== 'production' ? 'dev' : 'combined';
app.use(
    morgan(morganFormat, {
        stream: {
            // Stream Morgan's output directly into Winston
            write: (message) => logger.info(message.trim())
        }
    })
);

// Global Security Middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors());

// Global Rate Limiting to prevent DDoS and Brute Force
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Parse incoming JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes); // Webhooks have their own external provider auth 

// Protected Routes (Require JWT)
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/caregivers', requireAuth, caregiverRoutes);
app.use('/api/children', requireAuth, childrenRoutes);
app.use('/api/schedule', requireAuth, vaccineRoutes);

// Protected Offline Data Sync
import syncRoutes from './routes/sync';
app.use('/api/sync', requireAuth, syncRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    logger.info('Health check endpoint pinged');
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ** MUST BE LAST **
// Centralized Error Handling Middleware
app.use(globalErrorHandler);

// Initialize Background Jobs
initVoiceReminderCron();

// Start the server
app.listen(PORT, () => {
    logger.info(`🚀 VaxCess API server is running on port ${PORT}`);
});

export default app;
