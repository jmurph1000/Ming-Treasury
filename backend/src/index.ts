import 'dotenv/config';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import cron from 'node-cron';
import { runEscalationJob } from './jobs/escalationJob.js';
import { runTokenCleanupJob } from './jobs/tokenCleanupJob.js';
import { runPendingPaymentsSummaryJob } from './jobs/pendingPaymentsSummaryJob.js';
import { runUserPermissionsReportJob, runMissedUserPermissionsReports } from './jobs/userPermissionsReportJob.js';
import { runEodReportJob, runMissedEodReports } from './jobs/eodReportJob.js';

// Use SQLite for local development
import { initializeSchema, seedData, healthCheck as sqliteHealthCheck, shutdown as sqliteShutdown } from './config/sqlite.js';
import { sessionStore } from './config/sessions.js';

const PORT = parseInt(process.env.BACKEND_PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function startServer(): Promise<void> {
  logger.info('Starting Gusto Treasury Payment Tool server...');
  logger.info('Using SQLite database and in-memory sessions (local dev mode)');

  // Initialize SQLite schema
  try {
    initializeSchema();
    seedData();
    logger.info('SQLite database initialized');
  } catch (error) {
    logger.error('Failed to initialize SQLite database', { error: (error as Error).message });
    process.exit(1);
  }

  // Verify database connection
  if (!sqliteHealthCheck()) {
    logger.error('SQLite health check failed');
    process.exit(1);
  }
  logger.info('Database connection verified');

  // In-memory sessions are ready immediately
  logger.info('In-memory session store ready');

  // Create Express app
  const app = createApp();

  // Start HTTP server
  const server = app.listen(PORT, HOST, () => {
    logger.info(`Server started on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Configure keep-alive
  server.keepAliveTimeout = 65000; // Slightly higher than ALB timeout
  server.headersTimeout = 66000;

  // Schedule background jobs
  scheduleJobs();

  // Run startup catch-up tasks after a short delay to let the server stabilize
  setTimeout(async () => {
    // Generate any missed EOD reports from server downtime
    try {
      await runMissedEodReports();
      logger.info('Startup missed EOD report catch-up completed');
    } catch (error) {
      logger.error('Startup missed EOD report catch-up failed', { error: (error as Error).message });
    }

    // Generate any missed user permissions reports from server downtime
    try {
      await runMissedUserPermissionsReports();
      logger.info('Startup missed user permissions report catch-up completed');
    } catch (error) {
      logger.error('Startup missed user permissions report catch-up failed', { error: (error as Error).message });
    }

    // Run pending payments summary so today's report is always current
    try {
      await runPendingPaymentsSummaryJob();
      logger.info('Startup pending payments summary completed');
    } catch (error) {
      logger.error('Startup pending payments summary failed', { error: (error as Error).message });
    }

    // Generate today's user permissions report if it doesn't exist yet
    try {
      await runUserPermissionsReportJob();
      logger.info('Startup user permissions report for today completed');
    } catch (error) {
      logger.error('Startup user permissions report for today failed', { error: (error as Error).message });
    }

    // Generate today's EOD report if it doesn't exist yet
    try {
      await runEodReportJob();
      logger.info('Startup EOD report for today completed');
    } catch (error) {
      logger.error('Startup EOD report for today failed', { error: (error as Error).message });
    }
  }, 5000);

  // Graceful shutdown handling
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close SQLite database
        sqliteShutdown();

        // Clear session store
        sessionStore.shutdown();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: (error as Error).message });
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
  });
}

function scheduleJobs(): void {
  // Escalation check - every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.debug('Running escalation job');
    try {
      await runEscalationJob();
    } catch (error) {
      logger.error('Escalation job failed', { error: (error as Error).message });
    }
  });

  // Token cleanup - every hour
  cron.schedule('0 * * * *', async () => {
    logger.debug('Running token cleanup job');
    try {
      await runTokenCleanupJob();
    } catch (error) {
      logger.error('Token cleanup job failed', { error: (error as Error).message });
    }
  });

  // Scheduled reports - daily at 6 AM PT
  cron.schedule('0 6 * * *', async () => {
    logger.debug('Running scheduled reports job');
    // TODO: Implement scheduled reports
  }, {
    timezone: 'America/Los_Angeles',
  });

  // Daily 6 PM ET jobs: user permissions, pending payments summary, and EOD report
  cron.schedule('0 18 * * *', async () => {
    logger.debug('Running 6 PM ET scheduled jobs');
    try {
      await runUserPermissionsReportJob();
    } catch (error) {
      logger.error('User permissions report job failed', { error: (error as Error).message });
    }
    try {
      await runPendingPaymentsSummaryJob();
    } catch (error) {
      logger.error('Pending payments summary job failed', { error: (error as Error).message });
    }
    try {
      await runEodReportJob();
    } catch (error) {
      logger.error('EOD report job failed', { error: (error as Error).message });
    }
  }, {
    timezone: 'America/New_York',
  });

  logger.info('Background jobs scheduled');
}

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
