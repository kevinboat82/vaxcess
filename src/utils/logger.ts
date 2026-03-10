import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Standardize log formatting for console
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // Default to info level
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }), // Crucial for catching and printing full error stack traces safely
        json() // Use JSON in files for Splunk/Datadog aggregators
    ),
    transports: [
        // Write all logs with importance level of `error` or less to `error.log`
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),

        // Write all logs with importance level of `info` or less to `combined.log`
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

// If we're not in production, log to the `console` with beautiful colors
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize(),
            timestamp({ format: 'HH:mm:ss' }),
            logFormat
        )
    }));
}
