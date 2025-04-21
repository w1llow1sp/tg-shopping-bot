import { Bot, Context, InlineKeyboard } from 'grammy';
import { RedisClientType } from 'redis';
import { CallbackDataRoutes } from './consts';

export class MessageController {
  private bot: Bot;
  private redisConn: RedisClientType;

  constructor(bot: Bot, redisConn: RedisClientType) {
    this.bot = bot;
    this.redisConn = redisConn;
  }

  getUserId(ctx: Context): number | null {
    let userId: number | null;
    if (ctx.update.message != null) {
      userId = ctx.update.message.from.id;
    } else if (ctx.update.callback_query != null) {
      userId = ctx.update.callback_query.from.id;
    } else {
      userId = null;
    }
    return userId;
  }

  private getCallbackMessageId(ctx: Context): number | null {
    return ctx.update.callback_query?.message?.message_id ?? null;
  }
  private getCallbackKeyboard(ctx: Context) {
    return ctx.update.callback_query?.message?.reply_markup ?? null
  }

  async reply(
    ctx: Context,
    text?: string,
    options?: { reply_markup?: object },
    addNavigationButtons: boolean = false,
  ) {
    const activeKeyboardMessageId = this.getCallbackMessageId(ctx);
    const userId = this.getUserId(ctx);
    if (addNavigationButtons && options != null && options.reply_markup != null) {
      this.addNavigationButtons(options.reply_markup)
    }

    try {
      if (activeKeyboardMessageId === null || userId === null) {
        await ctx.reply(text, options);
      } else {
        const previousReplyKeyboard = this.getCallbackKeyboard(ctx);
        if (previousReplyKeyboard != options.reply_markup && text) {
          await ctx.api.editMessageText(
            userId,
            activeKeyboardMessageId,
            text,
            options,
          );
        } else if (text && previousReplyKeyboard === options.reply_markup) {
          await ctx.api.editMessageText(
            userId,
            activeKeyboardMessageId,
            text,
          )
        } else {
          await ctx.api.editMessageText(
            userId,
            activeKeyboardMessageId,
            options,
          )
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
  addNavigationButtons(keyboard: InlineKeyboard) {

    keyboard
      .text("🧺Корзина", CallbackDataRoutes.cart)
      .text("Главная", CallbackDataRoutes.main)
      .row();
  }
  async savePreviousCallbackData(ctx: Context) {
    const userId = this.getUserId(ctx)
    const key = `prev_callback_data:${userId}`
    await this.redisConn.set(key, ctx.update.callback_query?.data ?? CallbackDataRoutes.main)
    await this.redisConn.expire(key, 24 * 3 * 60 * 60)
  }

  async getPreviousCallbackData(ctx: Context) {
    const userId = this.getUserId(ctx)
    const key = `prev_callback_data:${userId}`
    return await this.redisConn.get(key)
  }

  async delPreviousCallbackData(ctx: Context) {
    const userId = this.getUserId(ctx)
    const key = `prev_callback_data:${userId}`
    return await this.redisConn.del(key)
  }
}
