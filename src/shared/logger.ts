import winston from 'winston';

// Интерфейс для совместимости с существующим кодом
export interface ILogger {
    info(message: string, data?: any): void;
    error(message: string, error?: Error): void;
    warn(message: string, data?: any): void;
    debug(message: string, data?: any): void;
    getInstance(): ILogger;
}

// Создаем логгер в 10 строк
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Экспортируем методы для совместимости с существующим кодом
export const Logger: ILogger = {
    info: (message: string, data?: any) => logger.info(message, data),
    error: (message: string, error?: Error) => logger.error(message, { error: error?.message, stack: error?.stack }),
    warn: (message: string, data?: any) => logger.warn(message, data),
    debug: (message: string, data?: any) => logger.debug(message, data),
    getInstance: () => Logger
}; 