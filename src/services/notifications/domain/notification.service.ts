/**
 * 📢 Notification Service - Domain Service
 * 
 * Доменный сервис для логики уведомлений
 * Реализует INotificationService
 */

import { Bot } from 'grammy';
import { BaseService } from '../../../shared/base.service';
import { 
    INotificationService, 
    INotificationRepository, 
    INotificationView,
    INotificationTypeRepository,
    Notification, 
    NotificationError, 
    NotificationErrorType,
    StockAlertData 
} from '../ports/notification.port';
import { ICatalogRepository } from '../../catalog/ports/catalog.port';

export class NotificationService extends BaseService implements INotificationService {
    public readonly name = 'NotificationService';
    private notificationRepository: INotificationRepository;
    private notificationView: INotificationView;
    private notificationTypeRepository: INotificationTypeRepository;
    private catalogRepository: ICatalogRepository;
    protected bot: Bot;

    constructor(
        notificationRepository: INotificationRepository,
        notificationView: INotificationView,
        notificationTypeRepository: INotificationTypeRepository,
        catalogRepository: ICatalogRepository,
        bot: Bot
    ) {
        super();
        this.notificationRepository = notificationRepository;
        this.notificationView = notificationView;
        this.notificationTypeRepository = notificationTypeRepository;
        this.catalogRepository = catalogRepository;
        this.bot = bot;
        console.log('🔧 NotificationService initialized');
    }

    async initialize(): Promise<void> {
        // Инициализация сервиса уведомлений
        console.log('🔧 NotificationService initializing...');
        
        try {
            // Регистрируем обработчики
            await this.registerHandlers();
            
            console.log('🔧 NotificationService initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing NotificationService:', error);
            throw error;
        }
    }

    async shutdown(): Promise<void> {
        // Завершение работы сервиса уведомлений
        console.log('🔧 NotificationService shutting down...');
    }

    /**
     * Подписаться на уведомления о поступлении товара
     */
    async subscribeToStockAlert(userId: number, productId: number): Promise<void> {
        try {
            console.log(`🔔 Subscribing user ${userId} to stock alerts for product ${productId}`);
            
            // Проверяем, не подписан ли уже пользователь
            const exists = await this.notificationRepository.checkSubscriptionExists(
                userId, 
                productId, 
                1 // type_id для stock_alert
            );

            if (exists) {
                console.log(`🔔 User ${userId} already subscribed to product ${productId}`);
                throw new NotificationError(
                    NotificationErrorType.SUBSCRIPTION_EXISTS,
                    'Вы уже подписаны на уведомления об этом товаре'
                );
            }

            // Получаем информацию о товаре (здесь нужно будет добавить ProductRepository)
            const productName = 'Товар'; // TODO: получить из ProductRepository
            
            // Создаем уведомление-подписку
            const notification: Notification = {
                user_id: userId,
                type_id: 1, // stock_alert
                product_id: productId,
                message: `Подписка на уведомления о поступлении товара ID: ${productId}`,
                is_read: false,
                is_active: true,
                metadata: {
                    product_id: productId,
                    subscription_type: 'stock_alert'
                }
            };

            console.log(`🔔 Creating notification subscription:`, notification);
            await this.notificationRepository.createNotification(notification);
            console.log(`🔔 Subscription created successfully`);
        } catch (error) {
            console.error('Error subscribing to stock alert:', error);
            throw error;
        }
    }

    /**
     * Отписаться от уведомлений о поступлении товара
     */
    async unsubscribeFromStockAlert(userId: number, productId: number): Promise<void> {
        try {
            // Находим и деактивируем подписку
            const notifications = await this.notificationRepository.getProductNotifications(productId, 1);
            const userNotification = notifications.find(n => n.user_id === userId);

            if (!userNotification) {
                throw new NotificationError(
                    NotificationErrorType.SUBSCRIPTION_NOT_FOUND,
                    'Подписка не найдена'
                );
            }

            await this.notificationRepository.updateNotification(userNotification.id!, {
                is_active: false
            });
        } catch (error) {
            console.error('Error unsubscribing from stock alert:', error);
            throw error;
        }
    }

    /**
     * Отправить уведомления о поступлении товара
     */
    async sendStockAlert(productId: number, oldQuantity: number, newQuantity: number): Promise<void> {
        try {
            console.log(`🔔 NotificationService: Sending stock alert for product ${productId}`);
            
            // Получаем все активные подписки на этот товар
            const notifications = await this.notificationRepository.getProductNotifications(productId, 1);
            
            console.log(`🔔 NotificationService: Found ${notifications.length} subscriptions for product ${productId}`);
            
            if (notifications.length === 0) {
                console.log(`🔔 NotificationService: No subscriptions found for product ${productId}`);
                return;
            }

            // Получаем информацию о товаре
            let productName = 'Товар';
            let price = 0;
            
            try {
                const product = await this.catalogRepository.getProductDetail(productId);
                productName = product.name;
                price = product.price;
                console.log(`🔔 NotificationService: Got product info - Name: ${productName}, Price: ${price}`);
            } catch (error) {
                console.error(`❌ NotificationService: Failed to get product info for ${productId}:`, error);
            }

            // Формируем сообщение
            const message = this.notificationView.renderStockAlertMessage(
                productName, 
                price, 
                oldQuantity, 
                newQuantity
            );

            console.log(`🔔 NotificationService: Stock alert message:`, message);

            // Отправляем уведомления всем подписчикам
            for (const notification of notifications) {
                try {
                    console.log(`🔔 NotificationService: Sending to user ${notification.user_id}`);
                    await this.bot.api.sendMessage(notification.user_id, message, {
                        parse_mode: 'HTML'
                    });

                    // Помечаем как отправленное
                    await this.notificationRepository.updateNotification(notification.id!, {
                        sent_at: new Date(),
                        is_read: true
                    });

                    console.log(`✅ NotificationService: Stock alert sent to user ${notification.user_id}`);
                } catch (error) {
                    console.error(`❌ NotificationService: Failed to send stock alert to user ${notification.user_id}:`, error);
                }
            }
        } catch (error) {
            console.error('❌ NotificationService: Error sending stock alert:', error);
            throw error;
        }
    }

    /**
     * Получить уведомления пользователя
     */
    async getUserNotifications(userId: number): Promise<Notification[]> {
        try {
            return await this.notificationRepository.getUserNotifications(userId);
        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }

    /**
     * Пометить уведомление как прочитанное
     */
    async markNotificationAsRead(notificationId: number): Promise<void> {
        try {
            await this.notificationRepository.updateNotification(notificationId, {
                is_read: true
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    /**
     * Пометить уведомление как отправленное
     */
    async markNotificationAsSent(notificationId: number): Promise<void> {
        try {
            await this.notificationRepository.updateNotification(notificationId, {
                sent_at: new Date()
            });
        } catch (error) {
            console.error('Error marking notification as sent:', error);
            throw error;
        }
    }

    /**
     * Регистрация обработчиков для Telegram
     */
    protected async registerHandlers(): Promise<void> {
        console.log('🔧 Registering NotificationService handlers...');
        
        try {
            // Подписка на уведомления
            this.bot.callbackQuery(/^notify:stock:subscribe:(\d+)$/, this.handleSubscribeStock.bind(this));
            
            // Отписка от уведомлений
            this.bot.callbackQuery(/^notify:stock:unsubscribe:(\d+)$/, this.handleUnsubscribeStock.bind(this));
            
            // Просмотр уведомлений
            this.bot.callbackQuery(/^notifications:view$/, this.handleViewNotifications.bind(this));
            
            // Пометить как прочитанное
            this.bot.callbackQuery(/^notifications:read:(\d+)$/, this.handleMarkAsRead.bind(this));
            
            console.log('🔧 NotificationService handlers registered successfully');
        } catch (error) {
            console.error('❌ Error registering NotificationService handlers:', error);
            throw error;
        }
    }

    /**
     * Обработчик подписки на уведомления
     */
    private async handleSubscribeStock(ctx: any): Promise<void> {
        try {
            const productId = parseInt(ctx.match[1]);
            const userId = ctx.from?.id;

            if (!userId) {
                await ctx.answer('❌ Ошибка: пользователь не найден');
                return;
            }

            await this.subscribeToStockAlert(userId, productId);
            
            // TODO: Получить название товара
            const productName = 'Товар';
            const message = this.notificationView.renderSubscriptionSuccess(productName);
            
            await ctx.answer(message, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Error in handleSubscribeStock:', error);
            const errorMessage = this.notificationView.renderSubscriptionError(
                error instanceof NotificationError ? error.message : 'Неизвестная ошибка'
            );
            await ctx.answer(errorMessage, { parse_mode: 'HTML' });
        }
    }

    /**
     * Обработчик отписки от уведомлений
     */
    private async handleUnsubscribeStock(ctx: any): Promise<void> {
        try {
            const productId = parseInt(ctx.match[1]);
            const userId = ctx.from?.id;

            if (!userId) {
                await ctx.answer('❌ Ошибка: пользователь не найден');
                return;
            }

            await this.unsubscribeFromStockAlert(userId, productId);
            
            // TODO: Получить название товара
            const productName = 'Товар';
            const message = this.notificationView.renderUnsubscriptionSuccess(productName);
            
            await ctx.answer(message, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Error in handleUnsubscribeStock:', error);
            await ctx.answer('❌ Ошибка при отписке от уведомлений');
        }
    }

    /**
     * Обработчик просмотра уведомлений
     */
    private async handleViewNotifications(ctx: any): Promise<void> {
        try {
            const userId = ctx.from?.id;

            if (!userId) {
                await ctx.answer('❌ Ошибка: пользователь не найден');
                return;
            }

            const notifications = await this.getUserNotifications(userId);
            const message = this.notificationView.renderNotificationList(notifications);
            
            await ctx.answer(message, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Error in handleViewNotifications:', error);
            await ctx.answer('❌ Ошибка при загрузке уведомлений');
        }
    }

    /**
     * Обработчик пометки как прочитанное
     */
    private async handleMarkAsRead(ctx: any): Promise<void> {
        try {
            const notificationId = parseInt(ctx.match[1]);
            await this.markNotificationAsRead(notificationId);
            await ctx.answer('✅ Уведомление помечено как прочитанное');
        } catch (error) {
            console.error('Error in handleMarkAsRead:', error);
            await ctx.answer('❌ Ошибка при обновлении уведомления');
        }
    }
} 