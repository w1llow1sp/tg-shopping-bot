/**
 * 🏗️ Catalog Service - Domain Logic
 * 
 * Сервис использует репозиторий (доменную логику)
 * Содержит бизнес-логику высокого уровня
 */

import { Bot } from 'grammy';
import { ICatalogService, ICatalogRepository } from '../ports/catalog.port';
import { CatalogRepository } from '../adapters/catalog.repository';
import { CatalogView } from '../adapters/catalog.view';
import { BaseService } from '../../../shared/base.service';
import { Logger } from '../../../shared/logger';
import { pool } from '../../../db/pg';

export class CatalogService extends BaseService implements ICatalogService {
    public readonly name = 'CatalogService';
    private catalogRepository: ICatalogRepository;
    private catalogView: CatalogView;

    constructor() {
        super();
        this.catalogRepository = new CatalogRepository(pool);
        this.catalogView = new CatalogView(this, 4);
        console.log('🔧 CatalogService initialized with new features');
    }

    async getProducts(limit: number, offset: number): Promise<any[]> {
        return await this.catalogRepository.getProducts(limit, offset);
    }

    async getTotalProducts(): Promise<number> {
        return await this.catalogRepository.getTotalProducts();
    }

    async getProductDetail(productId: number): Promise<any> {
        return await this.catalogRepository.getProductDetail(productId);
    }

    async getNeighborProducts(productId: number): Promise<any> {
        return await this.catalogRepository.getNeighborProducts(productId);
    }

    async productExists(productId: number): Promise<boolean> {
        return await this.catalogRepository.productExists(productId);
    }

    async getCatalogPage(page: number, productsPerPage: number): Promise<any> {
        const offset = (page - 1) * productsPerPage;
        const products = await this.getProducts(productsPerPage, offset);
        const total = await this.getTotalProducts();
        return { products, total, page, productsPerPage };
    }

    async getProductsByCategory(category: string): Promise<any[]> {
        return await this.catalogRepository.getProductsByCategory(category);
    }

    async searchProducts(query: string): Promise<any[]> {
        return await this.catalogRepository.searchProducts(query);
    }

    async searchProductsWithPagination(query: string, page: number, productsPerPage: number): Promise<any> {
        const offset = (page - 1) * productsPerPage;
        const products = await this.catalogRepository.searchProducts(query);
        const total = products.length;
        const paginatedProducts = products.slice(offset, offset + productsPerPage);
        return { products: paginatedProducts, total, page, productsPerPage };
    }

    protected async registerHandlers(): Promise<void> {
        const bot = this.getBot();
        
        // Регистрируем обработчики для каталога
        bot.callbackQuery(/^catalog:/, this.handleCatalogCallback.bind(this));
        bot.callbackQuery(/^product:/, this.handleProductCallback.bind(this));
        bot.callbackQuery(/^cart:add:/, this.handleAddToCartCallback.bind(this));
        bot.callbackQuery(/^notify:stock/, this.handleNotifyStockCallback.bind(this));
        
        this.logger.info('Catalog service handlers registered with new callbacks');
        console.log('Registered callbacks: catalog:, product:, cart:add:, notify:stock');
    }

    private async handleCatalogCallback(ctx: any): Promise<void> {
        try {
            const callbackData = ctx.callbackQuery?.data;
            this.logger.info('Catalog callback triggered', { callbackData });
            
            // Парсим номер страницы из callback_data
            const pageMatch = callbackData?.match(/catalog:(\d+)/);
            const page = pageMatch ? parseInt(pageMatch[1], 10) : 1;
            
            const response = await this.catalogView.renderCatalogForUser(page, 4);
            
            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });
            
            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error handling catalog callback', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при обработке каталога',
                show_alert: true,
            });
        }
    }

    private async handleProductCallback(ctx: any): Promise<void> {
        try {
            const callbackData = ctx.callbackQuery?.data;
            console.log('🎯 Product callback triggered:', callbackData);
            this.logger.info('Product callback triggered', { callbackData });
            
            // Парсим ID товара из callback_data
            const productMatch = callbackData?.match(/product:(\d+)/);
            if (!productMatch) {
                await ctx.answerCallbackQuery({
                    text: '❌ Некорректный ID товара',
                    show_alert: true,
                });
                return;
            }
            
            const productId = parseInt(productMatch[1], 10);
            
            // Получаем детальную информацию о товаре и соседние товары
            const [product, neighbors] = await Promise.all([
                this.getProductDetail(productId),
                this.getNeighborProducts(productId),
            ]);
            
            console.log('🎯 Product details:', {
                id: product.id,
                name: product.name,
                itemsavailable: product.itemsavailable
            });
            
            console.log('🎯 Neighbors details:', {
                prevId: neighbors.prevId,
                nextId: neighbors.nextId,
                hasPrev: !!neighbors.prevId,
                hasNext: !!neighbors.nextId
            });
            
            // Проверяем, добавлен ли товар в корзину (пока всегда false)
            const isAdded = false; // TODO: Реализовать проверку корзины
            
            const response = await this.catalogView.renderProduct(product, neighbors, isAdded);
            
            // Если есть фото, отправляем фото с подписью
            if ('photo' in response) {
                console.log('📸 Sending photo with caption and keyboard');
                console.log('📸 Reply markup:', response.reply_markup?.inline_keyboard);
                
                try {
                    console.log('🔍 Sending to Telegram:', {
                        type: 'photo',
                        media: response.photo,
                        caption: response.caption,
                        parse_mode: 'HTML',
                        reply_markup: response.reply_markup,
                        reply_markup_type: typeof response.reply_markup,
                        reply_markup_keys: response.reply_markup ? Object.keys(response.reply_markup) : 'null'
                    });
                    
                    // Попробуем отправить как текстовое сообщение с клавиатурой
                    await ctx.editMessageText(response.caption, {
                        parse_mode: 'HTML',
                        reply_markup: response.reply_markup,
                    });
                    console.log('✅ Text message sent successfully');
                } catch (photoError) {
                    console.error('❌ Failed to send text message:', photoError);
                    this.logger.warn('Failed to send text message', photoError);
                }
            } else {
                // Иначе отправляем текстовое сообщение
                console.log('📝 Sending text message with keyboard');
                console.log('📝 Reply markup:', response.reply_markup?.inline_keyboard);
                console.log('🔍 Text message reply_markup:', {
                    reply_markup: response.reply_markup,
                    reply_markup_type: typeof response.reply_markup,
                    reply_markup_keys: response.reply_markup ? Object.keys(response.reply_markup) : 'null'
                });
                
                await ctx.editMessageText(response.text, {
                    reply_markup: response.reply_markup,
                    parse_mode: 'HTML'
                });
                console.log('✅ Text message sent successfully');
            }
            
            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error handling product callback', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при обработке товара',
                show_alert: true,
            });
        }
    }

    private async handleAddToCartCallback(ctx: any): Promise<void> {
        try {
            const callbackData = ctx.callbackQuery?.data;
            console.log('🔥 Add to cart callback triggered:', callbackData);
            this.logger.info('Add to cart callback triggered', { callbackData });
            
            // Парсим ID товара из callback_data
            const productMatch = callbackData?.match(/cart:add:(\d+)/);
            if (!productMatch) {
                await ctx.answerCallbackQuery({
                    text: '❌ Некорректный ID товара',
                    show_alert: true,
                });
                return;
            }
            
            const productId = parseInt(productMatch[1], 10);
            
            // TODO: Добавить товар в корзину через CartService
            // const cartService = this.getServiceRegistry().getService('CartService');
            // await cartService.addToCart(ctx.from?.id, productId);
            
            await ctx.answerCallbackQuery({
                text: '✅ Товар успешно добавлен!',
                show_alert: true,
            });
            
        } catch (error) {
            this.logger.error('Error handling add to cart callback', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при добавлении в корзину',
                show_alert: true,
            });
        }
    }

    private async handleNotifyStockCallback(ctx: any): Promise<void> {
        try {
            console.log('🔔 Notify stock callback triggered');
            this.logger.info('Notify stock callback triggered');
            
            // TODO: Добавить логику уведомления о поступлении
            // const notificationService = this.getServiceRegistry().getService('NotificationService');
            // await notificationService.addStockNotification(ctx.from?.id, productId);
            
            await ctx.answerCallbackQuery({
                text: '🔔 Мы сообщим вам как товар появится на складе',
                show_alert: true,
            });
            
        } catch (error) {
            this.logger.error('Error handling notify stock callback', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при подписке на уведомления',
                show_alert: true,
            });
        }
    }
} 