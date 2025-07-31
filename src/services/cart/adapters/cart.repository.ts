/**
 * 🔌 Cart Repository Adapter (ДОМЕННАЯ ЛОГИКА - САМЫЙ ВАЖНЫЙ!)
 * 
 * Реализация порта ICartRepository для работы с PostgreSQL и Redis
 * Содержит всю доменную логику корзины
 */

import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { ensureConnection } from '../../../db/redis';
import { 
    ICartRepository, 
    Cart, 
    ProductCart, 
    CartConfig, 
    CartQueries,
    CartError,
    CartErrorType 
} from '../ports/cart.port';
import { Logger } from '../../../shared/logger';

export class CartRepository implements ICartRepository {
    private readonly pool: Pool;
    private readonly redis: RedisClientType;
    private readonly logger: Logger;

    constructor(pool: Pool, redis: RedisClientType) {
        this.pool = pool;
        this.redis = redis;
        this.logger = Logger.getInstance();
    }

    /**
     * Получить корзину пользователя (доменная логика)
     */
    async getCart(userId: number): Promise<Cart> {
        try {
            // Обеспечиваем подключение к Redis
            await ensureConnection();
            
            // Проверяем кэш
            const cacheKey = `cart:${userId}`;
            const cachedCart = await this.redis.get(cacheKey);

            if (cachedCart) {
                try {
                    return JSON.parse(cachedCart) as Cart;
                } catch (e) {
                    this.logger.error('Ошибка парсинга кэша корзины', e as Error);
                }
            }

            // Если кэша нет, запрашиваем данные из БД
            const result = await this.pool.query<{
                item_id: number;
                quantity: number;
            }>(CartQueries.SELECT_CART, [userId]);

            const products: { [productId: number]: ProductCart } = {};

            // Формируем объект продуктов (доменная логика)
            result.rows.forEach((row) => {
                products[row.item_id] = { id: row.item_id, qty: row.quantity };
            });

            const cart: Cart = { total: 0, products };

            // Сохраняем корзину в Redis
            await this.redis.set(cacheKey, JSON.stringify(cart));
            await this.redis.expire(cacheKey, CartConfig.CACHE_TTL_SECONDS);

            return cart;
        } catch (error) {
            this.logger.error('Ошибка получения корзины из БД', error as Error);
            return { total: 0, products: {} };
        }
    }

    /**
     * Сохранить корзину (доменная логика)
     */
    async saveCart(userId: number, cart: Cart): Promise<Cart> {
        const cartCacheKey = `cart:${userId}`;
        try {
            // Обеспечиваем подключение к Redis
            await ensureConnection();
            // Очищаем старую корзину в БД
            await this.pool.query(CartQueries.DELETE_CART, [userId]);

            // Сохраняем новые элементы корзины
            for (const product of Object.values(cart.products)) {
                await this.pool.query(CartQueries.INSERT_CART_ITEM, [
                    userId,
                    product.id,
                    product.qty,
                ]);
            }

            // Обновляем кэш в Redis
            await this.redis.set(cartCacheKey, JSON.stringify(cart));
            await this.redis.expire(cartCacheKey, CartConfig.CACHE_TTL_SECONDS);

            return cart;
        } catch (error) {
            this.logger.error('Ошибка сохранения корзины', error as Error);
            throw new CartError(
                'Не удалось сохранить корзину',
                CartErrorType.DATABASE_ERROR,
                userId
            );
        }
    }

    /**
     * Добавить товар в корзину (доменная логика)
     */
    async addItem(userId: number, productId: number, quantity: number): Promise<void> {
        try {
            const cart = await this.getCart(userId);
            
            if (cart.products[productId]) {
                cart.products[productId].qty += quantity;
            } else {
                cart.products[productId] = { id: productId, qty: quantity };
            }

            await this.saveCart(userId, cart);
        } catch (error) {
            this.logger.error('Ошибка добавления товара в корзину', error as Error);
            throw new CartError(
                'Не удалось добавить товар в корзину',
                CartErrorType.DATABASE_ERROR,
                userId,
                productId
            );
        }
    }

    /**
     * Удалить товар из корзины (доменная логика)
     */
    async removeItem(userId: number, productId: number): Promise<void> {
        try {
            const cart = await this.getCart(userId);
            
            if (cart.products[productId]) {
                delete cart.products[productId];
                await this.saveCart(userId, cart);
            }
        } catch (error) {
            this.logger.error('Ошибка удаления товара из корзины', error as Error);
            throw new CartError(
                'Не удалось удалить товар из корзины',
                CartErrorType.DATABASE_ERROR,
                userId,
                productId
            );
        }
    }

    /**
     * Обновить количество товара (доменная логика)
     */
    async updateItemQuantity(userId: number, productId: number, quantity: number): Promise<void> {
        try {
            const cart = await this.getCart(userId);
            
            if (cart.products[productId]) {
                if (quantity <= 0) {
                    delete cart.products[productId];
                } else {
                    cart.products[productId].qty = quantity;
                }
                await this.saveCart(userId, cart);
            }
        } catch (error) {
            this.logger.error('Ошибка обновления количества товара', error as Error);
            throw new CartError(
                'Не удалось обновить количество товара',
                CartErrorType.DATABASE_ERROR,
                userId,
                productId
            );
        }
    }

    /**
     * Очистить корзину (доменная логика)
     */
    async clearCart(userId: number): Promise<void> {
        try {
            await this.pool.query(CartQueries.DELETE_CART, [userId]);
            await this.clearCache(userId);
        } catch (error) {
            this.logger.error('Ошибка очистки корзины', error as Error);
            throw new CartError(
                'Не удалось очистить корзину',
                CartErrorType.DATABASE_ERROR,
                userId
            );
        }
    }

    /**
     * Очистить кэш корзины (доменная логика)
     */
    async clearCache(userId: number): Promise<void> {
        const cartCacheKey = `cart:${userId}`;
        await ensureConnection();
        await this.redis.del(cartCacheKey);
    }

    /**
     * Рассчитать общую стоимость корзины (доменная логика)
     */
    async calculateTotal(cart: Cart): Promise<number> {
        let total = 0;
        for (const product of Object.values(cart.products)) {
            // Получаем цену из кэша или БД
            const price = await this.getCachedPrice(product.id);
            total += product.qty * price;
        }
        return total;
    }

    /**
     * Получение цены продукта с кэшированием (доменная логика)
     */
    private async getCachedPrice(productId: number): Promise<number> {
        const cacheKey = `product:price:${productId}`;
        
        try {
            // Обеспечиваем подключение к Redis
            await ensureConnection();
            const cachedPrice = await this.redis.get(cacheKey);
            if (cachedPrice) {
                return parseFloat(cachedPrice);
            }

            // Если кэша нет, получаем из БД
            const result = await this.pool.query(
                'SELECT price FROM products WHERE id = $1',
                [productId]
            );

            if (result.rows.length > 0) {
                const price = result.rows[0].price;
                // Сохраняем в кэш
                await this.redis.set(cacheKey, price.toString());
                await this.redis.expire(cacheKey, CartConfig.PRICE_CACHE_TTL_SECONDS);
                return price;
            }

            return 0;
        } catch (error) {
            this.logger.error('Ошибка получения цены товара', error as Error);
            return 0;
        }
    }
} 