/**
 * 🏗️ Cart Infrastructure - Mapper
 * 
 * Инфраструктурный слой для маппинга данных
 */

import { Cart, ProductCart } from '../ports/cart.port';

/**
 * Маппер для преобразования данных корзины
 */
export class CartMapper {
    /**
     * Преобразовать данные из БД в доменную модель
     */
    static mapFromDatabase(dbCart: any): Cart {
        const products: { [productId: number]: ProductCart } = {};
        
        if (dbCart.rows && dbCart.rows.length > 0) {
            dbCart.rows.forEach((row: any) => {
                products[row.item_id] = {
                    id: row.item_id,
                    qty: row.quantity
                };
            });
        }

        return {
            total: 0, // Будет рассчитано позже
            products
        };
    }

    /**
     * Преобразовать доменную модель в данные для БД
     */
    static mapToDatabase(cart: Cart): any[] {
        const dbData: any[] = [];
        
        for (const [productId, product] of Object.entries(cart.products)) {
            dbData.push({
                item_id: product.id,
                quantity: product.qty
            });
        }

        return dbData;
    }

    /**
     * Преобразовать данные из Redis в доменную модель
     */
    static mapFromRedis(redisData: string): Cart {
        try {
            return JSON.parse(redisData) as Cart;
        } catch (error) {
            return { total: 0, products: {} };
        }
    }

    /**
     * Преобразовать доменную модель в данные для Redis
     */
    static mapToRedis(cart: Cart): string {
        return JSON.stringify(cart);
    }

    /**
     * Создать пустую корзину
     */
    static createEmptyCart(): Cart {
        return {
            total: 0,
            products: {}
        };
    }

    /**
     * Проверить, пуста ли корзина
     */
    static isEmpty(cart: Cart): boolean {
        return Object.keys(cart.products).length === 0;
    }

    /**
     * Получить количество товаров в корзине
     */
    static getItemCount(cart: Cart): number {
        return Object.keys(cart.products).length;
    }

    /**
     * Получить общее количество единиц товаров
     */
    static getTotalQuantity(cart: Cart): number {
        let total = 0;
        for (const product of Object.values(cart.products)) {
            total += product.qty;
        }
        return total;
    }
} 