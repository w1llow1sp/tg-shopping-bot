import { Bot, Context } from 'grammy';
import { OrderModel } from './order.models';
import { OrderView } from './order.view';
import { Pool } from 'pg';

export class OrderService {
  private bot: Bot;
  private model: OrderModel;
  private view: OrderView;

  constructor(bot: Bot, db: Pool) {
    this.bot = bot;
    this.model = new OrderModel();
    this.view = new OrderView();
  }

  async handleCallback(ctx: Context) {
    if (!ctx.callbackQuery) {
      console.error('Callback query is undefined in OrderService');
      return;
    }

    const callbackData = ctx.callbackQuery.data;
    console.log('CatalogService processing callback:', callbackData);

    try {
      if (callbackData === 'order') {
        /**
         *  TODO: логика должна быть такая :
         * 1.идет запрос на получение данных по заказу от пользователя (OrderRepository) ->
         * 2.Эти данные отдаются в view (слой для отображения)
         *
         * Пока будет заглушка из view
         */
        const response = this.view.renderOrderMessage();
        await ctx.reply(response.text, { reply_markup: response.reply_markup });
      }
    } catch (error) {
      console.log('Error rendering callback:', error);
    }
  }
}
