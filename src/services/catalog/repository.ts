import { Pool } from 'pg';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

export class CatalogRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getProducts(limit: number, offset: number): Promise<Product[]> {
    const sql = 'SELECT id, name, description, price, image FROM catalog ORDER BY id LIMIT $1 OFFSET $2';
    try {
      const products = await this.pool.query<Product>(sql, [limit, offset]);
      console.log('Successfully fetched products from catalog:', products);
      return products.rows;
    } catch (error) {
      console.error('Ошибка в getProducts:', error);
      throw new Error('Failed to fetch products from catalog');
    }
  }

  async getTotalProducts(): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM catalog';
    try {
      const result = await this.pool.query<{ count: string }>(sql);
      const total = parseInt(result.rows[0].count, 10);
      console.log('Successfully fetched total products from catalog:', total);
      return total;
    } catch (error) {
      console.error('Ошибка в getTotalProducts:', error);
      throw new Error('Failed to fetch total products from catalog');
    }
  }

  async getProductDetail(productId: number): Promise<Product> {
    const sql = 'SELECT id, name, description, price, image FROM catalog WHERE id = $1';
    try {
      const products = await this.pool.query<Product>(sql, [productId]);
      console.log('Successfully fetched products from catalog:', products);
      return products.rows[0];
    } catch (error) {
      console.error('Ошибка в getProducts:', error);
      throw new Error('Failed to fetch products from catalog');
    }

  }
}