import { query } from '../../db/db';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

export class CatalogModel {
  async getProducts(limit: number, offset: number): Promise<Product[]> {
    const sql = 'SELECT id, name, description, price, image FROM catalog ORDER BY id LIMIT $1 OFFSET $2';
    try {
      const products = await query<Product>(sql, [limit, offset]);
      console.log('Successfully fetched products from catalog:', products);
      return products;
    } catch (error) {
      console.error('Ошибка в getProducts:', error);
      throw new Error('Failed to fetch products from catalog');
    }
  }

  async getTotalProducts(): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM catalog';
    try {
      const result = await query<{ count: string }>(sql);
      const total = parseInt(result[0].count, 10);
      console.log('Successfully fetched total products from catalog:', total);
      return total;
    } catch (error) {
      console.error('Ошибка в getTotalProducts:', error);
      throw new Error('Failed to fetch total products from catalog');
    }
  }
}