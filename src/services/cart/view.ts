import { InlineKeyboard } from 'grammy';
import { Response } from '../menu/view';

export class CartView {

  /**
   * Формирует сообщение для корзины.
   * @returns Объект с текстом сообщения и клавиатурой.
   */
  renderCartMessage(): Response {
    const text = 'Ваша корзина пуста';
    const reply_markup = new InlineKeyboard()
      .text('Вернуться в меню', 'main');
    return { text, reply_markup };
  }
}