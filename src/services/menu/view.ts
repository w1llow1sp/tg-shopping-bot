import { InlineKeyboard } from 'grammy';

// Интерфейс для ответа, согласованный с MenuController
export interface Response {
  text: string;
  reply_markup?: InlineKeyboard;
}

export class MenuView {
  /**
   * Формирует приветственное сообщение и клавиатуру.
   * @param username - Имя пользователя.
   * @returns Объект с текстом сообщения и клавиатурой.
   */
  renderWelcomeMessage(username: string): Response {
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
   * Формирует сообщение для неизвестной команды.
   * @returns Объект с текстом сообщения и клавиатурой.
   */
  renderUnknownCommandMessage(): Response {
    const text = 'Неизвестная команда.';
    const reply_markup = new InlineKeyboard()
      .text('Вернуться в меню', 'main');
    return { text, reply_markup };
  }

  /**
   * Формирует сообщение об ошибке.
   * @returns Объект с текстом сообщения.
   */
  renderErrorMessage(): Response {
    const text = 'Произошла ошибка. Попробуйте позже.';
    // Без клавиатуры, так как это сообщение об ошибке
    return { text };
  }
}