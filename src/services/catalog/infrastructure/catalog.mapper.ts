/**
 * 🏗️ Catalog Infrastructure - Mapper
 * 
 * Инфраструктурный слой для маппинга данных
 */

import { Product } from '../ports/catalog.port';

/**
 * Маппер для преобразования данных каталога
 */
export class CatalogMapper {
    /**
     * Преобразовать данные из БД в доменную модель
     */
    static mapFromDatabase(dbProduct: any): Product {
        return {
            id: dbProduct.id,
            name: dbProduct.name,
            description: dbProduct.description,
            price: dbProduct.price,
            image: dbProduct.image,
            itemsavailable: dbProduct.itemsavailable
        };
    }

    /**
     * Преобразовать массив данных из БД в доменные модели
     */
    static mapArrayFromDatabase(dbProducts: any[]): Product[] {
        return dbProducts.map(product => this.mapFromDatabase(product));
    }

    /**
     * Преобразовать доменную модель в данные для БД
     */
    static mapToDatabase(product: Product): any {
        return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.image,
            itemsavailable: product.itemsavailable
        };
    }

    /**
     * Преобразовать массив доменных моделей в данные для БД
     */
    static mapArrayToDatabase(products: Product[]): any[] {
        return products.map(product => this.mapToDatabase(product));
    }

    /**
     * Валидировать URL изображения
     */
    static isValidImageUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            
            // Проверяем протокол
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                return false;
            }
            
            // Проверяем домен
            if (!urlObj.hostname || urlObj.hostname.length === 0) {
                return false;
            }
            
            // Проверяем расширение файла
            const pathname = urlObj.pathname.toLowerCase();
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
            
            return hasValidExtension;
        } catch {
            return false;
        }
    }

    /**
     * Получить заглушку для изображения
     */
    static getPlaceholderImageUrl(): string {
        return 'https://upload.wikimedia.org/wikipedia/commons/9/9a/%D0%9D%D0%B5%D1%82_%D1%84%D0%BE%D1%82%D0%BE.png';
    }

    /**
     * Обработать изображение товара
     */
    static processProductImage(product: Product): Product {
        if (!product.image || !this.isValidImageUrl(product.image)) {
            return {
                ...product,
                image: this.getPlaceholderImageUrl()
            };
        }
        return product;
    }

    /**
     * Обработать массив товаров
     */
    static processProducts(products: Product[]): Product[] {
        return products.map(product => this.processProductImage(product));
    }

    /**
     * Создать краткое описание товара
     */
    static createShortDescription(description: string, maxLength: number = 100): string {
        if (description.length <= maxLength) {
            return description;
        }
        return description.substring(0, maxLength - 3) + '...';
    }

    /**
     * Форматировать цену
     */
    static formatPrice(price: number): string {
        return `${price} ₽`;
    }

    /**
     * Создать название товара для кнопки
     */
    static createProductButtonText(product: Product, maxLength: number = 30): string {
        const text = `${product.name} - ${this.formatPrice(product.price)}`;
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Создать описание товара для отображения
     */
    static createProductDisplayText(product: Product): string {
        const shortDescription = this.createShortDescription(product.description, 200);
        return `📦 ${product.name}\n\n${shortDescription}\n\n💰 Цена: ${this.formatPrice(product.price)}\n\n📦 В наличии: ${product.itemsavailable} шт.`;
    }

    /**
     * Проверить, доступен ли товар
     */
    static isProductAvailable(product: Product): boolean {
        return product.itemsavailable > 0;
    }

    /**
     * Получить статус доступности товара
     */
    static getAvailabilityStatus(product: Product): string {
        if (this.isProductAvailable(product)) {
            return `📦 В наличии: ${product.itemsavailable} шт.`;
        }
        return '❌ Нет в наличии';
    }
} 