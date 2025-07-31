/**
 * 🏛️ Cart Service - Hexagonal Architecture Ports
 * 
 * Входные порты (Primary/Driving Adapters):
 * - Интерфейсы для внешних систем (Telegram Bot)
 * 
 * Выходные порты (Secondary/Driven Adapters):
 * - Интерфейсы для инфраструктуры (Database, Cache)
 */

// ===== ВХОДНЫЕ ПОРТЫ (Primary Ports) =====

/**
 * Порт для управления корзиной (Сервис)
 */
export interface ICartService {
    /**
     * Получить корзину пользователя
     */
    getCart(userId: number): Promise<Cart>;
    
    /**
     * Добавить товар в корзину
     */
    addToCart(userId: number, productId: number, quantity: number): Promise<Cart>;
    
    /**
     * Удалить товар из корзины
     */
    removeFromCart(userId: number, productId: number): Promise<Cart>;
    
    /**
     * Изменить количество товара
     */
    updateQuantity(userId: number, productId: number, quantity: number): Promise<Cart>;
    
    /**
     * Очистить корзину
     */
    clearCart(userId: number): Promise<void>;
    
    /**
     * Получить общую стоимость корзины
     */
    getTotalPrice(userId: number): Promise<number>;
}

/**
 * Порт для представления корзины (View)
 */
export interface ICartView {
    /**
     * Отобразить корзину пользователя
     */
    renderCart(cart: Cart): any;
    
    /**
     * Отобразить сообщение об успешном добавлении
     */
    renderAddSuccess(productName: string): any;
    
    /**
     * Отобразить сообщение об ошибке
     */
    renderError(message: string): any;
}

// ===== ВЫХОДНЫЕ ПОРТЫ (Secondary Ports) =====

/**
 * Порт для доменной логики корзины (Репозиторий - САМЫЙ ВАЖНЫЙ!)
 */
export interface ICartRepository {
    /**
     * Получить корзину пользователя
     */
    getCart(userId: number): Promise<Cart>;
    
    /**
     * Сохранить корзину
     */
    saveCart(userId: number, cart: Cart): Promise<Cart>;
    
    /**
     * Добавить товар в корзину
     */
    addItem(userId: number, productId: number, quantity: number): Promise<void>;
    
    /**
     * Удалить товар из корзины
     */
    removeItem(userId: number, productId: number): Promise<void>;
    
    /**
     * Обновить количество товара
     */
    updateItemQuantity(userId: number, productId: number, quantity: number): Promise<void>;
    
    /**
     * Очистить корзину
     */
    clearCart(userId: number): Promise<void>;
    
    /**
     * Очистить кэш корзины
     */
    clearCache(userId: number): Promise<void>;
    
    /**
     * Рассчитать общую стоимость корзины
     */
    calculateTotal(cart: Cart): Promise<number>;
}

/**
 * Порт для получения информации о товарах
 */
export interface IProductRepository {
    /**
     * Получить товар по ID
     */
    getProduct(productId: number): Promise<Product>;
    
    /**
     * Проверить существование товара
     */
    productExists(productId: number): Promise<boolean>;
}

// ===== ДОМЕННЫЕ МОДЕЛИ =====

/**
 * Товар в корзине
 */
export interface ProductCart {
    id: number;
    qty: number;
}

/**
 * Корзина пользователя
 */
export interface Cart {
    total: number;
    products: { [productId: number]: ProductCart };
}

/**
 * Товар
 */
export interface Product {
    id: number;
    name: string;
    price: number;
    description?: string;
    imageUrl?: string;
    available: boolean;
    itemsavailable: number;
}

// ===== КОНФИГУРАЦИЯ =====

export const CartConfig = {
    CACHE_TTL_SECONDS: 24 * 60 * 60, // Время жизни кэша корзины (24 часа)
    PRICE_CACHE_TTL_SECONDS: 24 * 60 * 60, // Время жизни кэша цен (24 часа)
    MAX_QUANTITY: 10, // Максимальное количество одного товара в корзине
} as const;

// ===== SQL-ЗАПРОСЫ =====

export const CartQueries = {
    // Запрос для получения элементов корзины
    SELECT_CART: `
        SELECT item_id, quantity
        FROM cart
        WHERE user_id = $1
    `,
    // Запрос для удаления корзины пользователя
    DELETE_CART: `
        DELETE FROM cart
        WHERE user_id = $1
    `,
    // Запрос для добавления элемента в корзину
    INSERT_CART_ITEM: `
        INSERT INTO cart (user_id, item_id, quantity)
        VALUES ($1, $2, $3)
    `,
} as const;

// ===== РЕГУЛЯРНЫЕ ВЫРАЖЕНИЯ =====

export const CartCallbackRegex = {
    // Регулярное выражение для добавления продукта (cart:add:ID)
    ADD_PRODUCT: /^cart:add:(\d+)$/,
    // Регулярное выражение для удаления продукта (cart:del:ID)
    DELETE_PRODUCT: /^cart:del:(\d+)$/,
    // Регулярное выражение для увеличения количества (cart:inc:ID)
    INCREASE_QTY: /^cart:inc:(\d+)$/,
    // Регулярное выражение для уменьшения количества (cart:dec:ID)
    DECREASE_QTY: /^cart:dec:(\d+)$/,
} as const;

// ===== СООБЩЕНИЯ ОБ ОШИБКАХ =====

export enum CartErrorMessages {
    HANDLE_CART_WRONG_USER = '❌ Ошибка: неверный пользователь',
    HANDLE_CART_CART_OPEN_ERROR = '❌ Ошибка при открытии корзины',
    REQUEST_ERROR = '❌ Ошибка: данные запроса отсутствуют',
    WRONG_USER_OR_PRODUCT = '❌ Ошибка: неверный пользователь или продукт',
    PRODUCT_NOT_FOUND_IN_CART = '❌ Продукт не найден в корзине',
    HANDLE_ADD_PRODUCT_PRODUCT_IS_NOT_ENOUGHT = '❌ Недостаточно товара на складе',
    HANDLE_ADD_PRODUCT_PRODUCT_NOT_FOUND = 'Продукт не найден',
    HANDLE_ADD_PRODUCT_ERROR_IN_CART_ADDING = 'Ошибка при добавлении в корзину',
    HANDLE_DELETE_PRODUCT_DELETE_ITEM_ERROR = '❌ Ошибка при удалении из корзины',
    HANDLE_INCREASE_QTY_QUANTITY_CHANGE_ERROR = '❌ Ошибка при изменении количества'
}

// ===== ТИПЫ ДЛЯ ОБРАБОТКИ ОШИБОК =====

export enum CartErrorType {
    PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
    PRODUCT_NOT_AVAILABLE = 'PRODUCT_NOT_AVAILABLE',
    INVALID_QUANTITY = 'INVALID_QUANTITY',
    CART_NOT_FOUND = 'CART_NOT_FOUND',
    DATABASE_ERROR = 'DATABASE_ERROR'
}

export class CartError extends Error {
    constructor(
        message: string,
        public type: CartErrorType,
        public userId?: number,
        public productId?: number
    ) {
        super(message);
        this.name = 'CartError';
    }
} 