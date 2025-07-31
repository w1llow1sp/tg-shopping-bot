import { Context } from 'grammy';
import { IErrorHandler, ILogger } from './interfaces';
import { Logger } from './logger';

export enum ErrorType {
    VALIDATION = 'VALIDATION',
    DATABASE = 'DATABASE',
    NETWORK = 'NETWORK',
    AUTHENTICATION = 'AUTHENTICATION',
    AUTHORIZATION = 'AUTHORIZATION',
    BUSINESS_LOGIC = 'BUSINESS_LOGIC',
    UNKNOWN = 'UNKNOWN'
}

export class BotError extends Error {
    constructor(
        message: string,
        public type: ErrorType,
        public context?: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'BotError';
    }
}

export class ErrorHandler implements IErrorHandler {
    private logger: ILogger;

    constructor() {
        this.logger = Logger.getInstance();
    }

    async handleError(error: Error, context: string): Promise<void> {
        this.logger.error(`Error in ${context}`, error);

        if (error instanceof BotError) {
            await this.handleBotError(error, context);
        } else {
            await this.handleGenericError(error, context);
        }
    }

    logError(error: Error, context: string): void {
        this.logger.error(`Error in ${context}`, error);
    }

    private async handleBotError(error: BotError, context: string): Promise<void> {
        switch (error.type) {
            case ErrorType.VALIDATION:
                this.logger.warn(`Validation error in ${context}: ${error.message}`);
                break;
            case ErrorType.DATABASE:
                this.logger.error(`Database error in ${context}`, error.originalError);
                break;
            case ErrorType.NETWORK:
                this.logger.error(`Network error in ${context}`, error.originalError);
                break;
            case ErrorType.AUTHENTICATION:
                this.logger.warn(`Authentication error in ${context}: ${error.message}`);
                break;
            case ErrorType.AUTHORIZATION:
                this.logger.warn(`Authorization error in ${context}: ${error.message}`);
                break;
            case ErrorType.BUSINESS_LOGIC:
                this.logger.error(`Business logic error in ${context}`, error.originalError);
                break;
            default:
                this.logger.error(`Unknown bot error in ${context}`, error);
        }
    }

    private async handleGenericError(error: Error, context: string): Promise<void> {
        this.logger.error(`Generic error in ${context}`, error);
    }

    static createValidationError(message: string, context?: string): BotError {
        return new BotError(message, ErrorType.VALIDATION, context);
    }

    static createDatabaseError(message: string, originalError?: Error, context?: string): BotError {
        return new BotError(message, ErrorType.DATABASE, context, originalError);
    }

    static createNetworkError(message: string, originalError?: Error, context?: string): BotError {
        return new BotError(message, ErrorType.NETWORK, context, originalError);
    }

    static createAuthenticationError(message: string, context?: string): BotError {
        return new BotError(message, ErrorType.AUTHENTICATION, context);
    }

    static createAuthorizationError(message: string, context?: string): BotError {
        return new BotError(message, ErrorType.AUTHORIZATION, context);
    }

    static createBusinessLogicError(message: string, originalError?: Error, context?: string): BotError {
        return new BotError(message, ErrorType.BUSINESS_LOGIC, context, originalError);
    }
} 