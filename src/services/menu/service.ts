import { Bot, Context } from 'grammy';
import { Pool } from 'pg';
import { MenuRepository } from './repository';
import { MenuView } from './view';

export class MenuController {
  private bot: Bot;
  private repository: MenuRepository;
  private view: MenuView;

  constructor(bot: Bot, db: Pool) {
    this.bot = bot;
    this.repository = new MenuRepository(db);
    this.view = new MenuView();
    this.registerHandlers();
  }

  private registerHandlers() {
    this.bot.command('start', async (ctx) => {
      try {
        const dbVersion = await this.repository.checkDbConnection();
        console.log('Версия базы данных:', dbVersion);
        const username = ctx.from?.username
          ? `@${ctx.from.username}`
          : ctx.from?.first_name || 'пользователь';
        const response = this.view.renderWelcomeMessage(username);
        console.log('Sending welcome message:', JSON.stringify(response, null, 2));
        await ctx.reply(response.text, { reply_markup: response.reply_markup });
      } catch (error) {
        console.error('Ошибка обработки команды /start:', error);
        await ctx.reply(this.view.renderErrorMessage());
      }
    });
  }

  async handleCallback(ctx: Context) {
    if (!ctx.callbackQuery) {
      console.error('Callback query is undefined in MenuController');
      return;
    }
    const callbackData = ctx.callbackQuery.data;
    console.log('MenuController callback:', callbackData);

    if (callbackData === 'catalog') {
      console.log('Skipping catalog callback in MenuController');
      return;
    }

    switch (callbackData) {
      case 'cart':
        await ctx.reply(this.view.renderCartMessage());
        break;
      case 'order':
        await ctx.reply(this.view.renderOrderMessage());
        break;
      case 'main': {
        const username = ctx.from?.username
          ? `@${ctx.from.username}`
          : ctx.from?.first_name || 'пользователь';
        const response = this.view.renderWelcomeMessage(username);
        await ctx.reply(response.text, { reply_markup: response.reply_markup });
        break;
      }
      default:
        await ctx.reply(this.view.renderUnknownCommandMessage());
    }
  }
}