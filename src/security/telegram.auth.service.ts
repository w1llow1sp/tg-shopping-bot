import { ITelegramAuthService, TelegramAccessToken, TelegramSecurityConstants } from './telegram.access.token.port';
import { Logger, ILogger } from '../shared/logger';
import { RedisClientType } from 'redis';

/**
 * Telegram Authentication Service - адаптер для Access Token паттерна
 * 
 * Реализует порт ITelegramAuthService для работы с Telegram пользователями
 * Согласно microservices.io: "The API Gateway authenticates the request and passes an access token"
 * 
 * Адаптировано для Telegram Bot API без JWT
 */
export class TelegramAuthService implements ITelegramAuthService {
    private readonly logger: ILogger;
    private readonly redis: RedisClientType;

    constructor(redis: RedisClientType) {
        this.redis = redis;
        this.logger = Logger.getInstance();
    }

    async authenticateUser(ctx: any): Promise<TelegramAccessToken> {
        try {
            const userId = ctx.from?.id;
            const chatId = ctx.chat?.id;
            const username = ctx.from?.username;
            const firstName = ctx.from?.first_name;
            const lastName = ctx.from?.last_name;

            if (!userId || !chatId) {
                throw new Error('Missing user ID or chat ID');
            }

            const now = Date.now();
            const sessionKey = `session:${userId}:${chatId}`;

            // Проверяем, подключен ли Redis
            if (this.redis.isReady) {
                try {
                    // Проверяем существующую сессию
                    const existingSession = await this.redis.get(sessionKey);
                    if (existingSession) {
                        const token: TelegramAccessToken = JSON.parse(existingSession);
                        
                        // Обновляем активность
                        token.lastActivity = now;
                        await this.redis.setEx(sessionKey, TelegramSecurityConstants.SESSION_EXPIRY_HOURS * 3600, JSON.stringify(token));
                        
                        this.logger.debug('User session refreshed', {
                            userId,
                            chatId,
                            username
                        });
                        
                        return token;
                    }
                } catch (redisError) {
                    this.logger.warn('Redis operation failed, creating in-memory session', redisError as Error);
                }
            }

            // Создаем новую сессию (в памяти, если Redis недоступен)
            const token: TelegramAccessToken = {
                userId,
                chatId,
                username,
                firstName,
                lastName,
                permissions: [...TelegramSecurityConstants.DEFAULT_PERMISSIONS],
                sessionStart: now,
                lastActivity: now,
                isActive: true
            };

            // Сохраняем сессию в Redis, если он доступен
            if (this.redis.isReady) {
                try {
                    await this.redis.setEx(
                        sessionKey, 
                        TelegramSecurityConstants.SESSION_EXPIRY_HOURS * 3600, 
                        JSON.stringify(token)
                    );
                } catch (redisError) {
                    this.logger.warn('Failed to save session to Redis', redisError as Error);
                }
            }

            this.logger.info('New user session created', {
                userId,
                chatId,
                username,
                permissions: token.permissions
            });

            return token;
        } catch (error) {
            this.logger.error('Telegram authentication failed', error as Error);
            throw new Error('Authentication failed');
        }
    }

    getTokenFromContext(ctx: any): TelegramAccessToken | null {
        try {
            const userId = ctx.from?.id;
            const chatId = ctx.chat?.id;

            if (!userId || !chatId) {
                return null;
            }

            // В реальном приложении здесь можно кэшировать токен в памяти
            // или получать из Redis для каждого запроса
            return {
                userId,
                chatId,
                username: ctx.from?.username,
                firstName: ctx.from?.first_name,
                lastName: ctx.from?.last_name,
                permissions: [...TelegramSecurityConstants.DEFAULT_PERMISSIONS],
                sessionStart: Date.now(),
                lastActivity: Date.now(),
                isActive: true
            };
        } catch (error) {
            this.logger.error('Failed to get token from context', error as Error);
            return null;
        }
    }

    async authorizeUser(token: TelegramAccessToken, resource: string, action: string): Promise<boolean> {
        try {
            const requiredPermission = `${resource}:${action}`;
            
            const hasPermission = token.permissions.includes(requiredPermission) ||
                                token.permissions.includes(`${resource}:manage`) ||
                                token.permissions.includes('system:admin');

            this.logger.debug('Authorization check', {
                userId: token.userId,
                resource,
                action,
                requiredPermission,
                hasPermission
            });

            return hasPermission;
        } catch (error) {
            this.logger.error('Authorization check failed', error as Error);
            return false;
        }
    }

    async updateUserActivity(token: TelegramAccessToken): Promise<void> {
        try {
            // Проверяем, подключен ли Redis
            if (!this.redis.isReady) {
                this.logger.debug('Redis not ready, skipping activity update');
                return;
            }

            const sessionKey = `session:${token.userId}:${token.chatId}`;
            token.lastActivity = Date.now();
            
            await this.redis.setEx(
                sessionKey, 
                TelegramSecurityConstants.SESSION_EXPIRY_HOURS * 3600, 
                JSON.stringify(token)
            );

            this.logger.debug('User activity updated', {
                userId: token.userId,
                chatId: token.chatId
            });
        } catch (error) {
            this.logger.error('Failed to update user activity', error as Error);
        }
    }

    async isSessionActive(token: TelegramAccessToken): Promise<boolean> {
        try {
            const sessionKey = `session:${token.userId}:${token.chatId}`;
            const session = await this.redis.get(sessionKey);
            
            if (!session) {
                return false;
            }

            const sessionData: TelegramAccessToken = JSON.parse(session);
            const now = Date.now();
            const sessionAge = now - sessionData.lastActivity;
            const maxAge = TelegramSecurityConstants.SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

            return sessionAge < maxAge && sessionData.isActive;
        } catch (error) {
            this.logger.error('Failed to check session activity', error as Error);
            return false;
        }
    }

    /**
     * Дополнительные методы для работы с Telegram пользователями
     */
    
    /**
     * Проверка, является ли пользователь администратором
     */
    isAdmin(token: TelegramAccessToken): boolean {
        return token.permissions.includes('system:admin') ||
               token.permissions.includes('user:manage');
    }

    /**
     * Получение информации о пользователе
     */
    getUserInfo(token: TelegramAccessToken) {
        return {
            userId: token.userId,
            chatId: token.chatId,
            username: token.username,
            firstName: token.firstName,
            lastName: token.lastName,
            permissions: token.permissions,
            isAdmin: this.isAdmin(token)
        };
    }

    /**
     * Создание токена с кастомными разрешениями
     */
    async createTokenWithPermissions(
        ctx: any,
        permissions: string[]
    ): Promise<TelegramAccessToken> {
        const baseToken = await this.authenticateUser(ctx);
        baseToken.permissions = permissions;
        
        const sessionKey = `session:${baseToken.userId}:${baseToken.chatId}`;
        await this.redis.setEx(
            sessionKey, 
            TelegramSecurityConstants.SESSION_EXPIRY_HOURS * 3600, 
            JSON.stringify(baseToken)
        );

        return baseToken;
    }

    /**
     * Отзыв сессии пользователя
     */
    async revokeSession(userId: number, chatId: number): Promise<void> {
        try {
            const sessionKey = `session:${userId}:${chatId}`;
            await this.redis.del(sessionKey);
            
            this.logger.info('User session revoked', {
                userId,
                chatId
            });
        } catch (error) {
            this.logger.error('Failed to revoke session', error as Error);
            throw error;
        }
    }

    /**
     * Получение всех активных сессий пользователя
     */
    async getUserSessions(userId: number): Promise<TelegramAccessToken[]> {
        try {
            const pattern = `session:${userId}:*`;
            const keys = await this.redis.keys(pattern);
            const sessions: TelegramAccessToken[] = [];

            for (const key of keys) {
                const sessionData = await this.redis.get(key);
                if (sessionData) {
                    const session: TelegramAccessToken = JSON.parse(sessionData);
                    if (await this.isSessionActive(session)) {
                        sessions.push(session);
                    }
                }
            }

            return sessions;
        } catch (error) {
            this.logger.error('Failed to get user sessions', error as Error);
            return [];
        }
    }
} 