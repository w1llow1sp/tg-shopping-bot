/**
 * 🏛️ Menu Service - Hexagonal Architecture Ports
 * 
 * Входные порты (Primary/Driving Adapters):
 * - Интерфейсы для внешних систем (Telegram Bot)
 * 
 * Выходные порты (Secondary/Driven Adapters):
 * - Интерфейсы для инфраструктуры (Database, Cache)
 */

// ===== ВХОДНЫЕ ПОРТЫ (Primary Ports) =====

/**
 * Порт для управления меню (Сервис)
 */
export interface IMenuService {
    /**
     * Получить главное меню
     */
    getMainMenu(): Promise<MenuData>;
    
    /**
     * Получить приветственное сообщение
     */
    getWelcomeMessage(username: string): Promise<WelcomeData>;
    
    /**
     * Проверить подключение к базе данных
     */
    checkDatabaseConnection(): Promise<string>;
    
    /**
     * Получить статистику системы
     */
    getSystemStats(): Promise<SystemStats>;
}

/**
 * Порт для представления меню (View)
 */
export interface IMenuView {
    /**
     * Отобразить главное меню
     */
    renderMainMenu(): any;
    
    /**
     * Отобразить приветственное сообщение
     */
    renderWelcomeMessage(username: string): any;
    
    /**
     * Отобразить сообщение об ошибке
     */
    renderError(message: string): any;
    
    /**
     * Отобразить неизвестную команду
     */
    renderUnknownCommand(): any;
}

// ===== ВЫХОДНЫЕ ПОРТЫ (Secondary Ports) =====

/**
 * Порт для доменной логики меню (Репозиторий - САМЫЙ ВАЖНЫЙ!)
 */
export interface IMenuRepository {
    /**
     * Получить главное меню
     */
    getMainMenu(): Promise<MenuData>;
    
    /**
     * Получить приветственное сообщение
     */
    getWelcomeMessage(username: string): Promise<WelcomeData>;
    
    /**
     * Проверить подключение к базе данных
     */
    checkDatabaseConnection(): Promise<string>;
    
    /**
     * Получить статистику системы
     */
    getSystemStats(): Promise<SystemStats>;
}

// ===== ДОМЕННЫЕ МОДЕЛИ =====

/**
 * Информация о пользователе
 */


/**
 * Данные главного меню
 */
export interface MenuData {
    title: string;
    description: string;
    options: MenuOption[];
}

/**
 * Опция меню
 */
export interface MenuOption {
    text: string;
    callback_data: string;
    icon?: string;
}

/**
 * Данные приветственного сообщения
 */
export interface WelcomeData {
    text: string;
    username: string;
    timestamp: Date;
}

/**
 * Статистика системы
 */
export interface SystemStats {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    databaseStatus: string;
}

// ===== КОНФИГУРАЦИЯ =====

export const MenuConfig = {
    WELCOME_MESSAGE_TEMPLATE: 'Добро пожаловать в наш магазин, {username}! Выберите действие:',
    UNKNOWN_COMMAND_MESSAGE: 'Неизвестная команда. Используйте /start для начала работы.',
    ERROR_MESSAGE_TEMPLATE: 'Произошла ошибка: {message}',
    MAIN_MENU_TITLE: '🏠 Главное меню',
    MAIN_MENU_DESCRIPTION: 'Выберите нужный раздел:',
} as const;

// ===== SQL-ЗАПРОСЫ =====

export const MenuQueries = {
    CHECK_DB_CONNECTION: 'SELECT version();',
    GET_SYSTEM_STATS: `
        SELECT 
            (SELECT COUNT(*) FROM catalog) as total_products
    `,
} as const;

// ===== РЕГУЛЯРНЫЕ ВЫРАЖЕНИЯ =====

export const MenuCallbackRegex = {
    MAIN_MENU: /^main$/,
    START_COMMAND: /^\/start$/,
} as const;

// ===== СООБЩЕНИЯ ОБ ОШИБКАХ =====

export enum MenuErrorMessages {
    DATABASE_CONNECTION_FAILED = 'Не удалось подключиться к базе данных',
    GET_STATS_FAILED = 'Не удалось получить статистику системы',
    INVALID_USERNAME = 'Некорректное имя пользователя',
    WELCOME_MESSAGE_FAILED = 'Не удалось создать приветственное сообщение',
}

// ===== ТИПЫ ДЛЯ ОБРАБОТКИ ОШИБОК =====

export enum MenuErrorType {
    DATABASE_ERROR = 'DATABASE_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR'
}

export class MenuError extends Error {
    constructor(
        message: string,
        public type: MenuErrorType,
        public username?: string
    ) {
        super(message);
        this.name = 'MenuError';
    }
} 