/**
 * 🏛️ Catalog Service - Hexagonal Architecture Ports
 * 
 * Входные порты (Primary/Driving Adapters):
 * - Интерфейсы для внешних систем (Telegram Bot)
 * 
 * Выходные порты (Secondary/Driven Adapters):
 * - Интерфейсы для инфраструктуры (Database, Cache)
 */

// ===== ВХОДНЫЕ ПОРТЫ (Primary Ports) =====

/**
 * Порт для управления каталогом (Сервис)
 */
export interface ICatalogService {
    /**
     * Получить список товаров с пагинацией
     */
    getProducts(limit: number, offset: number): Promise<Product[]>;
    
    /**
     * Получить общее количество товаров
     */
    getTotalProducts(): Promise<number>;
    
    /**
     * Получить детальную информацию о товаре
     */
    getProductDetail(productId: number): Promise<Product>;
    
    /**
     * Получить соседние товары
     */
    getNeighborProducts(productId: number): Promise<{ prevId: number | null; nextId: number | null }>;
    
    /**
     * Проверить существование товара
     */
    productExists(productId: number): Promise<boolean>;
    
    /**
     * Получить каталог с пагинацией
     */
    getCatalogPage(page: number, productsPerPage: number): Promise<any>;
    
    /**
     * Получить товары по категории
     */
    getProductsByCategory(category: string): Promise<Product[]>;
    
    /**
     * Поиск товаров
     */
    searchProducts(query: string): Promise<Product[]>;
    
    /**
     * Поиск товаров с пагинацией
     */
    searchProductsWithPagination(query: string, page: number, productsPerPage: number): Promise<any>;
}

/**
 * Порт для представления каталога (View)
 */
export interface ICatalogView {
    /**
     * Отобразить каталог товаров
     */
    renderCatalog(products: Product[], page: number, total: number, productsPerPage: number): any;
    
    /**
     * Отобразить детальную информацию о товаре
     */
    renderProduct(product: Product, neighbors: { prevId: number | null; nextId: number | null }, isAdded?: boolean): any;
    
    /**
     * Отобразить сообщение об ошибке
     */
    renderError(message: string): any;
}

// ===== ВЫХОДНЫЕ ПОРТЫ (Secondary Ports) =====

/**
 * Порт для доменной логики каталога (Репозиторий - САМЫЙ ВАЖНЫЙ!)
 */
export interface ICatalogRepository {
    /**
     * Получить список товаров с пагинацией
     */
    getProducts(limit: number, offset: number): Promise<Product[]>;
    
    /**
     * Получить общее количество товаров
     */
    getTotalProducts(): Promise<number>;
    
    /**
     * Получить детальную информацию о товаре
     */
    getProductDetail(productId: number): Promise<Product>;
    
    /**
     * Получить соседние товары
     */
    getNeighborProducts(productId: number): Promise<{ prevId: number | null; nextId: number | null }>;
    
    /**
     * Проверить существование товара
     */
    productExists(productId: number): Promise<boolean>;
    
    /**
     * Получить товары по категории
     */
    getProductsByCategory(category: string): Promise<Product[]>;
    
    /**
     * Поиск товаров
     */
    searchProducts(query: string): Promise<Product[]>;
}

// ===== ДОМЕННЫЕ МОДЕЛИ =====

/**
 * Товар в каталоге
 */
export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    image: string;
    itemsavailable: number;
}

// ===== КОНФИГУРАЦИЯ =====

export const CatalogConfig = {
    DEFAULT_PRODUCTS_PER_PAGE: 4,
    MAX_PRODUCTS_PER_PAGE: 10,
    CACHE_TTL_SECONDS: 24 * 60 * 60, // Время жизни кэша каталога (24 часа)
} as const;

// ===== SQL-ЗАПРОСЫ =====

export const CatalogQueries = {
    GET_PRODUCTS: 'SELECT id, name, description, price, image, itemsavailable FROM catalog ORDER BY id LIMIT $1 OFFSET $2',
    GET_TOTAL_PRODUCTS: 'SELECT COUNT(*) as count FROM catalog',
    GET_PRODUCT_DETAIL: 'SELECT id, name, description, price, image, itemsavailable FROM catalog WHERE id = $1',
    GET_PREV_PRODUCT: 'SELECT id FROM catalog WHERE id < $1 ORDER BY id DESC LIMIT 1',
    GET_NEXT_PRODUCT: 'SELECT id FROM catalog WHERE id > $1 ORDER BY id ASC LIMIT 1',
    PRODUCT_EXISTS: 'SELECT EXISTS(SELECT 1 FROM catalog WHERE id = $1) as exists',
} as const;

// ===== РЕГУЛЯРНЫЕ ВЫРАЖЕНИЯ =====

export const CatalogCallbackRegex = {
    CATALOG_PAGE: /^catalog:(\d+)$/,
    PRODUCT_DETAIL: /^product:(\d+)$/,
} as const;

// ===== СООБЩЕНИЯ ОБ ОШИБКАХ =====

export enum CatalogErrorMessages {
    FETCH_PRODUCTS_FAILED = 'Не удалось получить список товаров из каталога',
    FETCH_TOTAL_PRODUCTS_FAILED = 'Не удалось получить общее количество товаров',
    FETCH_PRODUCT_DETAIL_FAILED = 'Не удалось получить информацию о товаре',
    PRODUCT_NOT_FOUND = 'Товар с указанным ID не найден',
    FETCH_NEIGHBOR_PRODUCTS_FAILED = 'Не удалось получить соседние товары',
    INVALID_PAGE_NUMBER = 'Некорректный номер страницы',
    INVALID_PRODUCT_ID = 'Некорректный ID товара',
    INVALID_LIMIT = 'Некорректное количество товаров на странице',
    INVALID_OFFSET = 'Некорректное смещение',
}

// ===== ТИПЫ ДЛЯ ОБРАБОТКИ ОШИБОК =====

export enum CatalogErrorType {
    PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
    INVALID_PAGE = 'INVALID_PAGE',
    INVALID_PRODUCT_ID = 'INVALID_PRODUCT_ID',
    DATABASE_ERROR = 'DATABASE_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export class CatalogError extends Error {
    constructor(
        message: string,
        public type: CatalogErrorType,
        public productId?: number,
        public page?: number
    ) {
        super(message);
        this.name = 'CatalogError';
    }
} 