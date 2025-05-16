import { Bot } from 'grammy';
import { env } from './consts';
import { MenuService } from './services/menu/menu.service';
import { pool } from './db/pg';
import { CatalogService } from './services/catalog/catalog.service';
import { CatalogRepository } from './services/catalog/catalog.repository';
import { MenuRepository } from './services/menu/menu.repository';
import { CartRepository } from './services/cart/cart.repository';
import { CartService } from './services/cart/cart.service';
import { RedisConn } from './db/redis';
import { MessageController } from './message';


if (!env.BOT_TOKEN || !env.WEBHOOK_URL) {
  throw new Error('BOT_TOKEN и WEBHOOK_URL должны быть указаны в .env');
}
export const WEBHOOK_PATH = `/webhook/${env.BOT_TOKEN}`;

export const bot = new Bot(env.BOT_TOKEN);

const messageController = new MessageController(bot, RedisConn)

const menuRepository = new MenuRepository(pool);
new MenuService(bot, menuRepository, messageController);

const catalogRepository = new CatalogRepository(pool);
new CatalogService(bot, catalogRepository, messageController);

const catalogService = new CatalogService(bot, catalogRepository, messageController);

// Initialize repositories
const cartRepository = new CartRepository(pool, RedisConn);
new CartService(bot, cartRepository, catalogRepository,catalogService, RedisConn, messageController);


export async function setWebhook() {
  const webhookUrl = `${env.WEBHOOK_URL}${WEBHOOK_PATH}`;
  try {
    await bot.api.setWebhook(webhookUrl);
    console.log(`Webhook url set: ${webhookUrl}`);
  } catch (error) {
    console.error('Error setting webhook url:', error);
  }
}
