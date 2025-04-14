import { Bot } from 'grammy';
import * as db from '../../db/db';

export const registerMenu = (bot: Bot) => {
  bot.command('start', async (ctx) => {

    const dbVersion = await db.query('SELECT version();')
    console.log(dbVersion[0]);

    const username = ctx.from?.username
      ? `@${ctx.from.username}`
      : ctx.from?.first_name || 'пользователь';

    await ctx.reply(
      `Добро пожаловать в наш магазин, ${username}! Для взаимодействия нажмите следующие кнопки:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Каталог', callback_data: 'catalog_0' }],
            [{ text: 'Корзина', callback_data: 'cart' }],
            [{ text: 'Заказы', callback_data: 'order' }],
          ],
        },
      },
    );
  });
};
