/**
 * 📦 Stock Event Service
 * 
 * Сервис для обработки событий изменения количества товаров
 * Отслеживает изменения в таблице stock_events и отправляет уведомления
 */

import { Pool } from 'pg';
import { NotificationService } from './notification.service';
import { Logger } from '../../../shared/logger';
import { BaseService } from '../../../shared/base.service';

export interface StockEvent {
    id: number;
    product_id: number;
    old_quantity: number;
    new_quantity: number;
    event_type: 'replenished' | 'depleted' | 'changed';
    created_at: Date;
    processed: boolean;
}

export class StockEventService extends BaseService {
    public readonly name = 'StockEventService';
    private pool: Pool;
    private notificationService: NotificationService;
    protected logger: Logger;
    private isProcessing = false;

    constructor(pool: Pool, notificationService: NotificationService) {
        super();
        this.pool = pool;
        this.notificationService = notificationService;
        this.logger = Logger.getInstance();
    }

    async initialize(): Promise<void> {
        // Запускаем обработку событий при инициализации
        await this.startEventProcessing();
        
        // Создаем тестовое событие для проверки работы системы
        console.log(`🔍 StockEventService: Creating test event during initialization...`);
        await this.createTestReplenishmentEvent(2, 0, 5); // Товар 2 (Вермикулит)
    }

    async shutdown(): Promise<void> {
        // Останавливаем обработку событий при выключении
        this.stopEventProcessing();
    }

    protected async registerHandlers(): Promise<void> {
        // Этот сервис не регистрирует обработчики Telegram
        // Он работает в фоновом режиме
    }

    /**
     * Запустить обработку событий изменения количества товаров
     */
    async startEventProcessing(): Promise<void> {
        if (this.isProcessing) {
            this.logger.warn('Stock event processing is already running');
            return;
        }

        this.isProcessing = true;
        this.logger.info('Starting stock event processing');

        // Запускаем периодическую обработку событий
        setInterval(async () => {
            try {
                await this.processStockEvents();
            } catch (error) {
                this.logger.error('Error processing stock events', error as Error);
            }
        }, 30000); // Проверяем каждые 30 секунд
    }

    /**
     * Остановить обработку событий
     */
    stopEventProcessing(): void {
        this.isProcessing = false;
        this.logger.info('Stock event processing stopped');
    }

    /**
     * Обработать необработанные события изменения количества товаров
     */
    private async processStockEvents(): Promise<void> {
        try {
            // Получаем необработанные события
            const events = await this.getUnprocessedEvents();
            
            console.log(`🔍 StockEventService: Found ${events.length} unprocessed events`);
            
            if (events.length === 0) {
                return;
            }

            this.logger.info(`Processing ${events.length} stock events`);
            console.log(`🔍 StockEventService: Processing events:`, events);

            for (const event of events) {
                try {
                    console.log(`🔍 StockEventService: Processing event:`, event);
                    await this.processStockEvent(event);
                    
                    // Помечаем событие как обработанное
                    await this.markEventAsProcessed(event.id);
                    
                    this.logger.info(`Processed stock event ${event.id} for product ${event.product_id}`);
                    console.log(`✅ StockEventService: Processed event ${event.id} for product ${event.product_id}`);
                } catch (error) {
                    this.logger.error(`Error processing stock event ${event.id}:`, error as Error);
                    console.error(`❌ StockEventService: Error processing event ${event.id}:`, error);
                }
            }
        } catch (error) {
            this.logger.error('Error in processStockEvents', error as Error);
            console.error(`❌ StockEventService: Error in processStockEvents:`, error);
        }
    }

    /**
     * Получить необработанные события
     */
    private async getUnprocessedEvents(): Promise<StockEvent[]> {
        try {
            console.log(`🔍 StockEventService: Querying unprocessed events...`);
            const result = await this.pool.query(
                `SELECT DISTINCT ON (product_id) * FROM stock_events 
                 WHERE processed = FALSE 
                 ORDER BY product_id, created_at DESC 
                 LIMIT 10`
            );

            console.log(`🔍 StockEventService: Query result:`, result.rows);
            return result.rows.map(row => ({
                id: row.id,
                product_id: row.product_id,
                old_quantity: row.old_quantity,
                new_quantity: row.new_quantity,
                event_type: row.event_type,
                created_at: row.created_at,
                processed: row.processed
            }));
        } catch (error) {
            this.logger.error('Error getting unprocessed events', error as Error);
            console.error(`❌ StockEventService: Error getting unprocessed events:`, error);
            return [];
        }
    }

    /**
     * Обработать одно событие изменения количества товара
     */
    private async processStockEvent(event: StockEvent): Promise<void> {
        console.log(`🔍 StockEventService: Processing event type: ${event.event_type}`);
        
        // Обрабатываем только события пополнения товара
        if (event.event_type === 'replenished') {
            this.logger.info(`Stock replenished for product ${event.product_id}: ${event.old_quantity} -> ${event.new_quantity}`);
            console.log(`🔔 StockEventService: Stock replenished for product ${event.product_id}: ${event.old_quantity} -> ${event.new_quantity}`);
            
            // Отправляем уведомления всем подписчикам
            console.log(`🔔 StockEventService: Sending stock alert for product ${event.product_id}`);
            await this.notificationService.sendStockAlert(
                event.product_id,
                event.old_quantity,
                event.new_quantity
            );
            console.log(`✅ StockEventService: Stock alert sent for product ${event.product_id}`);
        } else {
            console.log(`🔍 StockEventService: Skipping event type: ${event.event_type}`);
        }
    }

    /**
     * Пометить событие как обработанное
     */
    private async markEventAsProcessed(eventId: number): Promise<void> {
        try {
            await this.pool.query(
                'UPDATE stock_events SET processed = TRUE WHERE id = $1',
                [eventId]
            );
        } catch (error) {
            this.logger.error(`Error marking event ${eventId} as processed`, error as Error);
        }
    }

    /**
     * Создать тестовое событие пополнения товара
     */
    async createTestReplenishmentEvent(productId: number, oldQuantity: number, newQuantity: number): Promise<void> {
        try {
            console.log(`🔍 StockEventService: Creating test replenishment event for product ${productId}`);
            await this.pool.query(
                `INSERT INTO stock_events (product_id, old_quantity, new_quantity, event_type) 
                 VALUES ($1, $2, $3, 'replenished')`,
                [productId, oldQuantity, newQuantity]
            );
            
            this.logger.info(`Created test replenishment event for product ${productId}`);
            console.log(`✅ StockEventService: Created test replenishment event for product ${productId}`);
        } catch (error) {
            this.logger.error('Error creating test replenishment event', error as Error);
            console.error(`❌ StockEventService: Error creating test replenishment event:`, error);
        }
    }

    /**
     * Получить статистику событий
     */
    async getEventStats(): Promise<any> {
        try {
            const result = await this.pool.query(
                `SELECT 
                    event_type,
                    COUNT(*) as count,
                    COUNT(CASE WHEN processed = TRUE THEN 1 END) as processed_count,
                    COUNT(CASE WHEN processed = FALSE THEN 1 END) as unprocessed_count
                 FROM stock_events 
                 GROUP BY event_type`
            );

            return result.rows;
        } catch (error) {
            this.logger.error('Error getting event stats', error as Error);
            return [];
        }
    }
} 