/**
 * 🏗️ Cart Service - Domain Logic
 * 
 * Доменный сервис корзины
 * Содержит бизнес-логику высокого уровня
 */

import { ICartService, ICartRepository, ICartView, Cart, CartConfig, CartError, CartErrorType } from '../ports/cart.port';
import { BaseService } from '../../../shared/base.service';
import { Logger } from '../../../shared/logger';

export class CartService extends BaseService implements ICartService {
    public readonly name = 'CartService';
    private cartRepository: ICartRepository;
    private cartView: ICartView;
    private productRepository: any;

    constructor(cartRepository: ICartRepository, cartView: ICartView, productRepository: any) {
        super();
        this.cartRepository = cartRepository;
        this.cartView = cartView;
        this.productRepository = productRepository;
        console.log('🔧 CartService initialized');
    }

    /**
     * Получить корзину пользователя
     */
    async getCart(userId: number): Promise<Cart> {
        try {
            const cart = await this.cartRepository.getCart(userId);
            cart.total = await this.cartRepository.calculateTotal(cart);
            return cart;
        } catch (error) {
            this.logger.error('Error getting cart', error as Error);
            throw new CartError(
                'Не удалось получить корзину',
                CartErrorType.DATABASE_ERROR,
                userId
            );
        }
    }

    /**
     * Добавить товар в корзину
     */
    async addToCart(userId: number, productId: number, quantity: number): Promise<Cart> {
        try {
            // Проверяем валидность количества
            if (quantity <= 0 || quantity > CartConfig.MAX_QUANTITY) {
                throw new CartError(
                    `Количество должно быть от 1 до ${CartConfig.MAX_QUANTITY}`,
                    CartErrorType.INVALID_QUANTITY,
                    userId,
                    productId
                );
            }

            // Получаем информацию о товаре для проверки доступности
            const product = await this.productRepository.getProduct(productId);

            // Получаем текущую корзину
            const cart = await this.cartRepository.getCart(userId);
            
            // Проверяем, есть ли уже товар в корзине
            if (cart.products[productId]) {
                const newQuantity = cart.products[productId].qty + quantity;
                
                // Проверяем доступность в базе данных
                if (newQuantity > product.itemsavailable) {
                    throw new CartError(
                        `Недостаточно товара на складе. Доступно: ${product.itemsavailable} шт.`,
                        CartErrorType.INVALID_QUANTITY,
                        userId,
                        productId
                    );
                }
                
                if (newQuantity > CartConfig.MAX_QUANTITY) {
                    throw new CartError(
                        `Максимальное количество товара: ${CartConfig.MAX_QUANTITY}`,
                        CartErrorType.INVALID_QUANTITY,
                        userId,
                        productId
                    );
                }
                
                await this.cartRepository.updateItemQuantity(userId, productId, newQuantity);
            } else {
                // Проверяем доступность для нового товара
                if (quantity > product.itemsavailable) {
                    throw new CartError(
                        `Недостаточно товара на складе. Доступно: ${product.itemsavailable} шт.`,
                        CartErrorType.INVALID_QUANTITY,
                        userId,
                        productId
                    );
                }
                
                await this.cartRepository.addItem(userId, productId, quantity);
            }

            // Возвращаем обновленную корзину
            return await this.getCart(userId);
        } catch (error) {
            this.logger.error('Error adding to cart', error as Error);
            if (error instanceof CartError) {
                throw error;
            }
            throw new CartError(
                'Не удалось добавить товар в корзину',
                CartErrorType.DATABASE_ERROR,
                userId,
                productId
            );
        }
    }

    /**
     * Удалить товар из корзины
     */
    async removeFromCart(userId: number, productId: number): Promise<Cart> {
        try {
            await this.cartRepository.removeItem(userId, productId);
            return await this.getCart(userId);
        } catch (error) {
            this.logger.error('Error removing from cart', error as Error);
            throw new CartError(
                'Не удалось удалить товар из корзины',
                CartErrorType.DATABASE_ERROR,
                userId,
                productId
            );
        }
    }

    /**
     * Изменить количество товара
     */
    async updateQuantity(userId: number, productId: number, quantity: number): Promise<Cart> {
        try {
            if (quantity < 0) {
                throw new CartError(
                    'Количество не может быть отрицательным',
                    CartErrorType.INVALID_QUANTITY,
                    userId,
                    productId
                );
            }

            if (quantity > CartConfig.MAX_QUANTITY) {
                throw new CartError(
                    `Максимальное количество товара: ${CartConfig.MAX_QUANTITY}`,
                    CartErrorType.INVALID_QUANTITY,
                    userId,
                    productId
                );
            }

            await this.cartRepository.updateItemQuantity(userId, productId, quantity);
            return await this.getCart(userId);
        } catch (error) {
            this.logger.error('Error updating quantity', error as Error);
            if (error instanceof CartError) {
                throw error;
            }
            throw new CartError(
                'Не удалось изменить количество товара',
                CartErrorType.DATABASE_ERROR,
                userId,
                productId
            );
        }
    }

    /**
     * Очистить корзину
     */
    async clearCart(userId: number): Promise<void> {
        try {
            await this.cartRepository.clearCart(userId);
        } catch (error) {
            this.logger.error('Error clearing cart', error as Error);
            throw new CartError(
                'Не удалось очистить корзину',
                CartErrorType.DATABASE_ERROR,
                userId
            );
        }
    }

    /**
     * Получить общую стоимость корзины
     */
    async getTotalPrice(userId: number): Promise<number> {
        try {
            const cart = await this.getCart(userId);
            return cart.total;
        } catch (error) {
            this.logger.error('Error getting total price', error as Error);
            return 0;
        }
    }

    /**
     * Увеличить количество товара
     */
    async increaseQuantity(userId: number, productId: number): Promise<Cart> {
        try {
            // Получаем информацию о товаре для проверки доступности
            const product = await this.productRepository.getProduct(productId);
            
            const cart = await this.getCart(userId);
            const currentQuantity = cart.products[productId]?.qty || 0;
            const newQuantity = currentQuantity + 1;
            
            // Проверяем доступность в базе данных
            if (newQuantity > product.itemsavailable) {
                throw new CartError(
                    `Недостаточно товара на складе. Доступно: ${product.itemsavailable} шт.`,
                    CartErrorType.INVALID_QUANTITY,
                    userId,
                    productId
                );
            }
            
            return await this.updateQuantity(userId, productId, newQuantity);
        } catch (error) {
            this.logger.error('Error increasing quantity', error as Error);
            if (error instanceof CartError) {
                throw error;
            }
            throw new CartError(
                'Не удалось увеличить количество товара',
                CartErrorType.DATABASE_ERROR,
                userId,
                productId
            );
        }
    }

    /**
     * Уменьшить количество товара
     */
    async decreaseQuantity(userId: number, productId: number): Promise<Cart> {
        const cart = await this.getCart(userId);
        const currentQuantity = cart.products[productId]?.qty || 0;
        
        if (currentQuantity <= 1) {
            return await this.removeFromCart(userId, productId);
        }
        
        return await this.updateQuantity(userId, productId, currentQuantity - 1);
    }

    /**
     * Получить представление корзины
     */
    getView(): ICartView {
        return this.cartView;
    }

    /**
     * Регистрация обработчиков Telegram
     */
    protected async registerHandlers(): Promise<void> {
        const bot = this.getBot();
        
        // Обработчики для корзины
        bot.callbackQuery(/^cart$/, this.handleCart.bind(this));
        bot.callbackQuery(/^cart:add:(\d+)$/, this.handleAddToCart.bind(this));
        bot.callbackQuery(/^cart:del:(\d+)$/, this.handleRemoveFromCart.bind(this));
        bot.callbackQuery(/^cart:inc:(\d+)$/, this.handleIncreaseQuantity.bind(this));
        bot.callbackQuery(/^cart:dec:(\d+)$/, this.handleDecreaseQuantity.bind(this));
        
        this.logger.info('Cart service handlers registered');
    }

    /**
     * Обработчик открытия корзины
     */
    private async handleCart(ctx: any): Promise<void> {
        try {
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.answerCallbackQuery({
                    text: '❌ Ошибка: неверный пользователь',
                    show_alert: true,
                });
                return;
            }

            const cart = await this.getCart(userId);
            const response = await this.cartView.renderCart(cart);

            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });

            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error handling cart', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при открытии корзины',
                show_alert: true,
            });
        }
    }

    /**
     * Обработчик добавления в корзину
     */
    private async handleAddToCart(ctx: any): Promise<void> {
        try {
            const userId = ctx.from?.id;
            const productId = parseInt(ctx.callbackQuery.data.match(/cart:add:(\d+)/)[1]);
            
            if (!userId || !productId) {
                await ctx.answerCallbackQuery({
                    text: '❌ Ошибка: неверный пользователь или продукт',
                    show_alert: true,
                });
                return;
            }

            await this.addToCart(userId, productId, 1);

            // Только уведомляем об успешном добавлении, не перебрасываем в корзину
            await ctx.answerCallbackQuery({
                text: '✅ Товар добавлен в корзину!',
                show_alert: true,
            });
        } catch (error) {
            this.logger.error('Error adding to cart', error as Error);
            
            // Показываем конкретную ошибку пользователю
            const errorMessage = error instanceof Error ? error.message : '❌ Ошибка при добавлении в корзину';
            await ctx.answerCallbackQuery({
                text: errorMessage,
                show_alert: true,
            });
        }
    }

    /**
     * Обработчик удаления из корзины
     */
    private async handleRemoveFromCart(ctx: any): Promise<void> {
        try {
            const userId = ctx.from?.id;
            const productId = parseInt(ctx.callbackQuery.data.match(/cart:del:(\d+)/)[1]);
            
            if (!userId || !productId) {
                await ctx.answerCallbackQuery({
                    text: '❌ Ошибка: неверный пользователь или продукт',
                    show_alert: true,
                });
                return;
            }

            const cart = await this.removeFromCart(userId, productId);
            const response = await this.cartView.renderCart(cart);

            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });

            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error removing from cart', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при удалении из корзины',
                show_alert: true,
            });
        }
    }

    /**
     * Обработчик увеличения количества
     */
    private async handleIncreaseQuantity(ctx: any): Promise<void> {
        try {
            const userId = ctx.from?.id;
            const productId = parseInt(ctx.callbackQuery.data.match(/cart:inc:(\d+)/)[1]);
            
            if (!userId || !productId) {
                await ctx.answerCallbackQuery({
                    text: '❌ Ошибка: неверный пользователь или продукт',
                    show_alert: true,
                });
                return;
            }

            const cart = await this.increaseQuantity(userId, productId);
            const response = await this.cartView.renderCart(cart);

            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });

            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error increasing quantity', error as Error);
            
            // Показываем конкретную ошибку пользователю
            const errorMessage = error instanceof Error ? error.message : '❌ Ошибка при изменении количества';
            await ctx.answerCallbackQuery({
                text: errorMessage,
                show_alert: true,
            });
        }
    }

    /**
     * Обработчик уменьшения количества
     */
    private async handleDecreaseQuantity(ctx: any): Promise<void> {
        try {
            const userId = ctx.from?.id;
            const productId = parseInt(ctx.callbackQuery.data.match(/cart:dec:(\d+)/)[1]);
            
            if (!userId || !productId) {
                await ctx.answerCallbackQuery({
                    text: '❌ Ошибка: неверный пользователь или продукт',
                    show_alert: true,
                });
                return;
            }

            const cart = await this.decreaseQuantity(userId, productId);
            const response = await this.cartView.renderCart(cart);

            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });

            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error decreasing quantity', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при изменении количества',
                show_alert: true,
            });
        }
    }
} 