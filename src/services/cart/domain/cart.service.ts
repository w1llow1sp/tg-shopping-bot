/**
 * 🏗️ Cart Service - Domain Logic
 * 
 * Сервис использует репозиторий (доменную логику)
 * Содержит бизнес-логику высокого уровня
 */

import { Bot } from 'grammy';
import { ICartService, ICartRepository } from '../ports/cart.port';
import { CartRepository } from '../adapters/cart.repository';
import { CartView } from '../adapters/cart.view';
import { BaseService } from '../../../shared/base.service';
import { Logger } from '../../../shared/logger';
import { pool } from '../../../db/pg';
import { RedisConn, ensureConnection } from '../../../db/redis';

export class CartService extends BaseService implements ICartService {
    public readonly name = 'CartService';
    private cartRepository: ICartRepository;
    private cartView: CartView;

    constructor() {
        super();
        this.cartRepository = new CartRepository(pool, RedisConn);
        this.cartView = new CartView(this);
    }

    async getCart(userId: number): Promise<any> {
        return await this.cartRepository.getCart(userId);
    }

    async addToCart(userId: number, productId: number, quantity: number): Promise<any> {
        return await this.cartRepository.addItem(userId, productId, quantity);
    }

    async removeFromCart(userId: number, productId: number): Promise<any> {
        return await this.cartRepository.removeItem(userId, productId);
    }

    async updateQuantity(userId: number, productId: number, quantity: number): Promise<any> {
        return await this.cartRepository.updateItemQuantity(userId, productId, quantity);
    }

    async clearCart(userId: number): Promise<any> {
        return await this.cartRepository.clearCart(userId);
    }

    async getTotalPrice(userId: number): Promise<number> {
        const cart = await this.cartRepository.getCart(userId);
        return await this.cartRepository.calculateTotal(cart);
    }

    protected async registerHandlers(): Promise<void> {
        const bot = this.getBot();
        
        // Регистрируем обработчики для корзины
        bot.callbackQuery(/^cart:/, this.handleCartCallback.bind(this));
        
        this.logger.info('Cart service handlers registered');
    }

    private async handleCartCallback(ctx: any): Promise<void> {
        try {
            const callbackData = ctx.callbackQuery?.data;
            this.logger.info('Cart callback triggered', { callbackData });
            
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.answerCallbackQuery({
                    text: '❌ Ошибка: не удалось определить пользователя',
                    show_alert: true,
                });
                return;
            }
            
            const response = await this.cartView.renderCartForUser(userId);
            
            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });
            
            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error handling cart callback', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при обработке корзины',
                show_alert: true,
            });
        }
    }
} 