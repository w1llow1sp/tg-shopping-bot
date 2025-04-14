import { Bot } from 'grammy';
import { env } from './consts';
import { MenuService } from './services/menu/service';
import { pool } from './db/db';
import { MenuRepository } from './services/menu/repository';

if (!env.BOT_TOKEN || !env.WEBHOOK_URL) {
  throw new Error('BOT_TOKEN и WEBHOOK_URL должны быть указаны в .env');
}
export const WEBHOOK_PATH = `/webhook/${env.BOT_TOKEN}`;

export const bot = new Bot(env.BOT_TOKEN);
new MenuService(bot, new MenuRepository(pool)); // регистрируем обработчики для меню
// registerCatalog(bot, pool)  // регистрируем обработчики для каталога
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
