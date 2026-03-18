import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { logger } from './utils/logger.js';
import { authenticate } from './middleware/auth.js';
import { setupAuditContext } from './middleware/audit.js';
import { standardRateLimit, globalRateLimitMiddleware } from './middleware/rateLimit.js';
import { ERROR_CODES, HTTP_STATUS } from './config/constants.js';
import { ValidationError } from './utils/validators.js';

// Import routes
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payments.js';
import approvalRoutes from './routes/approvals.js';
import executionRoutes from './routes/execution.js';
import userRoutes from './routes/users.js';
import accountRoutes from './routes/accounts.js';
import routingRoutes from './routes/routing.js';
import chainsRoutes from './routes/chains.js';
import documentsRoutes from './routes/documents.js';
import templateRoutes from './routes/templates.js';
import payeeRoutes from './routes/payees.js';
import dashboardRoutes from './routes/dashboard.js';
import calendarRoutes from './routes/calendar.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import groupRoutes from './routes/groups.js';
import bunmahonRoutes from './routes/bunmahon.js';

export function createApp(): Express {
  const app = express();

  // Trust proxy for accurate IP detection behind load balancer
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parsing
  app.use(cookieParser());

  // Global rate limiting
  app.use(globalRateLimitMiddleware);

  // Request logging and audit context setup
  app.use(setupAuditContext);

  // Health check endpoint (before auth)
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // Public routes (no authentication required)
  app.use('/api/auth', authRoutes);

  // Apply rate limiting and authentication to protected routes
  app.use('/api', standardRateLimit);

  // Protected routes
  app.use('/api/payments', authenticate, paymentRoutes);
  app.use('/api/approvals', authenticate, approvalRoutes);
  app.use('/api/execution', authenticate, executionRoutes);
  app.use('/api/users', authenticate, userRoutes);
  app.use('/api/accounts', authenticate, accountRoutes);
  app.use('/api/routing', authenticate, routingRoutes);
  app.use('/api/chains', authenticate, chainsRoutes);
  app.use('/api/documents', authenticate, documentsRoutes);
  app.use('/api/templates', authenticate, templateRoutes);
  app.use('/api/payees', authenticate, payeeRoutes);
  app.use('/api/dashboard', authenticate, dashboardRoutes);
  app.use('/api/calendar', authenticate, calendarRoutes);
  app.use('/api/reports', authenticate, reportRoutes);
  app.use('/api/admin', authenticate, adminRoutes);
  app.use('/api/notifications', authenticate, notificationRoutes);
  app.use('/api/groups', authenticate, groupRoutes);
  app.use('/api/bunmahon', authenticate, bunmahonRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: ERROR_CODES.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    // Log the error
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    // Handle validation errors
    if (err instanceof ValidationError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: err.message,
        details: err.errors,
      });
      return;
    }

    // Handle known error types
    if (err.name === 'JsonWebTokenError') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid authentication token',
      });
      return;
    }

    if (err.name === 'TokenExpiredError') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.SESSION_EXPIRED,
        message: 'Session expired',
      });
      return;
    }

    // Database errors
    if ((err as NodeJS.ErrnoException).code === '23505') {
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.DUPLICATE_ENTRY,
        message: 'A record with this information already exists',
      });
      return;
    }

    if ((err as NodeJS.ErrnoException).code === '23503') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Referenced record does not exist',
      });
      return;
    }

    // Generic error response
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    });
  });

  return app;
}
