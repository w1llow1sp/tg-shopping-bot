import express from 'express';
import { webhookCallback } from 'grammy';
import * as bot from './bot';
import * as pg from './db/pg';
import * as redis from './db/redis';
import { env } from './consts';

const app = express();
app.use(express.json());

app.use(bot.WEBHOOK_PATH, webhookCallback(bot.bot, 'express'));

const PORT = parseInt(env.PORT || '3000', 10);
app.listen(PORT, async () => {
  console.log(`Server started on port ${PORT}`);
  try {
    await pg.initializePool();
    await redis.initializeConnection()
    await bot.setWebhook();
  } catch (error) {
    console.error('Error during initialization:', error);
  }
  console.log("After try");
});
