import { InlineKeyboard } from 'grammy';
import { IOrderView, IOrderService } from '../ports/order.port';

export class OrderView implements IOrderView {
    private readonly orderService: IOrderService;

    constructor(orderService: IOrderService) {
        this.orderService = orderService;
    }

    async renderOrderPlaceholder(): Promise<any> {
        const text = await this.orderService.getOrderPlaceholder();
        const reply_markup = new InlineKeyboard()
            .text('Вернуться в меню', 'main');
        
        return { text, reply_markup };
    }
} 