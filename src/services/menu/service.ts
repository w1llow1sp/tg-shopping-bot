import { Bot } from 'grammy';
import { MenuRepository } from './repository';

export class MenuService {
  private bot: Bot;
  private repository: MenuRepository;

  /**
   * Конструктор класса MenuService.
   * @param bot - Экземпляр бота grammy.
   * @param repository - Экземпляр репозитория.
   */
  constructor(bot: Bot, repository: MenuRepository) {
    this.bot = bot;
    this.repository = repository;

    // Регистрируем обработчики
    this.registerMenu();
  }

  /**
   * Регистрация команды /start и обработчиков кнопок меню.
   */
  private registerMenu() {
    // Обработчик команды /start
    this.bot.command('start', async (ctx) => {
      try {

        // Получаем имя пользователя
        const username = ctx.from?.username
          ? `@${ctx.from.username}`
          : ctx.from?.first_name || 'пользователь';

        // Отправляем приветственное сообщение с кнопками
        await ctx.reply(
          `Добро пожаловать в наш магазин, ${username}! Для взаимодействия нажмите следующие кнопки:`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Каталог', callback_data: 'catalog' }],
                [{ text: 'Корзина', callback_data: 'cart' }],
                [{ text: 'Заказы', callback_data: 'order' }],
              ],
            },
          },
        );
      } catch (error) {
        console.error('Ошибка обработки команды /start:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
      }
    });

    // Обработчик нажатий на кнопки меню
    this.bot.on('callback_query:data', async (ctx) => {
      const callbackData = ctx.callbackQuery.data;
      console.log('Нажата кнопка:', callbackData);

      switch (callbackData) {
        case 'catalog':
          await ctx.reply('Вы открыли каталог товаров.');
          break;
        case 'cart':
          await ctx.reply('Ваша корзина пуста.');
          break;
        case 'order':
          await ctx.reply('У вас пока нет заказов.');
          break;
        default:
          await ctx.reply('Неизвестная команда.');
      }

      // Закрываем уведомление о нажатии кнопки
      await ctx.answerCallbackQuery();
    });
  }
}
