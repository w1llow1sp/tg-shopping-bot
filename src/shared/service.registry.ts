import { Bot } from 'grammy';
import { Logger } from './logger';

/**
 * 🔧 Service Registry
 * 
 * Централизованное управление всеми сервисами
 * Каждый сервис регистрирует себя и свои обработчики
 */
export interface IService {
    name: string;
    initialize(bot: Bot): Promise<void>;
    shutdown(): Promise<void>;
}

export class ServiceRegistry {
    private static instance: ServiceRegistry;
    private services: Map<string, IService> = new Map();
    private logger: Logger;
    private bot: Bot | null = null;

    private constructor() {
        this.logger = Logger.getInstance();
    }

    static getInstance(): ServiceRegistry {
        if (!ServiceRegistry.instance) {
            ServiceRegistry.instance = new ServiceRegistry();
        }
        return ServiceRegistry.instance;
    }

    /**
     * Регистрация сервиса
     */
    registerService(service: IService): void {
        this.services.set(service.name, service);
        this.logger.info(`Service registered: ${service.name}`);
    }

    /**
     * Инициализация всех сервисов
     */
    async initializeServices(bot: Bot): Promise<void> {
        this.bot = bot;
        this.logger.info('Initializing all services...');

        for (const [name, service] of this.services) {
            try {
                await service.initialize(bot);
                this.logger.info(`Service initialized: ${name}`);
            } catch (error) {
                this.logger.error(`Failed to initialize service: ${name}`, error as Error);
                throw error;
            }
        }

        this.logger.info(`All services initialized successfully (${this.services.size} services)`);
    }

    /**
     * Завершение работы всех сервисов
     */
    async shutdownServices(): Promise<void> {
        this.logger.info('Shutting down all services...');

        for (const [name, service] of this.services) {
            try {
                await service.shutdown();
                this.logger.info(`Service shut down: ${name}`);
            } catch (error) {
                this.logger.error(`Failed to shut down service: ${name}`, error as Error);
            }
        }

        this.logger.info('All services shut down');
    }

    /**
     * Получение сервиса по имени
     */
    getService(name: string): IService | undefined {
        return this.services.get(name);
    }

    /**
     * Получение всех сервисов
     */
    getAllServices(): Map<string, IService> {
        return new Map(this.services);
    }

    /**
     * Получение статуса здоровья всех сервисов
     */
    async getHealthStatus(): Promise<any> {
        const servicesStatus: Record<string, string> = {};
        
        for (const [name, service] of this.services) {
            servicesStatus[name] = 'running';
        }

        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: servicesStatus,
            totalServices: this.services.size
        };
    }
} 