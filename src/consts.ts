import dotenv from 'dotenv';

dotenv.config();

// Проверка переменных окружения
export interface Env {
  BOT_TOKEN: string;
  WEBHOOK_URL: string;
  PORT?: string;
}

export const env: Env = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  WEBHOOK_URL: process.env.WEBHOOK_URL || '',
  PORT: process.env.PORT || '3000',
};
