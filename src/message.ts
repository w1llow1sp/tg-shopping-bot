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
    console.log('getUserId called:', { userId });
    return userId;
  }

  private getCallbackMessageId(ctx: Context): number | null {
    const messageId = ctx.update.callback_query?.message?.message_id ?? null;
    console.log('getCallbackMessageId:', { messageId });
    return messageId;
  }

  private getCallbackKeyboard(ctx: Context) {
    return ctx.update.callback_query?.message?.reply_markup ?? null;
  }

  private isPhotoMessage(ctx: Context): boolean {
    const isPhoto = !!ctx.update.callback_query?.message?.photo;
    console.log('isPhotoMessage:', {
      isPhoto,
      hasMessage: !!ctx.update.callback_query?.message,
      chatId: ctx.update.callback_query?.message?.chat.id,
    });
    return isPhoto;
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
    const chatId = ctx.chat?.id ?? ctx.update.callback_query?.message?.chat.id;

    if (addNavigationButtons && options.reply_markup) {
      this.addNavigationButtons(options.reply_markup);
    }

    console.log('MessageController.reply called:', {
      activeMessageId,
      userId,
      chatId,
      isPhoto,
      hasPhoto: this.isPhotoMessage(ctx),
    });

    if (activeMessageId === null || userId === null || chatId === null) {
      console.log('No active message ID or user/chat ID, sending new message');
      try {
        const message = await ctx.reply(text, options);
        await this.saveActiveMessageId(ctx, message.message_id);
      } catch (error) {
        console.error('Error sending new message:', error);
      }
      return;
    }

    try {
      console.log(`Editing message ID: ${activeMessageId}, isPhoto: ${isPhoto}, hasPhoto: ${this.isPhotoMessage(ctx)}`);
      if (isPhoto && this.isPhotoMessage(ctx)) {
        await ctx.api.editMessageCaption(userId, activeMessageId, {
          caption: text,
          reply_markup: options.reply_markup,
          parse_mode: options.parse_mode,
        });
      } else if (!isPhoto && this.isPhotoMessage(ctx)) {
        // Фото → текст: удаляем старое сообщение и отправляем новое
        console.log(`Cannot edit photo to text, deleting message ID: ${activeMessageId}`);
        const deleteChatId = ctx.update.callback_query?.message?.chat.id;
        if (deleteChatId) {
          try {
            await ctx.api.deleteMessage(deleteChatId, activeMessageId);
          } catch (deleteError) {
            console.warn('Failed to delete message:', deleteError);
          }
        } else {
          console.warn('No chatId available for deleting message');
        }
        const message = await ctx.reply(text, options);
        await this.saveActiveMessageId(ctx, message.message_id);
      } else {
        await ctx.api.editMessageText(userId, activeMessageId, text, {
          reply_markup: options.reply_markup,
          parse_mode: options.parse_mode,
        });
      }
    } catch (error) {
      console.error('Error in MessageController.reply:', error);
      console.log('Retrying with new message due to edit failure');
      try {
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
    const chatId = ctx.chat?.id ?? ctx.update.callback_query?.message?.chat.id;

    console.log('MessageController.replyWithPhoto called:', {
      activeMessageId,
      userId,
      chatId,
    });

    try {
      if (activeMessageId === null || userId === null || chatId === null) {
        console.log('No active message ID or user/chat ID, sending new photo');
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
      console.log('Retrying with new photo due to edit failure');
      try {
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