/**
 * 🗄️ Cart Repository - Secondary Adapter
 * 
 * Адаптер для работы с базой данных и кэшем
 * Реализует ICartRepository
 */

import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { ICartRepository, Cart, ProductCart, CartConfig, CartQueries } from '../ports/cart.port';

export class CartRepository implements ICartRepository {
    private pool: Pool;
    private redis: RedisClientType;

    constructor(pool: Pool, redis: RedisClientType) {
        this.pool = pool;
        this.redis = redis;
    }

    /**
     * Получить корзину пользователя
     */
    async getCart(userId: number): Promise<Cart> {
        // Проверяем кэш
        const cacheKey = `cart:${userId}`;
        const cachedCart = await this.redis.get(cacheKey);

        if (cachedCart) {
            try {
                return JSON.parse(cachedCart) as Cart;
            } catch (e) {
                console.error('Ошибка парсинга кэша корзины:', e);
            }
        }

        // Если кэша нет, запрашиваем данные из БД
        try {
            const result = await this.pool.query<{
                item_id: number;
                quantity: number;
            }>(CartQueries.SELECT_CART, [userId]);

            const products: { [productId: number]: ProductCart } = {};

            // Формируем объект продуктов
            result.rows.forEach((row) => {
                products[row.item_id] = { id: row.item_id, qty: row.quantity };
            });

            const cart: Cart = { total: 0, products };

            // Сохраняем корзину в Redis
            await this.redis.set(cacheKey, JSON.stringify(cart));
            await this.redis.expire(cacheKey, CartConfig.CACHE_TTL_SECONDS);

            return cart;
        } catch (error) {
            console.error('Ошибка получения корзины из БД:', error);
            return { total: 0, products: {} };
        }
    }

    /**
     * Сохранить корзину
     */
    async saveCart(userId: number, cart: Cart): Promise<Cart> {
        const cartCacheKey = `cart:${userId}`;
        try {
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
            console.error('Ошибка сохранения корзины:', error);
            throw error;
        }
    }

    /**
     * Добавить товар в корзину
     */
    async addItem(userId: number, productId: number, quantity: number): Promise<void> {
        const cart = await this.getCart(userId);
        
        if (cart.products[productId]) {
            cart.products[productId].qty += quantity;
        } else {
            cart.products[productId] = { id: productId, qty: quantity };
        }

        await this.saveCart(userId, cart);
    }

    /**
     * Удалить товар из корзины
     */
    async removeItem(userId: number, productId: number): Promise<void> {
        const cart = await this.getCart(userId);
        
        if (cart.products[productId]) {
            delete cart.products[productId];
            await this.saveCart(userId, cart);
        }
    }

    /**
     * Обновить количество товара
     */
    async updateItemQuantity(userId: number, productId: number, quantity: number): Promise<void> {
        const cart = await this.getCart(userId);
        
        if (cart.products[productId]) {
            if (quantity <= 0) {
                delete cart.products[productId];
            } else {
                cart.products[productId].qty = quantity;
            }
            await this.saveCart(userId, cart);
        }
    }

    /**
     * Очистить корзину
     */
    async clearCart(userId: number): Promise<void> {
        try {
            await this.pool.query(CartQueries.DELETE_CART, [userId]);
            await this.clearCache(userId);
        } catch (error) {
            console.error('Ошибка очистки корзины:', error);
            throw error;
        }
    }

    /**
     * Очистить кэш корзины
     */
    async clearCache(userId: number): Promise<void> {
        const cartCacheKey = `cart:${userId}`;
        await this.redis.del(cartCacheKey);
    }

    /**
     * Рассчитать общую стоимость корзины
     */
    async calculateTotal(cart: Cart): Promise<number> {
        let total = 0;
        for (const product of Object.values(cart.products)) {
            const price = await this.getCachedPrice(product.id);
            total += product.qty * price;
        }
        return total;
    }

    /**
     * Получение цены продукта с кэшированием
     */
    private async getCachedPrice(productId: number): Promise<number> {
        const priceCacheKey = `product:price:${productId}`;
        const cachedPrice = await this.redis.get(priceCacheKey);

        if (cachedPrice) {
            return parseFloat(cachedPrice);
        }

        // Если цены нет в кэше, получаем из БД
        const result = await this.pool.query(
            'SELECT price FROM catalog WHERE id = $1',
            [productId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Product with ID ${productId} not found`);
        }

        const price = result.rows[0].price;
        
        // Кэшируем цену
        await this.redis.set(priceCacheKey, price.toString());
        await this.redis.expire(priceCacheKey, CartConfig.PRICE_CACHE_TTL_SECONDS);

        return price;
    }
} 