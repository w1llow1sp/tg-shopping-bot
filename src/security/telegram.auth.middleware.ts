import { Context } from 'grammy';
import { ITelegramAuthService, TelegramAccessToken } from './telegram.access.token.port';
import { Logger } from '../shared/logger';

/**
 * Middleware для автоматической аутентификации Telegram пользователей
 * 
 * Согласно Access Token Pattern:
 * "The API Gateway authenticates the request and passes an access token"
 */
export class TelegramAuthMiddleware {
    private readonly authService: ITelegramAuthService;
    private readonly logger: Logger;

    constructor(authService: ITelegramAuthService) {
        this.authService = authService;
        this.logger = Logger.getInstance();
    }

    /**
     * Middleware для аутентификации пользователя
     */
    authenticate = async (ctx: Context, next: () => Promise<void>) => {
        try {
            // Аутентифицируем пользователя
            const token = await this.authService.authenticateUser(ctx);
            
            // Добавляем токен в контекст для использования в обработчиках
            (ctx as any).userToken = token;
            
            this.logger.debug('User authenticated via middleware', {
                userId: token.userId,
                chatId: token.chatId,
                username: token.username
            });

            await next();
        } catch (error) {
            this.logger.error('Authentication middleware failed', error as Error);
            
            // Отправляем сообщение об ошибке аутентификации
            await ctx.reply('❌ Ошибка аутентификации. Попробуйте позже.');
        }
    };

    /**
     * Middleware для проверки авторизации
     */
    authorize = (resource: string, action: string) => {
        return async (ctx: Context, next: () => Promise<void>) => {
            try {
                const token = (ctx as any).userToken as TelegramAccessToken;
                
                if (!token) {
                    this.logger.warn('No user token found in context');
                    await ctx.reply('❌ Требуется аутентификация.');
                    return;
                }

                const isAuthorized = await this.authService.authorizeUser(token, resource, action);
                
                if (!isAuthorized) {
                    this.logger.warn('User not authorized', {
                        userId: token.userId,
                        resource,
                        action
                    });
                    
                    await ctx.reply('❌ У вас нет прав для выполнения этого действия.');
                    return;
                }

                this.logger.debug('User authorized via middleware', {
                    userId: token.userId,
                    resource,
                    action
                });

                await next();
            } catch (error) {
                this.logger.error('Authorization middleware failed', error as Error);
                await ctx.reply('❌ Ошибка проверки прав доступа.');
            }
        };
    };

    /**
     * Middleware для rate limiting
     */
    rateLimit = (maxRequests: number, windowMs: number) => {
        return async (ctx: Context, next: () => Promise<void>) => {
            try {
                const token = (ctx as any).userToken as TelegramAccessToken;
                
                if (!token) {
                    await next();
                    return;
                }

                const key = `rate_limit:${token.userId}:${ctx.updateType}`;
                const currentCount = await this.getRequestCount(key);
                
                if (currentCount >= maxRequests) {
                    this.logger.warn('Rate limit exceeded', {
                        userId: token.userId,
                        action: ctx.updateType,
                        currentCount,
                        maxRequests
                    });
                    
                    await ctx.reply('⚠️ Слишком много запросов. Попробуйте позже.');
                    return;
                }

                // Увеличиваем счетчик
                await this.incrementRequestCount(key, windowMs);
                
                await next();
            } catch (error) {
                this.logger.error('Rate limiting middleware failed', error as Error);
                await next(); // Продолжаем выполнение даже при ошибке rate limiting
            }
        };
    };

    /**
     * Middleware для логирования активности
     */
    logActivity = async (ctx: Context, next: () => Promise<void>) => {
        try {
            const token = (ctx as any).userToken as TelegramAccessToken;
            
            if (token) {
                await this.authService.updateUserActivity(token);
                
                this.logger.debug('User activity logged', {
                    userId: token.userId,
                    chatId: token.chatId,
                    action: ctx.updateType
                });
            }

            await next();
        } catch (error) {
            this.logger.error('Activity logging middleware failed', error as Error);
            await next(); // Продолжаем выполнение даже при ошибке логирования
        }
    };

    /**
     * Получение количества запросов
     */
    private async getRequestCount(key: string): Promise<number> {
        try {
            // В реальном приложении здесь будет Redis
            // Пока используем простую реализацию
            return 0;
        } catch (error) {
            this.logger.error('Failed to get request count', error as Error);
            return 0;
        }
    }

    /**
     * Увеличение счетчика запросов
     */
    private async incrementRequestCount(key: string, windowMs: number): Promise<void> {
        try {
            // В реальном приложении здесь будет Redis
            // Пока используем простую реализацию
            this.logger.debug('Request count incremented', { key, windowMs });
        } catch (error) {
            this.logger.error('Failed to increment request count', error as Error);
        }
    }

    /**
     * Получение токена из контекста
     */
    static getUserToken(ctx: Context): TelegramAccessToken | null {
        return (ctx as any).userToken || null;
    }

    /**
     * Проверка, является ли пользователь администратором
     */
    static isAdmin(ctx: Context): boolean {
        const token = TelegramAuthMiddleware.getUserToken(ctx);
        if (!token) return false;
        
        return token.permissions.includes('system:admin') ||
               token.permissions.includes('user:manage');
    }
} 