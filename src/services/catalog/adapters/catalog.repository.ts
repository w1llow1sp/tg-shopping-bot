/**
 * 🔌 Catalog Repository Adapter (ДОМЕННАЯ ЛОГИКА - САМЫЙ ВАЖНЫЙ!)
 * 
 * Реализация порта ICatalogRepository для работы с PostgreSQL
 * Содержит всю доменную логику каталога
 */

import { Pool } from 'pg';
import { 
    ICatalogRepository, 
    Product, 
    CatalogQueries,
    CatalogError,
    CatalogErrorType,
    CatalogErrorMessages
} from '../ports/catalog.port';
import { Logger } from '../../../shared/logger';

export class CatalogRepository implements ICatalogRepository {
    private readonly pool: Pool;
    private readonly logger: Logger;

    constructor(pool: Pool) {
        this.pool = pool;
        this.logger = Logger.getInstance();
    }

    /**
     * Получить список товаров с пагинацией (доменная логика)
     */
    async getProducts(limit: number, offset: number): Promise<Product[]> {
        try {
            // Валидация параметров (доменная логика)
            if (limit <= 0) {
                throw new CatalogError(
                    CatalogErrorMessages.INVALID_LIMIT,
                    CatalogErrorType.VALIDATION_ERROR
                );
            }
            if (offset < 0) {
                throw new CatalogError(
                    CatalogErrorMessages.INVALID_OFFSET,
                    CatalogErrorType.VALIDATION_ERROR
                );
            }

            const result = await this.pool.query<Product>(CatalogQueries.GET_PRODUCTS, [limit, offset]);
            
            this.logger.info('Products retrieved successfully', { 
                count: result.rows.length, 
                limit, 
                offset 
            });
            
            return result.rows;
        } catch (error) {
            this.logger.error('Failed to get products', error as Error);
            if (error instanceof CatalogError) {
                throw error;
            }
            throw new CatalogError(
                CatalogErrorMessages.FETCH_PRODUCTS_FAILED,
                CatalogErrorType.DATABASE_ERROR
            );
        }
    }

    /**
     * Получить общее количество товаров (доменная логика)
     */
    async getTotalProducts(): Promise<number> {
        try {
            const result = await this.pool.query<{ count: string }>(CatalogQueries.GET_TOTAL_PRODUCTS);
            const count = result.rows[0]?.count ? parseInt(result.rows[0].count, 10) : 0;
            
            this.logger.info('Total products count retrieved', { count });
            
            return count;
        } catch (error) {
            this.logger.error('Failed to get total products count', error as Error);
            throw new CatalogError(
                CatalogErrorMessages.FETCH_TOTAL_PRODUCTS_FAILED,
                CatalogErrorType.DATABASE_ERROR
            );
        }
    }

    /**
     * Получить детальную информацию о товаре (доменная логика)
     */
    async getProductDetail(productId: number): Promise<Product> {
        try {
            // Валидация ID товара (доменная логика)
            if (productId <= 0) {
                throw new CatalogError(
                    CatalogErrorMessages.INVALID_PRODUCT_ID,
                    CatalogErrorType.VALIDATION_ERROR,
                    productId
                );
            }

            const result = await this.pool.query<Product>(CatalogQueries.GET_PRODUCT_DETAIL, [productId]);
            
            if (result.rows.length === 0) {
                throw new CatalogError(
                    `${CatalogErrorMessages.PRODUCT_NOT_FOUND}: ${productId}`,
                    CatalogErrorType.PRODUCT_NOT_FOUND,
                    productId
                );
            }

            const product = result.rows[0];
            
            this.logger.info('Product detail retrieved successfully', { 
                productId, 
                productName: product.name 
            });
            
            return product;
        } catch (error) {
            this.logger.error('Failed to get product detail', error as Error);
            if (error instanceof CatalogError) {
                throw error;
            }
            throw new CatalogError(
                CatalogErrorMessages.FETCH_PRODUCT_DETAIL_FAILED,
                CatalogErrorType.DATABASE_ERROR,
                productId
            );
        }
    }

    /**
     * Получить соседние товары (доменная логика)
     */
    async getNeighborProducts(productId: number): Promise<{ prevId: number | null; nextId: number | null }> {
        try {
            // Валидация ID товара (доменная логика)
            if (productId <= 0) {
                throw new CatalogError(
                    CatalogErrorMessages.INVALID_PRODUCT_ID,
                    CatalogErrorType.VALIDATION_ERROR,
                    productId
                );
            }

            const [prevResult, nextResult] = await Promise.all([
                this.pool.query<{ id: number }>(CatalogQueries.GET_PREV_PRODUCT, [productId]),
                this.pool.query<{ id: number }>(CatalogQueries.GET_NEXT_PRODUCT, [productId]),
            ]);

            const neighbors = {
                prevId: prevResult.rows.length > 0 ? prevResult.rows[0].id : null,
                nextId: nextResult.rows.length > 0 ? nextResult.rows[0].id : null,
            };

            this.logger.info('Neighbor products retrieved successfully', { 
                productId, 
                prevId: neighbors.prevId, 
                nextId: neighbors.nextId 
            });

            return neighbors;
        } catch (error) {
            this.logger.error('Failed to get neighbor products', error as Error);
            if (error instanceof CatalogError) {
                throw error;
            }
            throw new CatalogError(
                CatalogErrorMessages.FETCH_NEIGHBOR_PRODUCTS_FAILED,
                CatalogErrorType.DATABASE_ERROR,
                productId
            );
        }
    }

    /**
     * Проверить существование товара (доменная логика)
     */
    async productExists(productId: number): Promise<boolean> {
        try {
            // Валидация ID товара (доменная логика)
            if (productId <= 0) {
                return false;
            }

            const result = await this.pool.query<{ exists: boolean }>(CatalogQueries.PRODUCT_EXISTS, [productId]);
            const exists = result.rows[0]?.exists || false;

            this.logger.debug('Product existence checked', { productId, exists });

            return exists;
        } catch (error) {
            this.logger.error('Failed to check product existence', error as Error);
            return false;
        }
    }

    /**
     * Получить товары по категории (доменная логика)
     */
    async getProductsByCategory(category: string): Promise<Product[]> {
        try {
            // Валидация параметров (доменная логика)
            if (!category || category.trim().length === 0) {
                throw new CatalogError(
                    'Некорректная категория',
                    CatalogErrorType.VALIDATION_ERROR
                );
            }

            this.logger.info('Getting products by category', { category });

            // TODO: Реализовать поиск по категории
            // Пока возвращаем пустой массив
            const products: Product[] = [];
            
            this.logger.info('Products by category retrieved successfully', { 
                category, 
                count: products.length
            });
            
            return products;
        } catch (error) {
            this.logger.error('Failed to get products by category', error as Error);
            if (error instanceof CatalogError) {
                throw error;
            }
            throw new CatalogError(
                'Не удалось получить товары по категории',
                CatalogErrorType.DATABASE_ERROR
            );
        }
    }

    /**
     * Поиск товаров по названию (доменная логика)
     */
    async searchProducts(query: string): Promise<Product[]> {
        try {
            // Валидация параметров (доменная логика)
            if (!query || query.trim().length === 0) {
                throw new CatalogError(
                    'Поисковый запрос не может быть пустым',
                    CatalogErrorType.VALIDATION_ERROR
                );
            }

            this.logger.info('Searching products', { query });

            // TODO: Реализовать поиск товаров
            // Пока возвращаем пустой массив
            const products: Product[] = [];
            
            this.logger.info('Products search completed successfully', { 
                query, 
                count: products.length
            });
            
            return products;
        } catch (error) {
            this.logger.error('Failed to search products', error as Error);
            if (error instanceof CatalogError) {
                throw error;
            }
            throw new CatalogError(
                'Не удалось выполнить поиск товаров',
                CatalogErrorType.DATABASE_ERROR
            );
        }
    }
} 