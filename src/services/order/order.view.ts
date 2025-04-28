import { InlineKeyboard } from 'grammy';
import { Response } from '../menu/menu.view';

export class OrderView {

  renderOrderMessage () : Response  {
    const text = 'У вас пока нет заказов.';
    const reply_markup = new InlineKeyboard()
      .text('Вернуться в меню', 'main');
    return { text, reply_markup };
  }
}