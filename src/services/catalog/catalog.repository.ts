import { Pool } from 'pg';
import { ErrorMessages, SQL_QUERIES } from './catalog.dictionaries';

// Интерфейс для описания структуры товара в каталоге
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  itemsavailable: number;
}

/**
 * Репозиторий для менеджемента продуктов в каталоге в PostgreSQL
 */

export class CatalogRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Получение списка товаров с пагинацией
   * @param limit -- Количество товаров на странице;
   * @param offset -- Смещение для пагинации
   *
   * @returns Массив товаров
   */
  async getProducts(limit: number, offset: number): Promise<Product[]> {
    try {
      const products = await this.pool.query<Product>(
        SQL_QUERIES.GET_PRODUCTS,
        [limit, offset],
      );
      console.log('Успешно получены товары из каталога:', products.rows);
      return products.rows;
    } catch (error) {
      console.error('Ошибка в getProducts:', error);
      throw new Error(ErrorMessages.FETCH_PRODUCTS_FAILED);
    }
  }

  /**
   * Получение общего количества товаров в каталоге
   *  @returns Общее количество товаров
   */
  async getTotalProducts(): Promise<number> {
    try {
      const result = await this.pool.query<{ count: string }>(SQL_QUERIES.GET_TOTAL_PRODUCTS);
      const total = parseInt(result.rows[0].count, 10);
      console.log('Успешно получено общее количество товаров:', total);
      return total;
    } catch (error) {
      console.error('Ошибка в getTotalProducts:', error);
      throw new Error(ErrorMessages.FETCH_TOTAL_PRODUCTS_FAILED);
    }
  }

  /**
   * Получение детальной информации о товаре по ID
   * @param productId : ID товара
   * @returns Объект товара
   * @throws Error, если товар не найден
   */
  async getProductDetail(productId: number): Promise<Product> {
    try {
      const products = await this.pool.query<Product>(SQL_QUERIES.GET_PRODUCT_DETAIL, [productId]);
      if (products.rows.length === 0) {
        console.warn(`Товар с ID ${productId} не найден`);
        throw new Error(`${ErrorMessages.PRODUCT_NOT_FOUND}: ${productId}`);
      }
      console.log('Успешно получены детали товара:', products.rows[0]);
      return products.rows[0];
    } catch (error) {
      console.error('Ошибка в getProductDetail:', error);
      throw error instanceof Error && error.message.includes(ErrorMessages.PRODUCT_NOT_FOUND)
        ? error
        : new Error(ErrorMessages.FETCH_PRODUCT_DETAIL_FAILED);
    }
  }

  /**
   *  Получение ID соседних товаров (предыдущего и следующего)
   * @param productId : ID текущего товара
   * @returns Объект с ID предыдущего и следующего товаров (или null, если их нет)
   */
  async getNeighborProducts(
    productId: number,
  ): Promise<{ prevId: number | null; nextId: number | null }> {
    try {
      const [prevResult, nextResult] = await Promise.all([
        this.pool.query<{ id: number }>(SQL_QUERIES.GET_PREV_PRODUCT, [productId]),
        this.pool.query<{ id: number }>(SQL_QUERIES.GET_NEXT_PRODUCT, [productId]),
      ]);
      const result = {
        prevId: prevResult.rows.length > 0 ? prevResult.rows[0].id : null,
        nextId: nextResult.rows.length > 0 ? nextResult.rows[0].id : null,
      };
      console.log('Успешно получены соседние товары:', result);
      return result;

    } catch (error) {
      console.error('Ошибка в getNeighborProducts:', error);
      throw new Error(ErrorMessages.FETCH_NEIGHBOR_PRODUCTS_FAILED);
    }
  }
}
