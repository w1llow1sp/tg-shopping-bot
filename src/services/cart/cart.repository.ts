import { RedisClientType } from 'redis';
import { Pool } from 'pg';

export interface ProductCart {
  id: number;
  qty: number;
}

export interface Cart {
  total: number;
  products: { [productId: number]: ProductCart };
}

export class CartRepository {
  private pool: Pool;
  private redis: RedisClientType;
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 часа

  constructor(pool: Pool, redis: RedisClientType) {
    this.pool = pool;
    this.redis = redis;
  }

  async getCart(userId: number): Promise<Cart> {
    // Проверяем кэш
    const cacheKey = `cart:${userId}`;
    const cachedCart = await this.redis.get(cacheKey);

    if (cachedCart) {
      try {
        return JSON.parse(cachedCart);
      } catch (e) {
        console.error('Cart cache parsing error', e);
      }
    }

    // Получаем из БД
    const sql = `
      SELECT item_id, quantity
      FROM cart
      WHERE user_id = $1
    `;

    try {
      const result = await this.pool.query<{ item_id: number; quantity: number }>(sql, [userId]);
      const products: { [productId: number]: ProductCart } = {};

      result.rows.forEach(row => {
        products[row.item_id] = { id: row.item_id, qty: row.quantity };
      });

      const cart: Cart = { total: 0, products };

      // Кэшируем в Redis
      await this.redis.set(cacheKey, JSON.stringify(cart));
      await this.redis.expire(cacheKey, this.CACHE_TTL);

      return cart;
    } catch (error) {
      console.error('Error fetching cart from DB', error);
      return { total: 0, products: {} };
    }
  }

  async saveCart(userId: number, cart: Cart): Promise<Cart> {
    const cacheKey = `cart:${userId}`;

    // Очищаем старую корзину в БД
    await this.pool.query('DELETE FROM cart WHERE user_id = $1', [userId]);

    // Сохраняем новые данные
    for (const product of Object.values(cart.products)) {
      const sql = `
        INSERT INTO cart (user_id, item_id, quantity)
        VALUES ($1, $2, $3)
      `;
      await this.pool.query(sql, [userId, product.id, product.qty]);
    }

    // Обновляем кэш
    await this.redis.set(cacheKey, JSON.stringify(cart));
    await this.redis.expire(cacheKey, this.CACHE_TTL);

    return cart;
  }

  async clearCache(userId: number): Promise<void> {
    await this.redis.del(`cart:${userId}`);
  }
}