/**
 * 🎨 Cart View - Primary Adapter
 * 
 * Адаптер для отображения корзины в Telegram
 * Реализует ICartView
 */

import { InlineKeyboard } from 'grammy';
import { ICartView, Cart, IProductRepository } from '../ports/cart.port';

export type CartResponse = {
    text: string;
    reply_markup: InlineKeyboard;
};

export class CartView implements ICartView {
    private productRepository: IProductRepository;

    constructor(productRepository: IProductRepository) {
        this.productRepository = productRepository;
    }

    /**
     * Отобразить корзину пользователя
     */
    async renderCart(cart: Cart): Promise<CartResponse> {
        if (!cart || Object.keys(cart.products).length === 0) {
            const keyboard = new InlineKeyboard()
                .text('🏠 На главную', 'main')
                .text('📋 Каталог', 'catalog:1');
            
            return {
                text: '🧺 Ваша корзина пуста',
                reply_markup: keyboard
            };
        }

        let text = '🧺 <b>Ваша корзина:</b>\n\n';
        const keyboard = new InlineKeyboard();

        // Добавляем товары в корзину
        for (const product of Object.values(cart.products)) {
            const productDetail = await this.productRepository.getProduct(product.id);
            const productName = this.escapeHTML(productDetail.name);
            const itemTotal = product.qty * productDetail.price;
            
            // Название товара
            text += `📦 <b>${productName}</b>\n`;
            
            // Красивое описание товара с расчетом
            text += `   📊 <b>Количество:</b> ${product.qty} шт.\n`;
            text += `   💰 <b>Цена за шт:</b> ${productDetail.price} ₽\n`;
            text += `   🧮 <b>Сумма:</b> ${itemTotal} ₽\n\n`;
            
            // Кнопки управления товаром
            keyboard
                .text(`${productName}`, `product:${product.id}`).row()
                .text('❌', `cart:del:${product.id}`)
                .text('➖', `cart:dec:${product.id}`)
                .text('➕', `cart:inc:${product.id}`)
                .row();
        }

        // Красивая итоговая сумма
        text += `\n${'─'.repeat(30)}\n`;
        text += `💰 <b>ИТОГО К ОПЛАТЕ: ${cart.total} ₽</b>\n`;
        text += `📦 <b>Товаров в корзине: ${Object.keys(cart.products).length}</b>`;

        // Кнопки навигации
        keyboard
            .text('🏠 На главную', 'main')
            .text('📋 Каталог', 'catalog:1')
            .row()
            .text('💳 Оформить заказ', 'order:create');

        return {
            text,
            reply_markup: keyboard
        };
    }

    /**
     * Отобразить сообщение об успешном добавлении
     */
    renderAddSuccess(productName: string): CartResponse {
        const keyboard = new InlineKeyboard()
            .text('🧺 В корзину', 'cart')
            .text('📋 Каталог', 'catalog:1')
            .row()
            .text('🏠 На главную', 'main');

        return {
            text: `✅ <b>${this.escapeHTML(productName)}</b> добавлен в корзину!`,
            reply_markup: keyboard
        };
    }

    /**
     * Отобразить сообщение об ошибке
     */
    renderError(message: string): CartResponse {
        const keyboard = new InlineKeyboard()
            .text('🏠 На главную', 'main')
            .text('📋 Каталог', 'catalog:1');

        return {
            text: `❌ <b>Ошибка:</b> ${this.escapeHTML(message)}`,
            reply_markup: keyboard
        };
    }

    /**
     * Отобразить сообщение об успешном удалении
     */
    renderRemoveSuccess(productName: string): any {
        return {
            text: `🗑️ **Товар удален из корзины!**\n\n📦 **${productName}**\n\nТовар был успешно удален из вашей корзины.`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🛒 Корзина', callback_data: 'cart' },
                        { text: '📋 Каталог', callback_data: 'catalog:1' }
                    ],
                    [
                        { text: '🏠 Главное меню', callback_data: 'menu' }
                    ]
                ]
            }
        };
    }

    /**
     * Отобразить сообщение об успешном изменении количества
     */
    renderQuantityUpdateSuccess(productName: string, quantity: number): any {
        return {
            text: `✅ **Количество обновлено!**\n\n📦 **${productName}**\n📦 **Количество: ${quantity}**\n\nКоличество товара было успешно изменено.`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🛒 Корзина', callback_data: 'cart' },
                        { text: '📋 Каталог', callback_data: 'catalog:1' }
                    ],
                    [
                        { text: '🏠 Главное меню', callback_data: 'menu' }
                    ]
                ]
            }
        };
    }

    /**
     * Отобразить сообщение об успешной очистке корзины
     */
    renderClearSuccess(): any {
        return {
            text: `🗑️ **Корзина очищена!**\n\nВаша корзина была успешно очищена.\n\nДобавьте новые товары из каталога!`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📋 Каталог', callback_data: 'catalog:1' },
                        { text: '🏠 Главное меню', callback_data: 'menu' }
                    ]
                ]
            }
        };
    }



    /**
     * Экранирование HTML для безопасного отображения
     */
    private escapeHTML(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
} 