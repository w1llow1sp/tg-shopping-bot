import { Bot } from 'grammy';
import { env } from './consts';
import { MenuController } from './services/menu/service';
import { pool } from './db/db';
import { CatalogController } from './services/catalog/controller';


if (!env.BOT_TOKEN || !env.WEBHOOK_URL) {
  throw new Error('BOT_TOKEN и WEBHOOK_URL должны быть указаны в .env');
}
export const WEBHOOK_PATH = `/webhook/${env.BOT_TOKEN}`;

export const bot = new Bot(env.BOT_TOKEN);


// Инициализация контроллеров
console.log('Initializing MenuController');
const menuController = new MenuController(bot, pool);
console.log('Initializing CatalogController');
const catalogController = new CatalogController(bot, pool, 4);

bot.on('callback_query:data', async (ctx) => {
  if (!ctx.callbackQuery) {
    console.error('Callback query is undefined');
    return;
  }
  const callbackData = ctx.callbackQuery.data;
  console.log('Global callback received:', callbackData);

  try {
    if (callbackData === 'catalog' || callbackData.startsWith('catalog_') || callbackData.startsWith('product_')) {
      console.log('Delegating to CatalogController');
      await catalogController.handleCallback(ctx);
    } else {
      console.log('Delegating to MenuController');
      await menuController.handleCallback(ctx);
    }
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('Error processing callback:', error);
    await ctx.reply('Произошла ошибка. Попробуйте позже.');
    await ctx.answerCallbackQuery().catch((err) => console.error('Error in answerCallbackQuery:', err));
  }
});
// registerCatalog(bot, pool)
// registerOrders(bot, pool)  // регистрируем обработчики для заказов

export async function setWebhook() {
  const webhookUrl = `${env.WEBHOOK_URL}${WEBHOOK_PATH}`;
  try {
    await bot.api.setWebhook(webhookUrl);
    console.log(`Webhook url set: ${webhookUrl}`);
  } catch (error) {
    console.error('Error setting webhook url:', error);
  }
}
