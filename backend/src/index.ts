import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jobsRouter from './routes/jobs';
import scheduleRouter from './routes/schedule';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Simple rate limiting implementation
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // max requests per window

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
    });
  }

  record.count++;
  next();
}

// Authentication middleware (simple token-based)
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }

  const apiToken = process.env.API_TOKEN;

  // If no token is configured, allow all requests (development mode)
  if (!apiToken) {
    console.warn('WARNING: No API_TOKEN configured. API is unprotected!');
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || token !== apiToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  next();
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);
app.use(authenticate);

// Routes
app.use('/api/jobs', jobsRouter);
app.use('/api/schedule', scheduleRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Cron Manager API server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});
