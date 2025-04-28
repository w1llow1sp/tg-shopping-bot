import { Bot, Context, InlineKeyboard } from 'grammy';
import { RedisClientType } from 'redis';
import { CallbackDataRoutes } from './consts';

type ParseMode = 'Markdown' | 'MarkdownV2' | 'HTML';

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
    return ctx.update.callback_query?.message?.reply_markup ?? null;
  }

  private isPhotoMessage(ctx: Context): boolean {
    return !!ctx.update.callback_query?.message?.photo;
  }

  async saveActiveMessageId(ctx: Context, messageId: number): Promise<void> {
    const userId = this.getUserId(ctx);
    if (!userId) return;
    const key = `active_message_id:${userId}`;
    try {
      console.log(`Saving active message ID: ${messageId} for user: ${userId}`);
      await this.redisConn.set(key, messageId.toString());
      await this.redisConn.expire(key, 24 * 3 * 60 * 60);
    } catch (error) {
      console.error('Error saving active message ID to Redis:', error);
    }
  }

  async getActiveMessageId(ctx: Context): Promise<number | null> {
    const userId = this.getUserId(ctx);
    if (!userId) return null;
    const key = `active_message_id:${userId}`;
    try {
      const messageId = await this.redisConn.get(key);
      console.log(`Retrieved active message ID: ${messageId} for user: ${userId}`);
      return messageId ? parseInt(messageId, 10) : null;
    } catch (error) {
      console.error('Error getting active message ID from Redis:', error);
      return null;
    }
  }

  async reply(
    ctx: Context,
    text: string = 'Произошла ошибка',
    options: { reply_markup?: InlineKeyboard; parse_mode?: ParseMode } = {},
    addNavigationButtons: boolean = false,
    isPhoto: boolean = false,
  ) {
    const activeMessageId = await this.getActiveMessageId(ctx) ?? this.getCallbackMessageId(ctx);
    const userId = this.getUserId(ctx);

    if (addNavigationButtons && options.reply_markup) {
      this.addNavigationButtons(options.reply_markup);
    }

    try {
      if (activeMessageId === null || userId === null) {
        console.log('No active message ID, sending new message');
        const message = await ctx.reply(text, options);
        await this.saveActiveMessageId(ctx, message.message_id);
        return;
      }

      console.log(`Editing message ID: ${activeMessageId}, isPhoto: ${isPhoto}, hasPhoto: ${this.isPhotoMessage(ctx)}`);
      if (isPhoto && this.isPhotoMessage(ctx)) {
        await ctx.api.editMessageCaption(userId, activeMessageId, {
          caption: text,
          reply_markup: options.reply_markup,
          parse_mode: options.parse_mode,
        });
      } else {
        await ctx.api.editMessageText(userId, activeMessageId, text, {
          reply_markup: options.reply_markup,
          parse_mode: options.parse_mode,
        });
      }
    } catch (error) {
      console.error('Error in MessageController.reply:', error);
      try {
        console.log('Retrying with new message due to edit failure');
        const message = await ctx.reply(text, options);
        await this.saveActiveMessageId(ctx, message.message_id);
      } catch (retryError) {
        console.error('Error sending new message:', retryError);
      }
    }
  }

  async replyWithPhoto(
    ctx: Context,
    photo: string,
    options: { caption?: string; reply_markup?: InlineKeyboard; parse_mode?: ParseMode },
  ) {
    const activeMessageId = await this.getActiveMessageId(ctx) ?? this.getCallbackMessageId(ctx);
    const userId = this.getUserId(ctx);

    try {
      if (activeMessageId === null || userId === null) {
        console.log('No active message ID, sending new photo');
        const message = await ctx.replyWithPhoto(photo, options);
        await this.saveActiveMessageId(ctx, message.message_id);
        return;
      }

      console.log(`Editing media for message ID: ${activeMessageId}`);
      await ctx.api.editMessageMedia(userId, activeMessageId, {
        type: 'photo',
        media: photo,
        caption: options.caption,
        parse_mode: options.parse_mode,
      }, {
        reply_markup: options.reply_markup,
      });
    } catch (error) {
      console.error('Error in MessageController.replyWithPhoto:', error);
      try {
        console.log('Retrying with new photo due to edit failure');
        const message = await ctx.replyWithPhoto(photo, options);
        await this.saveActiveMessageId(ctx, message.message_id);
      } catch (retryError) {
        console.error('Error sending new photo:', retryError);
      }
    }
  }

  addNavigationButtons(keyboard: InlineKeyboard) {
    keyboard
      .text('🧺 Корзина', CallbackDataRoutes.cart)
      .text('Главная', CallbackDataRoutes.main)
      .row();
  }

  async savePreviousCallbackData(ctx: Context) {
    const userId = this.getUserId(ctx);
    if (!userId) return;
    const key = `prev_callback_data:${userId}`;
    try {
      console.log(`Saving previous callback data: ${ctx.update.callback_query?.data}`);
      await this.redisConn.set(key, ctx.update.callback_query?.data ?? CallbackDataRoutes.main);
      await this.redisConn.expire(key, 24 * 3 * 60 * 60);
    } catch (error) {
      console.error('Error saving previous callback data:', error);
    }
  }

  async getPreviousCallbackData(ctx: Context) {
    const userId = this.getUserId(ctx);
    if (!userId) return null;
    const key = `prev_callback_data:${userId}`;
    try {
      const data = await this.redisConn.get(key);
      console.log(`Retrieved previous callback data: ${data}`);
      return data;
    } catch (error) {
      console.error('Error getting previous callback data:', error);
      return null;
    }
  }

  async delPreviousCallbackData(ctx: Context) {
    const userId = this.getUserId(ctx);
    if (!userId) return;
    const key = `prev_callback_data:${userId}`;
    try {
      console.log(`Deleting previous callback data for user: ${userId}`);
      await this.redisConn.del(key);
    } catch (error) {
      console.error('Error deleting previous callback data:', error);
    }
  }
}