import { Pool } from 'pg';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  itemsavailable: number;
}

export class CatalogRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getProducts(limit: number, offset: number): Promise<Product[]> {
    const sql = 'SELECT id, name, description, price, image, itemsavailable FROM catalog ORDER BY id LIMIT $1 OFFSET $2';
    try {
      const products = await this.pool.query<Product>(sql, [limit, offset]);
      console.log('Successfully fetched products from catalog:', products.rows);
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
    const sql = 'SELECT id, name, description, price, image, itemsavailable FROM catalog WHERE id = $1';
    try {
      const products = await this.pool.query<Product>(sql, [productId]);
      console.log('Successfully fetched product detail:', products.rows[0]);
      if (products.rows.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      return products.rows[0];
    } catch (error) {
      console.error('Ошибка в getProductDetail:', error);
      throw error;
    }
  }

  async getNeighborProducts(productId: number): Promise<{ prevId: number | null; nextId: number | null }> {
    try {
      const [prevResult, nextResult] = await Promise.all([
        // Находим предыдущий товар (меньший ID)
        this.pool.query<{ id: number }>(
          'SELECT id FROM catalog WHERE id < $1 ORDER BY id DESC LIMIT 1',
          [productId],
        ),
        // Находим следующий товар (больший ID)
        this.pool.query<{ id: number }>(
          'SELECT id FROM catalog WHERE id > $1 ORDER BY id ASC LIMIT 1',
          [productId],
        ),
      ]);

      return {
        prevId: prevResult.rows.length > 0 ? prevResult.rows[0].id : null,
        nextId: nextResult.rows.length > 0 ? nextResult.rows[0].id : null,
      };
    } catch (error) {
      console.error('Ошибка в getNeighborProducts:', error);
      throw new Error('Failed to fetch neighbor products');
    }
  }
}