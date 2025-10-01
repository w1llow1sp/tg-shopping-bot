import express from 'express';
import { webhookCallback } from 'grammy';
import { botManager, bot, WEBHOOK_PATH } from './bot';
import * as pg from './db/pg';
import * as redis from './db/redis';
import { env } from './consts';
import { Logger, ILogger } from './shared/logger';
import { HealthChecker } from './shared/health.checker';

class Application {
    private app: express.Application;
    private logger: ILogger;
    private port: number;
    private healthChecker: HealthChecker;

    constructor() {
        this.app = express();
        this.logger = Logger.getInstance();
        this.port = parseInt(env.PORT || '3000', 10);
        this.healthChecker = new HealthChecker();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(express.json());
    }

    private setupRoutes(): void {
        // Настраиваем вебхук для Telegram бота
        this.app.use(WEBHOOK_PATH, webhookCallback(bot, 'express'));
        
        // Добавляем улучшенный health check endpoint
        this.app.get('/health', async (req, res) => {
            try {
                const healthStatus = await this.healthChecker.checkHealth();
                const statusCode = healthStatus.status === 'healthy' ? 200 : 
                                 healthStatus.status === 'degraded' ? 200 : 503;
                
                res.status(statusCode).json(healthStatus);
            } catch (error) {
                this.logger.error('Health check failed', error as Error);
                res.status(503).json({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: 'Health check failed'
                });
            }
        });

        // Добавляем простой health check для load balancers
        this.app.get('/health/simple', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
    }

    async start(): Promise<void> {
        try {
            // Инициализируем подключения к базам данных
            await this.initializeConnections();
            
            // Инициализируем бота
            await botManager.initialize();
            
            // Запускаем сервер
            this.app.listen(this.port, () => {
                this.logger.info(`Server started on port ${this.port}`);
            });

            // Настраиваем webhook для Telegram бота
            await this.setupWebhook();

            // Обработка graceful shutdown
            this.setupGracefulShutdown();
            
        } catch (error) {
            this.logger.error('Failed to start application', error as Error);
            process.exit(1);
        }
    }

    private async initializeConnections(): Promise<void> {
        try {
            await pg.initializePool();
            this.logger.info('PostgreSQL connection initialized');
            
            // Проверяем подключение к Redis при старте
            await redis.initializeConnection();
            this.logger.info('Redis connection initialized');
        } catch (error) {
            this.logger.error('Failed to initialize database connections', error as Error);
            throw error;
        }
    }

    private async setupWebhook(): Promise<void> {
        try {
            const webhookUrl = `${env.WEBHOOK_URL}${WEBHOOK_PATH}`;
            await bot.api.setWebhook(webhookUrl);
            this.logger.info(`Webhook url set: ${webhookUrl}`);
        } catch (error) {
            this.logger.error('Error setting webhook url:', error as Error);
        }
    }

    private setupGracefulShutdown(): void {
        const shutdown = async (signal: string) => {
            this.logger.info(`Received ${signal}, shutting down gracefully...`);
            
            try {
                // Закрываем бота
                await botManager.shutdown();
                this.logger.info('Bot manager shut down successfully');
                
                // Закрываем подключения к БД
                await pg.closePool();
                this.logger.info('PostgreSQL pool closed');
                
                // Закрываем Redis
                await redis.closeConnection();
                this.logger.info('Redis connection closed');
                
                this.logger.info('Application shut down successfully');
                process.exit(0);
            } catch (error) {
                this.logger.error('Error during shutdown', error as Error);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
}

// Запускаем приложение
const app = new Application();
app.start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
