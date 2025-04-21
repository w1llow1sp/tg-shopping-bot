import { RedisClientType } from 'redis';

export interface ProductCart {
  id: number;
  qty: number;
}

export interface Cart {
  total: number;
  products: { [productId: number]: ProductCart };
}

export class CartRepository {
  private conn: RedisClientType;

  constructor(conn: RedisClientType) {
    this.conn = conn;
  }

  async getCart(userId: number): Promise<Cart | null> {
    const cartStr = await this.conn.get(`cart:${userId}`);
    console.log(cartStr);
    let cart: Cart;
    if (!cartStr) {
      return { total: 0, products: {} };
    }

    try {
      cart = JSON.parse(cartStr);
      return cart;
    } catch (e) {
      console.error('Cart parsing error', e);
      return null;
    }
  }

  async saveCart(userId: number, cart: Cart): Promise<Cart | null> {
    const key = `cart:${userId}`
    await this.conn.set(key, JSON.stringify(cart));
    await this.conn.expire(key, 24 * 60 * 60)  // drop cart after 24 hours
    return cart;
  }
}