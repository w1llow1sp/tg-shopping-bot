import { Bot, Context } from 'grammy';
import { CatalogRepository } from '../catalog/catalog.repository';
import { CartView } from './cart.view';
import { CallbackDataRoutes } from '../../consts';
import { MessageController } from '../../message';
import { RedisClientType } from 'redis';
import { Cart, CartRepository } from './cart.repository';

const addProductRexExp = new RegExp(`^${CallbackDataRoutes.cart}:add:(\\d+)$`);
const delProductRexExp = new RegExp(`^${CallbackDataRoutes.cart}:del:(\\d+)$`);
const incProductRexExp = new RegExp(`^${CallbackDataRoutes.cart}:inc:(\\d+)$`);
const decProductRexExp = new RegExp(`^${CallbackDataRoutes.cart}:dec:(\\d+)$`);

export class CartService {
  private bot: Bot;
  private repository: CartRepository;
  private catalogRepository: CatalogRepository;
  private view: CartView;
  private messageController: MessageController | undefined;
  private redis: RedisClientType;
  private readonly MAX_QUANTITY = 10;
  private readonly PRICE_CACHE_TTL = 24 * 60 * 60;

  constructor(
    bot: Bot,
    repository: CartRepository,
    catalogRepository: CatalogRepository,
    redis: RedisClientType,
    messageController?: MessageController,
  ) {
    this.bot = bot;
    this.repository = repository;
    this.catalogRepository = catalogRepository;
    this.redis = redis;
    this.view = new CartView(catalogRepository);
    this.messageController = messageController;
    this.registerHandlers();

    console.log('CartService constructor called:', {
      hasBot: !!bot,
      hasRepository: !!repository,
      hasCatalogRepository: !!catalogRepository,
      hasRedis: !!redis,
      hasMessageController: !!messageController,
    });
  }

  private registerHandlers(): void {
    this.bot.callbackQuery(CallbackDataRoutes.cart, this.handleCart.bind(this));
    this.bot.callbackQuery(addProductRexExp, this.handleAddProduct.bind(this));
    this.bot.callbackQuery(delProductRexExp, this.handleDeleteProduct.bind(this));
    this.bot.callbackQuery(incProductRexExp, this.handleIncreaseQty.bind(this));
    this.bot.callbackQuery(decProductRexExp, this.handleDecreaseQty.bind(this));
  }

  async handleCart(ctx: Context): Promise<void> {
    if (!this.messageController) {
      console.error('handleCart: messageController is undefined', { ctxUpdate: ctx.update });
      await ctx.reply('Произошла ошибка: сервис сообщений недоступен', {});
      await ctx.answerCallbackQuery();
      return;
    }
    const userId = this.messageController.getUserId(ctx);
    if (!userId) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true);
      await ctx.answerCallbackQuery();
      return;
    }

    try {
      const cart = await this.repository.getCart(userId);
      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      const response = await this.view.renderCartMessage(cart);
      console.log('Render cart response:', response);
      await this.messageController.reply(ctx, response.text, {
        reply_markup: response.reply_markup,
        parse_mode: 'HTML',
      }, true);
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleCart:', error);
      await this.messageController.reply(ctx, 'Произошла ошибка при открытии корзины.', {
        parse_mode: 'HTML',
      }, true);
      await ctx.answerCallbackQuery();
    }
  }

  async handleAddProduct(ctx: Context): Promise<void> {
    console.log('handleAddProduct called with callback:', ctx.callbackQuery?.data);

    if (!this.messageController) {
      console.error('handleAddProduct: messageController is undefined', { ctxUpdate: ctx.update });
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка: сервис сообщений недоступен',
        show_alert: true,
      });
      return;
    }

    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      console.warn('No callback data provided');
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка: данные запроса отсутствуют',
        show_alert: true,
      });
      return;
    }

    const match = callbackData.match(/^cart:add:(\d+)$/);
    const productId = match ? Number(match[1]) : 0;
    const userId = this.messageController.getUserId(ctx);

    if (!userId || !productId) {
      console.warn('Invalid userId or productId:', { userId, productId });
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка: неверный пользователь или продукт',
        show_alert: true,
      });
      return;
    }

    try {
      console.log('Fetching product with ID:', productId);
      const product = await this.catalogRepository.getProductDetail(productId);
      console.log('Product fetched:', product);

      // Проверяем доступность товара
      if (product.itemsavailable <= 0) {
        console.warn('Product is out of stock:', productId);
        await ctx.answerCallbackQuery({
          text: '❌ Товар закончился на складе',
          show_alert: true,
        });
        return;
      }

      const cart = await this.repository.getCart(userId);
      console.log('Cart fetched:', cart);

      if (cart.products[productId]) {
        if (cart.products[productId].qty >= this.MAX_QUANTITY) {
          console.log('Max quantity reached:', productId);
          await ctx.answerCallbackQuery({
            text: `❌ Максимум ${this.MAX_QUANTITY} единиц одного товара`,
            show_alert: true,
          });
          return;
        }
        if (cart.products[productId].qty >= product.itemsavailable) {
          console.log('Not enough stock:', productId);
          await ctx.answerCallbackQuery({
            text: `❌ Недостаточно товара на складе (доступно: ${product.itemsavailable})`,
            show_alert: true,
          });
          return;
        }
        cart.products[productId].qty += 1;
      } else {
        if (product.itemsavailable < 1) {
          console.warn('Not enough stock for new item:', productId);
          await ctx.answerCallbackQuery({
            text: `❌ Недостаточно товара на складе`,
            show_alert: true,
          });
          return;
        }
        cart.products[productId] = { id: productId, qty: 1 };
      }

      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);
      console.log('Cart updated:', cart);

      // Успешное добавление: показываем алерт
      console.log('Sending success alert for product:', product.name);
      await ctx.answerCallbackQuery({
        text: `✅ Товар ${this.escapeText(product.name)} добавлен в корзину!`,
        show_alert: true,
      });
    } catch (error) {
      console.error('Ошибка в handleAddProduct:', error);
      const message =
        error instanceof Error && error.message.includes('Product with ID')
          ? 'Продукт не найден'
          : 'Ошибка при добавлении в корзину';
      console.log('Sending error alert:', message);
      await ctx.answerCallbackQuery({
        text: `❌ ${message}`,
        show_alert: true,
      });
    }
  }

  async handleDeleteProduct(ctx: Context): Promise<void> {
    if (!this.messageController) {
      console.error('handleDeleteProduct: messageController is undefined', { ctxUpdate: ctx.update });
      await ctx.reply('Произошла ошибка: сервис сообщений недоступен', {});
      await ctx.answerCallbackQuery();
      return;
    }

    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true);
      await ctx.answerCallbackQuery();
      return;
    }

    const match = callbackData.match(/^cart:del:(\d+)$/);
    const productId = match ? Number(match[1]) : 0;
    const userId = this.messageController.getUserId(ctx);

    if (!userId || !productId) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true);
      await ctx.answerCallbackQuery();
      return;
    }

    try {
      const cart = await this.repository.getCart(userId);
      if (!cart.products[productId]) {
        await this.messageController.reply(ctx, 'Продукт не найден в корзине', {}, true);
        await ctx.answerCallbackQuery();
        return;
      }

      delete cart.products[productId];
      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      const response = await this.view.renderCartMessage(cart);
      console.log('Render cart response:', response);

      await this.messageController.reply(ctx, response.text, {
        reply_markup: response.reply_markup,
        parse_mode: 'HTML',
      }, true);
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleDeleteProduct:', error);
      await this.messageController.reply(ctx, 'Произошла ошибка при удалении из корзины.', {
        parse_mode: 'HTML',
      }, true);
      await ctx.answerCallbackQuery();
    }
  }

  async handleIncreaseQty(ctx: Context): Promise<void> {
    if (!this.messageController) {
      console.error('handleIncreaseQty: messageController is undefined', { ctxUpdate: ctx.update });
      await ctx.reply('Произошла ошибка: сервис сообщений недоступен', {});
      await ctx.answerCallbackQuery();
      return;
    }

    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true);
      await ctx.answerCallbackQuery();
      return;
    }

    const match = callbackData.match(/^cart:inc:(\d+)$/);
    const productId = match ? Number(match[1]) : 0;
    const userId = this.messageController.getUserId(ctx);

    if (!userId || !productId) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true);
      await ctx.answerCallbackQuery();
      return;
    }

    try {
      const cart = await this.repository.getCart(userId);
      if (!cart.products[productId]) {
        await this.messageController.reply(ctx, 'Продукт не найден в корзине', {}, true);
        await ctx.answerCallbackQuery();
        return;
      }

      if (cart.products[productId].qty >= this.MAX_QUANTITY) {
        await this.messageController.reply(
          ctx,
          `Максимум ${this.MAX_QUANTITY} единиц одного товара`,
          {},
          true,
        );
        await ctx.answerCallbackQuery();
        return;
      }

      cart.products[productId].qty += 1;
      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      const response = await this.view.renderCartMessage(cart);
      console.log('Render cart response:', response);

      await this.messageController.reply(ctx, response.text, {
        reply_markup: response.reply_markup,
        parse_mode: 'HTML',
      }, true);
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleIncreaseQty:', error);
      await this.messageController.reply(ctx, 'Произошла ошибка при изменении количества.', {
        parse_mode: 'HTML',
      }, true);
      await ctx.answerCallbackQuery();
    }
  }

  async handleDecreaseQty(ctx: Context): Promise<void> {
    if (!this.messageController) {
      console.error('handleDecreaseQty: messageController is undefined', { ctxUpdate: ctx.update });
      await ctx.reply('Произошла ошибка: сервис сообщений недоступен', {});
      await ctx.answerCallbackQuery();
      return;
    }

    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true);
      await ctx.answerCallbackQuery();
      return;
    }

    const match = callbackData.match(/^cart:dec:(\d+)$/);
    const productId = match ? Number(match[1]) : 0;
    const userId = this.messageController.getUserId(ctx);

    if (!userId || !productId) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true);
      await ctx.answerCallbackQuery();
      return;
    }

    try {
      const cart = await this.repository.getCart(userId);
      if (!cart.products[productId]) {
        await this.messageController.reply(ctx, 'Продукт не найден в корзине', {}, true);
        await ctx.answerCallbackQuery();
        return;
      }

      if (cart.products[productId].qty > 1) {
        cart.products[productId].qty -= 1;
      } else {
        delete cart.products[productId];
      }
      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      const response = await this.view.renderCartMessage(cart);
      console.log('Render cart response:', response);

      await this.messageController.reply(ctx, response.text, {
        reply_markup: response.reply_markup,
        parse_mode: 'HTML',
      }, true);
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleDecreaseQty:', error);
      await this.messageController.reply(ctx, 'Произошла ошибка при изменении количества.', {
        parse_mode: 'HTML',
      }, true);
      await ctx.answerCallbackQuery();
    }
  }

  private async calculateTotal(cart: Cart): Promise<number> {
    let total = 0;
    for (const product of Object.values(cart.products)) {
      const price = await this.getCachedPrice(product.id);
      total += product.qty * price;
    }
    return total;
  }

  private async getCachedPrice(productId: number): Promise<number> {
    const cacheKey = `product:price:${productId}`;
    const cachedPrice = await this.redis.get(cacheKey);

    if (cachedPrice) {
      return parseFloat(cachedPrice);
    }

    const product = await this.catalogRepository.getProductDetail(productId);
    await this.redis.set(cacheKey, product.price.toString());
    await this.redis.expire(cacheKey, this.PRICE_CACHE_TTL);

    return product.price;
  }

  private escapeText(text: string): string {
    // Экранируем текст для использования в алертах (без форматирования)
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
}