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
        parse_mode: 'MarkdownV2',
      }, true); // addNavigationButtons = true
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleCart:', error);
      await this.messageController.reply(ctx, 'Произошла ошибка при открытии корзины.', {
        parse_mode: 'MarkdownV2',
      }, true);
      await ctx.answerCallbackQuery();
    }
  }

  async handleAddProduct(ctx: Context): Promise<void> {
    if (!this.messageController) {
      console.error('handleAddProduct: messageController is undefined', { ctxUpdate: ctx.update });
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

    const match = callbackData.match(/^cart:add:(\d+)$/);
    const productId = match ? Number(match[1]) : 0;
    const userId = this.messageController.getUserId(ctx);

    if (!userId || !productId) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true);
      await ctx.answerCallbackQuery();
      return;
    }

    try {
      await this.catalogRepository.getProductDetail(productId);

      const cart = await this.repository.getCart(userId);

      if (cart.products[productId]) {
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
      } else {
        cart.products[productId] = { id: productId, qty: 1 };
      }

      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      const response = await this.view.renderProductAddedMessage(ctx, productId);
      console.log('Render product added response:', response);

      await this.messageController.reply(ctx, response.text, {
        reply_markup: response.reply_markup,
        parse_mode: 'MarkdownV2',
      }, true); // addNavigationButtons = true
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleAddProduct:', error);
      const message =
        error instanceof Error && error.message.includes('Product with ID')
          ? 'Продукт не найден'
          : 'Произошла ошибка при добавлении в корзину';
      await this.messageController.reply(ctx, message, {}, true);
      await ctx.answerCallbackQuery();
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
        parse_mode: 'MarkdownV2',
      }, true); // addNavigationButtons = true
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleDeleteProduct:', error);
      await this.messageController.reply(ctx, 'Произошла ошибка при удалении из корзины.', {
        parse_mode: 'MarkdownV2',
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
        parse_mode: 'MarkdownV2',
      }, true); // addNavigationButtons = true
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleIncreaseQty:', error);
      await this.messageController.reply(ctx, 'Произошла ошибка при изменении количества.', {
        parse_mode: 'MarkdownV2',
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
        parse_mode: 'MarkdownV2',
      }, true); // addNavigationButtons = true
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleDecreaseQty:', error);
      await this.messageController.reply(ctx, 'Произошла ошибка при изменении количества.', {
        parse_mode: 'MarkdownV2',
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
}