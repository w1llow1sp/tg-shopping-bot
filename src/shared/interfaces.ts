/**
 * 🔧 Shared Interfaces
 * 
 * Общие интерфейсы для shared компонентов
 */

export interface ILogger {
    info(message: string, data?: any): void;
    error(message: string, error?: Error): void;
    warn(message: string, data?: any): void;
    debug(message: string, data?: any): void;
    setLogLevel(level: any): void;
}

export interface IErrorHandler {
    handleError(error: Error, context: string): Promise<void>;
    logError(error: Error, context: string): void;
} 