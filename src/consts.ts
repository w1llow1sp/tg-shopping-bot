import dotenv from 'dotenv';

dotenv.config();

export interface Env {
  BOT_TOKEN: string;
  WEBHOOK_URL: string;
  PORT?: string;
  POSTGRESQL_DSN?:string;
  REDIS_DSN?:string;
}

export const env: Env = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  WEBHOOK_URL: process.env.WEBHOOK_URL || '',
  PORT: process.env.PORT || '3000',
  POSTGRESQL_DSN: process.env.POSTGRESQL_DSN || '',
  REDIS_DSN: process.env.REDIS_DSN || '',
};

export enum CallbackDataRoutes {
  main = 'menu',
  catalog = 'catalog',
  orders = 'orders',
  cart = 'cart',
  product = 'product',
}