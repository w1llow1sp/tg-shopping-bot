import { Bot, Context } from 'grammy';
import { CartModel } from './models';
import { CartView } from './view';
import { Pool } from 'pg';


export class CartService {
  private bot: Bot;
  private model:CartModel;
  private view: CartView;

  constructor(bot: Bot, db: Pool,) {
    this.bot = bot;
    this.model = new CartModel();
    this.view = new CartView();
  }

  async handleCallback(ctx: Context) {
    if (!ctx.callbackQuery) {
      console.error('Callback query is undefined in OrderService');
      return;
    }
    const callbackData = ctx.callbackQuery.data;
    console.log('CatalogService processing callback:', callbackData);

    try {
      if (callbackData === 'cart') {
        /**
         *  TODO: логика должна быть такая :
         * 1.идет запрос на получение данных по заказу от пользователя (OrderRepository) ->
         * 2.Эти данные отдаются в view (слой для отображения)
         *
         * Пока будет заглушка из view
         */
        const response = this.view.renderCartMessage();
        await ctx.reply(response.text, { reply_markup: response.reply_markup });
      }
    }
    catch (error) {
      console.log('Error rendering callback:', error);
    }
  }

}