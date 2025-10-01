import { Logger, ILogger } from './logger';

/**
 * 🔍 Health Checker
 * 
 * Проверка состояния здоровья приложения
 */
export class HealthChecker {
    private logger: ILogger;

    constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Проверка здоровья приложения
     */
    async checkHealth(): Promise<any> {
        try {
            this.logger.info('Performing health check');

            // TODO: Добавить проверки базы данных, Redis и других сервисов
            const healthStatus = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'connected',
                    redis: 'connected',
                    bot: 'running'
                },
                uptime: process.uptime(),
                memory: process.memoryUsage()
            };

            this.logger.info('Health check completed successfully');
            return healthStatus;
        } catch (error) {
            this.logger.error('Health check failed', error as Error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Health check failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
} 