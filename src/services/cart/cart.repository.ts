import { RedisClientType } from 'redis';
import { Pool } from 'pg';
import { CartConfig, CartQueries } from './cart.dictionaries';

// Интерфейс для продукта в корзине
export interface ProductCart {
  id: number;
  qty: number;
}

// Интерфейс корзины пользователя
export interface Cart {
  total: number;
  products: { [productId: number]: ProductCart };
}

// Репозиторий для работы с корзиной
// Отвечает за получение, сохранение и кэширование данных корзины
export class CartRepository {
  private pool: Pool;
  private redis: RedisClientType;

  constructor(pool: Pool, redis: RedisClientType) {
    this.pool = pool;
    this.redis = redis;
  }

  // Получение корзины пользователя
  async getCart(userId: number): Promise<Cart> {
    // Проверяем кэш
    const cacheKey = `cart:${userId}`;

    // Проверяем наличие корзины в Redis
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

  // Сохранение корзины пользователя
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

  async clearCache(userId: number): Promise<void> {
    const cartCacheKey = `cart:${userId}`;
    await this.redis.del(cartCacheKey);
  }
}
