import { Bot } from 'grammy';
import { IOrderService, OrderConfig } from '../ports/order.port';
import { OrderView } from '../adapters/order.view';
import { BaseService } from '../../../shared/base.service';
import { Logger } from '../../../shared/logger';

export class OrderService extends BaseService implements IOrderService {
    public readonly name = 'OrderService';
    private orderView: OrderView;

    constructor() {
        super();
        this.orderView = new OrderView(this);
    }

    async getOrderPlaceholder(): Promise<string> {
        this.logger.info('Order service placeholder called');
        return OrderConfig.PLACEHOLDER_MESSAGE;
    }

    protected async registerHandlers(): Promise<void> {
        const bot = this.getBot();
        
        // Регистрируем обработчик для заказов
        bot.callbackQuery('order', this.handleOrderCallback.bind(this));
        
        this.logger.info('Order service handlers registered');
    }

    private async handleOrderCallback(ctx: any): Promise<void> {
        try {
            this.logger.info('Order callback triggered');
            const response = await this.orderView.renderOrderPlaceholder();
            
            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });
            
            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error handling order callback', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при обработке запроса',
                show_alert: true,
            });
        }
    }
} 