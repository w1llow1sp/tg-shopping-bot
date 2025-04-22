import { Context, InlineKeyboard } from 'grammy';
import { Response } from '../menu/view';
import { CallbackDataRoutes } from '../../consts';
import { Cart } from './repository';

export class CartView {

  /**
   * Формирует сообщение для корзины.
   * @returns Объект с текстом сообщения и клавиатурой.
   */
  renderCartMessage(cart: Cart | null): Response {
    const text = 'Ваша корзина пуста';
    const reply_markup = new InlineKeyboard()
      .text('Вернуться в меню', CallbackDataRoutes.main);
    return { text, reply_markup };
  }

  renderProductAddedMessage(ctx: Context, productId: number): Response {
    // the same message text and the same keyboard except of first line
    const keyboard = new InlineKeyboard();
    const oldKeyboard = ctx.callbackQuery?.message?.reply_markup
    keyboard.text('Убрать из корзины', `${CallbackDataRoutes.cart}:del:${productId}`).row();

    keyboard.inline_keyboard[1] = oldKeyboard?.inline_keyboard[1] ?? []
    return { text: ctx.callbackQuery?.message?.text, reply_markup: keyboard }
  }
}