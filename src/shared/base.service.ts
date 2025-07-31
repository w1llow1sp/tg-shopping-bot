import { Bot } from 'grammy';
import { Logger } from './logger';
import { IService } from './service.registry';

/**
 * 🔧 Base Service
 * 
 * Базовый класс для всех сервисов
 * Предоставляет общую функциональность
 */
export abstract class BaseService implements IService {
    protected bot: Bot | null = null;
    protected logger: Logger;
    public abstract readonly name: string;

    constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Инициализация сервиса
     * Каждый сервис должен переопределить этот метод
     */
    async initialize(bot: Bot): Promise<void> {
        this.bot = bot;
        this.logger.info(`Initializing service: ${this.name}`);
        
        // Регистрируем обработчики
        await this.registerHandlers();
        
        this.logger.info(`Service initialized: ${this.name}`);
    }

    /**
     * Завершение работы сервиса
     */
    async shutdown(): Promise<void> {
        this.logger.info(`Shutting down service: ${this.name}`);
        // Каждый сервис может переопределить этот метод
    }

    /**
     * Регистрация обработчиков
     * Каждый сервис должен переопределить этот метод
     */
    protected abstract registerHandlers(): Promise<void>;

    /**
     * Получение экземпляра бота
     */
    protected getBot(): Bot {
        if (!this.bot) {
            throw new Error(`Bot not initialized for service: ${this.name}`);
        }
        return this.bot;
    }
} 