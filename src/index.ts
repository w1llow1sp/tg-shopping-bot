import express from 'express';
import { webhookCallback } from 'grammy';
import * as bot from './bot';
import * as db from './db/db';
import { env } from './consts';

const app = express();
app.use(express.json());


// Настройка вебхуков
app.use(bot.WEBHOOK_PATH, webhookCallback(bot.bot, 'express'));

const PORT = parseInt(env.PORT || '3000', 10);
app.listen(PORT, async () => {
  console.log(`Server started on port ${PORT}`);
  try {
    await db.initializePool();
    console.log('Database pool initialized');
    await bot.setWebhook();
    console.log('Webhook initialized');
  } catch (error) {
    console.error('Error during initialization:', error);
  }
});
