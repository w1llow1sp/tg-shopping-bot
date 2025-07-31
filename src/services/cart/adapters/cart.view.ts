/**
 * 🎨 Cart View Adapter
 * 
 * View использует только сервис
 * Реализация порта ICartView для отображения корзины в Telegram
 */

import { InlineKeyboard } from 'grammy';
import { ICartView, Cart, ICartService } from '../ports/cart.port';

export class CartView implements ICartView {
    private readonly cartService: ICartService;

    constructor(cartService: ICartService) {
        this.cartService = cartService;
    }

    /**
     * Отобразить корзину пользователя
     */
    async renderCart(cart: Cart): Promise<any> {
        if (!cart || Object.keys(cart.products).length === 0) {
            return {
                text: '🛒 Ваша корзина пуста\n\nДобавьте товары из каталога!',
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

        let text = '🛒 **Ваша корзина:**\n\n';
        
        // Отображаем товары
        for (const [productId, product] of Object.entries(cart.products)) {
            text += `• **Товар ID: ${productId}**\n`;
            text += `  📦 Количество: ${product.qty}\n\n`;
        }

        text += `\n💰 **Общая сумма: ${cart.total} ₽**\n`;
        text += `📦 **Товаров: ${Object.keys(cart.products).length}**\n\n`;

        const keyboard: any = {
            inline_keyboard: []
        };

        // Кнопки для каждого товара
        for (const [productId, product] of Object.entries(cart.products)) {
            keyboard.inline_keyboard.push([
                { 
                    text: `➖ Товар ${productId}`, 
                    callback_data: `cart:dec:${productId}` 
                },
                { 
                    text: `➕ Товар ${productId}`, 
                    callback_data: `cart:inc:${productId}` 
                }
            ]);
            keyboard.inline_keyboard.push([
                { 
                    text: `🗑️ Удалить товар ${productId}`, 
                    callback_data: `cart:del:${productId}` 
                }
            ]);
        }

        // Основные кнопки
        keyboard.inline_keyboard.push([
            { text: '📋 Каталог', callback_data: 'catalog:1' },
            { text: '🗑️ Очистить корзину', callback_data: 'cart:clear' }
        ]);
        keyboard.inline_keyboard.push([
            { text: '📋 Оформить заказ', callback_data: 'order:create' },
            { text: '🏠 Главное меню', callback_data: 'menu' }
        ]);

        return {
            text,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        };
    }

    /**
     * Отобразить сообщение об успешном добавлении
     */
    renderAddSuccess(productName: string): any {
        return {
            text: `✅ **Товар добавлен в корзину!**\n\n📦 **${productName}**\n\nТеперь вы можете:\n• Просмотреть корзину\n• Продолжить покупки\n• Оформить заказ`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🛒 Корзина', callback_data: 'cart' },
                        { text: '📋 Каталог', callback_data: 'catalog:1' }
                    ],
                    [
                        { text: '📋 Оформить заказ', callback_data: 'order:create' },
                        { text: '🏠 Главное меню', callback_data: 'menu' }
                    ]
                ]
            }
        };
    }

    /**
     * Отобразить сообщение об ошибке
     */
    renderError(message: string): any {
        return {
            text: `❌ **Ошибка:** ${message}\n\nПопробуйте еще раз или обратитесь к администратору.`,
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
     * Отобразить корзину для пользователя (использует сервис)
     */
    async renderCartForUser(userId: number): Promise<any> {
        try {
            const cart = await this.cartService.getCart(userId);
            return await this.renderCart(cart);
        } catch (error) {
            return this.renderError('Не удалось загрузить корзину');
        }
    }
} 