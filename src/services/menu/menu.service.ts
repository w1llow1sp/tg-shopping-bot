import { Bot, Context, InlineKeyboard } from 'grammy';
import { MenuRepository } from './menu.repository';
import { MenuView } from './menu.view';
import { CallbackDataRoutes } from '../../consts';
import { MessageController } from '../../message';


// Интерфейс для ответа бота (текст и разметка кнопок)
export interface Response {
  text: string;
  reply_markup?: InlineKeyboard;
}

// Интерфейс для информации о пользователе
interface UserInfo {
  username: string;
  firstName?: string;
}

// Контроллер основного меню бота
export class MenuService {
  // Зависимости: бот, репозиторий, вью и контроллер каталога
  private readonly bot: Bot;
  private readonly repository: MenuRepository;
  private readonly view: MenuView;
  private messageController: MessageController;


  // Инициализация зависимостей
  constructor(bot: Bot, repository: MenuRepository, messageController: MessageController) {
    this.bot = bot;
    this.repository = repository;
    this.messageController = messageController;
    this.view = new MenuView();
    this.registerHandlers();
  }

  // Регистрация обработчиков команд и callback-запросов
  private registerHandlers(): void {
    this.bot.command('start', this.handleMenuCommand.bind(this));
    this.bot.callbackQuery(CallbackDataRoutes.main, this.handleMenuCommand.bind(this));
  }

  // Обработка команды /start
  private async handleMenuCommand(ctx: Context): Promise<void> {
    try {
      // Получение имени пользователя
      const userInfo = this.getUserInfo(ctx);
      // Генерация приветственного сообщения
      const response = this.view.renderWelcomeMessage(userInfo.username);

      console.log(
        'Sending welcome message:',
        JSON.stringify(response, null, 2),
      );
      // Отправка ответа пользователю
      await this.messageController.reply(ctx, response.text, { reply_markup: response.reply_markup })
    } catch (error) {
      // Обработка ошибок при выполнении команды
      console.error('Error handling /start command:', error);
      const errorResponse = this.view.renderErrorMessage();
      // Исправлено: передаем errorResponse.text и errorResponse.reply_markup
      await ctx.reply(errorResponse.text, {
        reply_markup: errorResponse.reply_markup,
      });
    }
  }

  // Извлечение информации о пользователе из контекста
  private getUserInfo(ctx: Context): UserInfo {
    const username = ctx.from?.username
      ? `@${ctx.from.username}`
      : ctx.from?.first_name || 'user';
    return { username, firstName: ctx.from?.first_name };
  }

}
