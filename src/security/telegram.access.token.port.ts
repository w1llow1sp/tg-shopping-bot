/**
 * Access Token Pattern для Telegram Bot
 * 
 * Согласно microservices.io:
 * "The API Gateway authenticates the request and passes an access token 
 * that securely identifies the requestor in each request to the services"
 * 
 * Адаптировано для Telegram Bot API
 */

export interface TelegramAccessToken {
    userId: number;
    chatId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    permissions: string[];
    sessionStart: number;
    lastActivity: number;
    isActive: boolean;
}

/**
 * Порт для аутентификации и авторизации Telegram пользователей
 */
export interface ITelegramAuthService {
    /**
     * Аутентификация пользователя Telegram
     */
    authenticateUser(ctx: any): Promise<TelegramAccessToken>;
    
    /**
     * Получение токена из контекста
     */
    getTokenFromContext(ctx: any): TelegramAccessToken | null;
    
    /**
     * Проверка разрешений пользователя
     */
    authorizeUser(token: TelegramAccessToken, resource: string, action: string): Promise<boolean>;
    
    /**
     * Обновление активности пользователя
     */
    updateUserActivity(token: TelegramAccessToken): Promise<void>;
    
    /**
     * Проверка активности сессии
     */
    isSessionActive(token: TelegramAccessToken): Promise<boolean>;
}

/**
 * Порт для управления разрешениями
 */
export interface ITelegramPermissionService {
    /**
     * Получение разрешений пользователя
     */
    getUserPermissions(userId: number): Promise<string[]>;
    
    /**
     * Проверка разрешения на действие
     */
    hasPermission(userId: number, permission: string): Promise<boolean>;
    
    /**
     * Проверка разрешения на ресурс
     */
    canAccessResource(userId: number, resource: string, action: string): Promise<boolean>;
    
    /**
     * Назначение разрешений пользователю
     */
    assignPermissions(userId: number, permissions: string[]): Promise<void>;
}

/**
 * Порт для rate limiting
 */
export interface ITelegramRateLimitService {
    /**
     * Проверка лимита запросов
     */
    checkRateLimit(userId: number, action: string): Promise<boolean>;
    
    /**
     * Увеличение счетчика запросов
     */
    incrementRequestCount(userId: number, action: string): Promise<number>;
    
    /**
     * Получение текущего лимита
     */
    getCurrentLimit(userId: number, action: string): Promise<number>;
}

/**
 * Константы для безопасности Telegram Bot
 */
export const TelegramSecurityConstants = {
    // Время жизни сессии (24 часа)
    SESSION_EXPIRY_HOURS: 24,
    
    // Максимальное количество запросов в минуту
    RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
    
    // Максимальное количество запросов в час
    RATE_LIMIT_REQUESTS_PER_HOUR: 1000,
    
    // Разрешения по умолчанию для пользователей
    DEFAULT_PERMISSIONS: [
        'catalog:read',
        'cart:read',
        'cart:write',
        'order:create',
        'order:read'
    ],
    
    // Административные разрешения
    ADMIN_PERMISSIONS: [
        'catalog:write',
        'catalog:delete',
        'order:manage',
        'user:manage',
        'system:admin'
    ]
} as const;

/**
 * Типы разрешений для Telegram Bot
 */
export enum TelegramPermission {
    // Каталог
    CATALOG_READ = 'catalog:read',
    CATALOG_WRITE = 'catalog:write',
    CATALOG_DELETE = 'catalog:delete',
    
    // Корзина
    CART_READ = 'cart:read',
    CART_WRITE = 'cart:write',
    CART_DELETE = 'cart:delete',
    
    // Заказы
    ORDER_CREATE = 'order:create',
    ORDER_READ = 'order:read',
    ORDER_UPDATE = 'order:update',
    ORDER_DELETE = 'order:delete',
    ORDER_MANAGE = 'order:manage',
    
    // Пользователи
    USER_READ = 'user:read',
    USER_WRITE = 'user:write',
    USER_MANAGE = 'user:manage',
    
    // Система
    SYSTEM_ADMIN = 'system:admin',
    SYSTEM_MONITOR = 'system:monitor'
}

/**
 * Ресурсы для авторизации
 */
export enum TelegramResource {
    CATALOG = 'catalog',
    CART = 'cart',
    ORDER = 'order',
    USER = 'user',
    SYSTEM = 'system'
}

/**
 * Действия для авторизации
 */
export enum TelegramAction {
    READ = 'read',
    WRITE = 'write',
    DELETE = 'delete',
    CREATE = 'create',
    MANAGE = 'manage'
} 