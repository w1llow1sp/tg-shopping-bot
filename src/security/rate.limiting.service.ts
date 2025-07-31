import { RedisClientType } from 'redis';
import { Logger } from '../shared/logger';

/**
 * Rate Limiting Service для защиты от спама
 * 
 * Использует Redis для хранения счетчиков запросов
 * Согласно microservices.io паттернам безопасности
 */
export class RateLimitingService {
    private readonly redis: RedisClientType;
    private readonly logger: Logger;

    constructor(redis: RedisClientType) {
        this.redis = redis;
        this.logger = Logger.getInstance();
    }

    /**
     * Проверка лимита запросов для пользователя
     */
    async checkRateLimit(userId: number, action: string, maxRequests: number, windowMs: number): Promise<boolean> {
        try {
            const key = `rate_limit:${userId}:${action}`;
            const currentCount = await this.getRequestCount(key);
            
            if (currentCount >= maxRequests) {
                this.logger.warn('Rate limit exceeded', {
                    userId,
                    action,
                    currentCount,
                    maxRequests,
                    windowMs
                });
                return false;
            }

            // Увеличиваем счетчик
            await this.incrementRequestCount(key, windowMs);
            
            this.logger.debug('Rate limit check passed', {
                userId,
                action,
                currentCount: currentCount + 1,
                maxRequests
            });
            
            return true;
        } catch (error) {
            this.logger.error('Rate limiting check failed', error as Error);
            // В случае ошибки разрешаем запрос
            return true;
        }
    }

    /**
     * Получение текущего количества запросов
     */
    async getCurrentRequestCount(userId: number, action: string): Promise<number> {
        try {
            const key = `rate_limit:${userId}:${action}`;
            return await this.getRequestCount(key);
        } catch (error) {
            this.logger.error('Failed to get request count', error as Error);
            return 0;
        }
    }

    /**
     * Сброс лимита для пользователя
     */
    async resetRateLimit(userId: number, action: string): Promise<void> {
        try {
            const key = `rate_limit:${userId}:${action}`;
            await this.redis.del(key);
            
            this.logger.info('Rate limit reset', { userId, action });
        } catch (error) {
            this.logger.error('Failed to reset rate limit', error as Error);
        }
    }

    /**
     * Получение времени до сброса лимита
     */
    async getTimeToReset(userId: number, action: string): Promise<number> {
        try {
            const key = `rate_limit:${userId}:${action}`;
            const ttl = await this.redis.ttl(key);
            return Math.max(0, ttl);
        } catch (error) {
            this.logger.error('Failed to get time to reset', error as Error);
            return 0;
        }
    }

    /**
     * Получение статистики по лимитам
     */
    async getRateLimitStats(userId: number): Promise<any> {
        try {
            const pattern = `rate_limit:${userId}:*`;
            const keys = await this.redis.keys(pattern);
            const stats: any = {};

            for (const key of keys) {
                const action = key.split(':')[2];
                const count = await this.getRequestCount(key);
                const ttl = await this.redis.ttl(key);
                
                stats[action] = {
                    count,
                    timeToReset: Math.max(0, ttl)
                };
            }

            return stats;
        } catch (error) {
            this.logger.error('Failed to get rate limit stats', error as Error);
            return {};
        }
    }

    /**
     * Внутренние методы
     */
    private async getRequestCount(key: string): Promise<number> {
        try {
            const count = await this.redis.get(key);
            return count ? parseInt(count, 10) : 0;
        } catch (error) {
            this.logger.error('Failed to get request count from Redis', error as Error);
            return 0;
        }
    }

    private async incrementRequestCount(key: string, windowMs: number): Promise<void> {
        try {
            const multi = this.redis.multi();
            multi.incr(key);
            multi.expire(key, Math.ceil(windowMs / 1000));
            await multi.exec();
        } catch (error) {
            this.logger.error('Failed to increment request count', error as Error);
        }
    }

    /**
     * Константы для различных типов лимитов
     */
    static readonly LIMITS = {
        // Общие запросы
        GENERAL: { maxRequests: 60, windowMs: 60000 }, // 60 запросов в минуту
        
        // Каталог
        CATALOG_READ: { maxRequests: 30, windowMs: 60000 }, // 30 запросов в минуту
        
        // Корзина
        CART_READ: { maxRequests: 20, windowMs: 60000 }, // 20 запросов в минуту
        CART_WRITE: { maxRequests: 10, windowMs: 60000 }, // 10 запросов в минуту
        
        // Заказы
        ORDER_CREATE: { maxRequests: 5, windowMs: 60000 }, // 5 заказов в минуту
        ORDER_READ: { maxRequests: 15, windowMs: 60000 }, // 15 запросов в минуту
        
        // Административные действия
        ADMIN_ACTION: { maxRequests: 100, windowMs: 60000 }, // 100 запросов в минуту
    } as const;
} 