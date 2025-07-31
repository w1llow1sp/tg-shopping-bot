/**
 * 🎨 Catalog Item Component
 * 
 * Компонент для отображения карточки товара
 * Отдельный компонент для лучшей организации кода
 */

import { InlineKeyboard } from 'grammy';
import { Product } from '../ports/catalog.port';

export type CatalogItemResponse =
  | { text: string; reply_markup: InlineKeyboard }
  | { photo: string; caption: string; reply_markup: InlineKeyboard };

export class CatalogItem {
    private static readonly PLACEHOLDER_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/9/9a/%D0%9D%D0%B5%D1%82_%D1%84%D0%BE%D1%82%D0%BE.png';
    private static readonly LOW_STOCK_THRESHOLD = 5;

    private escapeHTML(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Отобразить карточку товара
     */
    renderProduct(
        product: Product,
        prevProductId: number | null = null,
        nextProductId: number | null = null,
        backCallback?: string,
        isAdded: boolean = false,
    ): CatalogItemResponse {
        const keyboard = new InlineKeyboard();

        console.log('Building keyboard for product:', product.id, 'itemsavailable:', product.itemsavailable);

        // 1. Первый ряд - кнопка добавления в корзину или уведомления
        if (product.itemsavailable === 0) {
            console.log('Adding notify stock button');
            keyboard.text('🔔 Уведомить о поступлении', `notify:stock:subscribe:${product.id}`).row();
        } else {
            if (isAdded) {
                console.log('Adding "in cart" button');
                keyboard.text('✅ В корзине', 'cart').row();
            } else {
                console.log('Adding "add to cart" button');
                keyboard.text('🛒 Добавить в корзину', `cart:add:${product.id}`).row();
            }
        }

        // 2. Второй ряд - навигация по каталогу
        if (prevProductId || nextProductId) {
            console.log('Adding navigation buttons, prev:', prevProductId, 'next:', nextProductId);
            keyboard
                .text(prevProductId ? '<<' : ' ', prevProductId ? `product:${prevProductId}` : 'noop')
                .text(nextProductId ? '>>' : ' ', nextProductId ? `product:${nextProductId}` : 'noop')
                .row();
        } else {
            console.log('No navigation buttons needed');
        }

        // 3. Третий ряд - навигация (БЕЗ .row() в конце!)
        console.log('Adding main navigation buttons');
        keyboard
            .text('🏠 На главную', 'main')
            .text('🛒 В корзину', 'cart'); // НЕ добавляем .row() здесь!

        // Формируем описание товара
        const name = this.escapeHTML(product.name || '');
        const description = this.escapeHTML(product.description || 'Нет описания');
        const price = this.escapeHTML(product.price?.toString() || '0');
        const itemsavailable = product.itemsavailable || 0;

        // Добавляем смайлики и жирный текст в описание
        let stockStatus = '';
        if (itemsavailable === 0) {
            stockStatus = '❌ <b>Нет в наличии</b>';
        } else if (itemsavailable <= CatalogItem.LOW_STOCK_THRESHOLD) {
            stockStatus = `⚠️ <b>Осталось всего ${itemsavailable} шт!</b>`;
        } else {
            stockStatus = `✅ <b>В наличии: ${itemsavailable} шт</b>`;
        }

        const caption = `🎯 <b>${name}</b>\n\n` +
            `📝 <b>Описание:</b>\n${description}\n\n` +
            `💰 <b>Цена:</b> ${price} ₽\n` +
            `📦 ${stockStatus}`;

        console.log('Product caption/text:', caption);
        console.log('Caption length (bytes):', Buffer.byteLength(caption, 'utf8'));

        // Проверяем валидность изображения
        const isValidImageUrl = product.image && /^https?:\/\/.*\.(jpg|jpeg|png|gif)$/i.test(product.image);

        if (isValidImageUrl) {
            return {
                photo: product.image,
                caption,
                reply_markup: keyboard,
            };
        }

        console.warn('Invalid or missing image URL, using placeholder:', product.image);
        return {
            photo: CatalogItem.PLACEHOLDER_IMAGE_URL,
            caption,
            reply_markup: keyboard,
        };
    }

    /**
     * Отобразить сообщение об ошибке товара
     */
    renderErrorMessage(): string {
        return 'Произошла ошибка при загрузке товара. Попробуйте позже.';
    }
} 