import { InlineKeyboard } from 'grammy';



export class MenuView {
  /**
   * Формирует приветственное сообщение и клавиатуру.
   * @param username - Имя пользователя.
   * @returns Объект с текстом сообщения и клавиатурой.
   */

  renderWelcomeMessage(username: string) {
    const text = `Добро пожаловать в наш магазин, ${username}! Выберите действие:`;
    const reply_markup = new InlineKeyboard()
      .text('Каталог', 'catalog')
      .row()
      .text('Корзина', 'cart')
      .row()
      .text('Заказы', 'order');
    return { text, reply_markup };
  }

  /**
   * Формирует сообщение для каталога.
   * @returns Текст сообщения.
   */


  /**
   * Формирует сообщение для корзины.
   * @returns Текст сообщения.
   */
  renderCartMessage(): string {
    return 'Ваша корзина пуста!!!';
  }

  /**
   * Формирует сообщение для заказов.
   * @returns Текст сообщения.
   */
  renderOrderMessage(): string {
    return 'У вас пока нет заказов.';
  }

  /**
   * Формирует сообщение для неизвестной команды.
   * @returns Текст сообщения.
   */
  renderUnknownCommandMessage(): string {
    return 'Неизвестная команда.';
  }

  /**
   * Формирует сообщение об ошибке.
   * @returns Текст сообщения.
   */
  renderErrorMessage(): string {
    return 'Произошла ошибка. Попробуйте позже.';
  }


}
