/**
 * 🔌 Menu Repository Adapter (ДОМЕННАЯ ЛОГИКА - САМЫЙ ВАЖНЫЙ!)
 * 
 * Реализация порта IMenuRepository для работы с PostgreSQL
 * Содержит всю доменную логику меню
 */

import { Pool } from 'pg';
import { 
    IMenuRepository, 
    SystemStats,
    MenuQueries,
    MenuError,
    MenuErrorType,
    MenuErrorMessages,
    MenuData,
    WelcomeData,
    MenuConfig
} from '../ports/menu.port';
import { Logger } from '../../../shared/logger';

export class MenuRepository implements IMenuRepository {
    private readonly pool: Pool;
    private readonly logger: Logger;

    constructor(pool: Pool) {
        this.pool = pool;
        this.logger = Logger.getInstance();
    }

    async getMainMenu(): Promise<MenuData> {
        try {
            this.logger.info('Getting main menu');
            
            const menuData: MenuData = {
                title: MenuConfig.MAIN_MENU_TITLE,
                description: MenuConfig.MAIN_MENU_DESCRIPTION,
                options: [
                    {
                        text: '🥦 Каталог',
                        callback_data: 'catalog:1',
                        icon: '🥦'
                    },
                    {
                        text: '🧺 Корзина',
                        callback_data: 'cart',
                        icon: '🧺'
                    },
                    {
                        text: '🥬 Заказы',
                        callback_data: 'order',
                        icon: '🥬'
                    }
                ]
            };

            this.logger.info('Main menu retrieved successfully');
            return menuData;
        } catch (error) {
            this.logger.error('Failed to get main menu', error as Error);
            throw error;
        }
    }

    async getWelcomeMessage(username: string): Promise<WelcomeData> {
        try {
            this.logger.info('Getting welcome message', { username });

            const welcomeText = MenuConfig.WELCOME_MESSAGE_TEMPLATE.replace('{username}', username.trim());

            const welcomeData: WelcomeData = {
                text: welcomeText,
                username: username.trim(),
                timestamp: new Date()
            };

            this.logger.info('Welcome message created successfully');
            return welcomeData;
        } catch (error) {
            this.logger.error('Failed to get welcome message', error as Error);
            throw error;
        }
    }

    /**
     * Проверить подключение к базе данных (доменная логика)
     */
    async checkDatabaseConnection(): Promise<string> {
        try {
            const result = await this.pool.query(MenuQueries.CHECK_DB_CONNECTION);
            const version = result.rows[0]?.version || 'Unknown';
            
            this.logger.info('Database connection checked successfully', { version });
            
            return version;
        } catch (error) {
            this.logger.error('Failed to check database connection', error as Error);
            throw new MenuError(
                MenuErrorMessages.DATABASE_CONNECTION_FAILED,
                MenuErrorType.DATABASE_ERROR
            );
        }
    }

    /**
     * Получить статистику системы (доменная логика)
     */
    async getSystemStats(): Promise<SystemStats> {
        try {
            const result = await this.pool.query<{
                total_products: string;
            }>('SELECT COUNT(*) as total_products FROM catalog');
            
            const stats = result.rows[0];
            const systemStats: SystemStats = {
                totalUsers: 0, // Убираем пользователей
                totalProducts: parseInt(stats?.total_products || '0', 10),
                totalOrders: 0, // Убираем заказы
                databaseStatus: 'OK'
            };
            
            this.logger.info('System stats retrieved successfully', systemStats);
            
            return systemStats;
        } catch (error) {
            this.logger.error('Failed to get system stats', error as Error);
            throw new MenuError(
                MenuErrorMessages.GET_STATS_FAILED,
                MenuErrorType.DATABASE_ERROR
            );
        }
    }
} 