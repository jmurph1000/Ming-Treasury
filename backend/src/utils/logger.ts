import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    // Remove error stack from inline display
    const { stack, ...rest } = metadata;
    if (Object.keys(rest).length > 0) {
      msg += ` ${JSON.stringify(rest)}`;
    }
    if (stack) {
      msg += `\n${stack}`;
    }
  }

  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'gusto-treasury' },
  transports: [
    // Console transport with colors for development
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        logFormat
      ),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), winston.format.json()),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), winston.format.json()),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  );
}

// Create child logger for specific modules
export function createModuleLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}

// Audit logger for SOX compliance - always logs to both console and file
export const auditLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gusto-treasury-audit' },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        printf(({ level, message, timestamp, ...metadata }) => {
          return `${timestamp} [AUDIT][${level}]: ${message} ${JSON.stringify(metadata)}`;
        })
      ),
    }),
  ],
});

// Add file transport for audit logs
if (process.env.NODE_ENV === 'production') {
  auditLogger.add(
    new winston.transports.File({
      filename: 'logs/audit.log',
      format: combine(timestamp(), winston.format.json()),
      maxsize: 52428800, // 50MB
      maxFiles: 100, // Keep more audit files
    })
  );
}

export default logger;
