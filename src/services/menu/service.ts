import { Bot, Context, InlineKeyboard } from 'grammy';
import { Pool } from 'pg';
import { MenuRepository } from './repository';
import { MenuView } from './view';
import { CatalogService } from '../catalog/service';
import { OrderService } from '../order/service';
import { CartService } from '../cart/service';

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
  private readonly catalogService: CatalogService;
  private readonly orderService: OrderService;
  private readonly cartService: CartService;

  // Инициализация зависимостей
  constructor(bot: Bot, db: Pool) {
    this.bot = bot;
    this.repository = new MenuRepository(db);
    this.view = new MenuView();
    this.catalogService = new CatalogService(bot, db, 4);
    this.orderService = new OrderService(bot, db);
    this.cartService = new CartService(bot, db);
    this.registerHandlers();
  }

  // Регистрация обработчиков команд и callback-запросов
  private registerHandlers(): void {
    this.bot.command('start', this.handleStartCommand.bind(this));
    this.bot.on('callback_query:data', this.handleCallback.bind(this));
  }

  // Обработка команды /start
  private async handleStartCommand(ctx: Context): Promise<void> {
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
      await ctx.reply(response.text, { reply_markup: response.reply_markup });
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

  // Обработка callback-запросов от кнопок
  public async handleCallback(ctx: Context): Promise<void> {
    const callbackData = ctx.callbackQuery?.data;

    // Проверка наличия данных callback
    if (!callbackData) {
      console.error('Callback query data is undefined');
      const errorResponse = this.view.renderErrorMessage();
      // Исправлено: передаем errorResponse.text и errorResponse.reply_markup
      await ctx.reply(errorResponse.text, {
        reply_markup: errorResponse.reply_markup,
      });
      return;
    }

    console.log('MenuController callback:', callbackData);

    // Делегирование catalog-related запросов
    if (this.isCatalogRelated(callbackData)) {
      console.log('Delegating to CatalogController');
      await this.catalogService.handleCallback(ctx);
      return;
    }

    // Делегирование order-related запросов
    if (this.isOrderRelated(callbackData)) {
      console.log('Delegating to OrderController');
      await this.orderService.handleCallback(ctx);
      return;
    }
    if (this.isCartRelated(callbackData)) {
      console.log('Delegating to CartController');
      await this.cartService.handleCallback(ctx);
      return;
    }

    // Обработчики для различных callback-действий
    const handlers: Record<string, () => Response> = {
      main: () =>
        this.view.renderWelcomeMessage(this.getUserInfo(ctx).username),
    };

    // Выбор обработчика или возврат сообщения о неизвестной команде
    const response =
      handlers[callbackData] || (() => this.view.renderUnknownCommandMessage());
    await ctx.reply(response().text, { reply_markup: response().reply_markup });
  }

  // Проверка, относится ли callback к каталогу
  private isCatalogRelated(callbackData: string): boolean {
    return (
      callbackData === 'catalog' ||
      callbackData.startsWith('catalog_') ||
      callbackData.startsWith('product_')
    );
  }

  private isOrderRelated(callbackData: string): boolean {
    return callbackData === 'order';
  }

  private isCartRelated(callbackData: string): boolean {
    return callbackData === 'cart';
  }
}
