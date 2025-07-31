import { ILogger } from './interfaces';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger implements ILogger {
    private static instance: Logger;
    private logLevel: LogLevel;

    private constructor(logLevel: LogLevel = LogLevel.INFO) {
        this.logLevel = logLevel;
    }

    static getInstance(logLevel?: LogLevel): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(logLevel);
        }
        return Logger.instance;
    }

    private formatMessage(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
        return `[${timestamp}] ${level}: ${message}${dataStr}`;
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.logLevel;
    }

    info(message: string, data?: any): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(this.formatMessage('INFO', message, data));
        }
    }

    error(message: string, error?: Error): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            const errorDetails = error ? ` | Error: ${error.message} | Stack: ${error.stack}` : '';
            console.error(this.formatMessage('ERROR', message) + errorDetails);
        }
    }

    warn(message: string, data?: any): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage('WARN', message, data));
        }
    }

    debug(message: string, data?: any): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.formatMessage('DEBUG', message, data));
        }
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }
} 