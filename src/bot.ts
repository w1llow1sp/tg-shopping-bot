/**
 * 🤖 Simple Bot Manager
 * 
 * Упрощенный менеджер бота с гексагональной архитектурой
 */

import { Bot } from 'grammy';
import { pool } from './db/pg';
import { RedisConn } from './db/redis';
import { Logger } from './shared/logger';
import { TelegramAuthService } from './security/telegram.auth.service';
import { TelegramAuthMiddleware } from './security/telegram.auth.middleware';
import { ServiceRegistry } from './shared/service.registry';

// Импорты сервисов
import { OrderService } from './services/order/domain/order.service';
import { CartService } from './services/cart/domain/cart.service';
import { CatalogService } from './services/catalog/domain/catalog.service';
import { MenuService } from './services/menu/domain/menu.service';

// Импорты адаптеров корзины
import { CartRepository } from './services/cart/adapters/cart.repository';
import { CartView } from './services/cart/adapters/cart.view';
import { ProductRepository } from './services/cart/adapters/product.repository';

// Импорты адаптеров каталога
import { CatalogRepository } from './services/catalog/adapters/catalog.repository';

// Импорты адаптеров уведомлений
import { NotificationRepository } from './services/notifications/adapters/notification.repository';
import { NotificationView } from './services/notifications/adapters/notification.view';
import { NotificationTypeRepository } from './services/notifications/adapters/notification.type.repository';
import { NotificationService } from './services/notifications/domain/notification.service';
import { StockEventService } from './services/notifications/domain/stock.event.service';

export class BotManager {
    private bot: Bot;
    private logger: Logger;
    private authService: TelegramAuthService;
    private authMiddleware: TelegramAuthMiddleware;
    private serviceRegistry: ServiceRegistry;

    constructor(bot: Bot) {
        this.bot = bot;
        this.logger = Logger.getInstance();
        
        // Инициализация безопасности
        this.authService = new TelegramAuthService(RedisConn);
        this.authMiddleware = new TelegramAuthMiddleware(this.authService);
        
        // Инициализация Service Registry
        this.serviceRegistry = ServiceRegistry.getInstance();
        
        this.logger.info('BotManager initialized');
    }

    /**
     * Инициализация бота
     */
    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing BotManager...');

            // Регистрируем middleware
            this.registerMiddleware();

            // Регистрируем все сервисы
            this.registerServices();

            // Инициализируем все сервисы
            await this.serviceRegistry.initializeServices(this.bot);

            this.logger.info('BotManager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize BotManager', error as Error);
            throw error;
        }
    }

    /**
     * Регистрация middleware
     */
    private registerMiddleware(): void {
        // Аутентификация
        this.bot.use(this.authMiddleware.authenticate);
        
        // Логирование активности
        this.bot.use(this.authMiddleware.logActivity);
        
        // Rate limiting
        this.bot.use(this.authMiddleware.rateLimit(60, 60000));

        this.logger.info('Middleware registered');
    }

    /**
     * Регистрация всех сервисов
     */
    private registerServices(): void {
        // Создаем адаптеры корзины
        const cartRepository = new CartRepository(pool, RedisConn);
        const productRepository = new ProductRepository(pool);
        const cartView = new CartView(productRepository);
        
        // Создаем адаптеры каталога
        const catalogRepository = new CatalogRepository(pool);
        
        // Создаем адаптеры уведомлений
        const notificationRepository = new NotificationRepository(pool);
        const notificationView = new NotificationView();
        const notificationTypeRepository = new NotificationTypeRepository(pool);
        
        // Создаем сервисы с зависимостями
        this.serviceRegistry.registerService(new OrderService());
        this.serviceRegistry.registerService(new CartService(cartRepository, cartView, productRepository));
        this.serviceRegistry.registerService(new CatalogService());
        this.serviceRegistry.registerService(new MenuService());
        
        // Создаем сервис уведомлений
        const notificationService = new NotificationService(notificationRepository, notificationView, notificationTypeRepository, catalogRepository, this.bot);
        console.log('🔧 Creating NotificationService with name:', notificationService.name);
        this.serviceRegistry.registerService(notificationService);
        
        // Создаем сервис обработки событий изменения количества товаров
        const stockEventService = new StockEventService(pool, notificationService);
        console.log('🔧 Creating StockEventService with name:', stockEventService.name);
        this.serviceRegistry.registerService(stockEventService);

        this.logger.info('All services registered');
    }



    /**
     * Получение статуса здоровья
     */
    async getHealthStatus(): Promise<any> {
        return await this.serviceRegistry.getHealthStatus();
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        try {
            this.logger.info('Shutting down BotManager...');
            await this.serviceRegistry.shutdownServices();
            this.logger.info('BotManager shut down successfully');
        } catch (error) {
            this.logger.error('Error during shutdown', error as Error);
        }
    }

    /**
     * Получение экземпляра бота
     */
    getBot(): Bot {
        return this.bot;
    }
}

// Создание экземпляров
import { env } from './consts';

if (!env.BOT_TOKEN || !env.WEBHOOK_URL) {
    throw new Error('BOT_TOKEN и WEBHOOK_URL должны быть указаны в .env');
}

export const bot = new Bot(env.BOT_TOKEN);
export const botManager = new BotManager(bot);
export const WEBHOOK_PATH = `/webhook/${env.BOT_TOKEN}`; 