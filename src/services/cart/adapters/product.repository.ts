/**
 * 📦 Product Repository - Secondary Adapter
 * 
 * Адаптер для работы с продуктами в контексте корзины
 * Реализует IProductRepository
 */

import { Pool } from 'pg';
import { IProductRepository, Product } from '../ports/cart.port';

export class ProductRepository implements IProductRepository {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Получить товар по ID
     */
    async getProduct(productId: number): Promise<Product> {
        try {
            const result = await this.pool.query(
                'SELECT id, name, price, description, image, itemsavailable FROM catalog WHERE id = $1',
                [productId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                price: row.price,
                description: row.description,
                imageUrl: row.image,
                available: row.itemsavailable > 0,
                itemsavailable: row.itemsavailable
            };
        } catch (error) {
            console.error('Error getting product:', error);
            throw error;
        }
    }

    /**
     * Проверить существование товара
     */
    async productExists(productId: number): Promise<boolean> {
        try {
            const result = await this.pool.query(
                'SELECT id FROM catalog WHERE id = $1',
                [productId]
            );
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error checking product existence:', error);
            return false;
        }
    }

    /**
     * Проверить доступность товара
     */
    async isProductAvailable(productId: number, quantity: number = 1): Promise<boolean> {
        try {
            const product = await this.getProduct(productId);
            return product.available && product.itemsavailable >= quantity;
        } catch (error) {
            console.error('Error checking product availability:', error);
            return false;
        }
    }
} 