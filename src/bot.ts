import { Bot } from 'grammy';
import { env } from './consts';
import { registerMenu } from './services/menu/service';

if (!env.BOT_TOKEN || !env.WEBHOOK_URL) {
  throw new Error('BOT_TOKEN и WEBHOOK_URL должны быть указаны в .env');
}
export const WEBHOOK_PATH = `/webhook/${env.BOT_TOKEN}`;

export const bot = new Bot(env.BOT_TOKEN);
registerMenu(bot)  // регистрируем обработчики для меню
// registerCatalog(bot)  // регистрируем обработчики для каталога
// registerOrders(bot)  // регистрируем обработчики для заказов


export async function setWebhook() {
  const webhookUrl = `${env.WEBHOOK_URL}${WEBHOOK_PATH}`;
  try {
    await bot.api.setWebhook(webhookUrl);
    console.log(`Webhook url set: ${webhookUrl}`);
  } catch (error) {
    console.error('Error setting webhook url:', error);
  }
}
