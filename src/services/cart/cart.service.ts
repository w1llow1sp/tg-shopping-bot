import { Bot, Context, InlineKeyboard } from 'grammy';
import { CatalogRepository } from '../catalog/catalog.repository';
import { CatalogService } from '../catalog/catalog.service';
import { CartView } from './cart.view';
import { CallbackDataRoutes } from '../../consts';
import { MessageController } from '../../message';
import { RedisClientType } from 'redis';
import { Cart, CartRepository } from './cart.repository';

const addProductRexExp = new RegExp(`^${CallbackDataRoutes.cartAdd}:(\\d+)$`);
const delProductRexExp = new RegExp(`^${CallbackDataRoutes.cartDel}:(\\d+)$`);
const incProductRexExp = new RegExp(`^${CallbackDataRoutes.cartInc}:(\\d+)$`);
const decProductRexExp = new RegExp(`^${CallbackDataRoutes.cartDec}:(\\d+)$`);

export class CartService {
  private bot: Bot;
  private repository: CartRepository;
  private catalogRepository: CatalogRepository;
  private catalogService: CatalogService;
  private view: CartView;
  private messageController: MessageController;
  private redis: RedisClientType;
  private readonly MAX_QUANTITY = 10;
  private readonly PRICE_CACHE_TTL = 24 * 60 * 60;

  constructor(
    bot: Bot,
    repository: CartRepository,
    catalogRepository: CatalogRepository,
    catalogService: CatalogService,
    redis: RedisClientType,
    messageController: MessageController,
  ) {
    this.bot = bot;
    this.repository = repository;
    this.catalogRepository = catalogRepository;
    this.catalogService = catalogService;
    this.redis = redis;
    this.view = new CartView(catalogRepository);
    this.messageController = messageController;
    this.registerHandlers();

    console.log('CartService constructor called:', {
      hasBot: !!bot,
      hasRepository: !!repository,
      hasCatalogRepository: !!catalogRepository,
      hasCatalogService: !!catalogService,
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
    const userId = this.messageController.getUserId(ctx);
    if (!userId) {
      console.warn('handleCart: Invalid userId', { ctxUpdate: ctx.update });
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка: неверный пользователь',
        show_alert: true,
      });
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
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка при открытии корзины',
        show_alert: true,
      });
    }
  }

  async handleAddProduct(ctx: Context): Promise<void> {
    console.log('handleAddProduct called with callback:', ctx.callbackQuery?.data);

    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      console.warn('No callback data provided');
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка: данные запроса отсутствуют',
        show_alert: true,
      });
      return;
    }

    const match = callbackData.match(/^cart:add:(\d+)$/); // Исправили на cart:add
    console.log('Callback parse result:', { callbackData, match });
    const productId = match ? Number(match[1]) : 0;
    const userId = this.messageController.getUserId(ctx);
    console.log('Parsed userId and productId:', { userId, productId });

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

      console.log('Updating product card for product:', productId);
      const message = ctx.callbackQuery?.message;
      if (message) {
        try {
          const [neighbors, prevCallback] = await Promise.all([
            this.catalogRepository.getNeighborProducts(productId),
            this.messageController.getPreviousCallbackData(ctx),
          ]);
          const backCallback: string | undefined = prevCallback ?? undefined;

          const response = this.catalogService.getView().renderProduct(
            product,
            neighbors.prevId,
            neighbors.nextId,
            backCallback,
            true,
          );

          if ('photo' in response) {
            console.log('Editing photo message with updated keyboard');
            await ctx.editMessageMedia(
              {
                type: 'photo',
                media: response.photo,
                caption: response.caption,
                parse_mode: 'HTML',
              },
              { reply_markup: response.reply_markup },
            );
          } else {
            console.log('Editing text message with updated keyboard');
            await ctx.editMessageText(response.text, {
              reply_markup: response.reply_markup,
              parse_mode: 'HTML',
            });
          }
        } catch (editError) {
          console.warn('Failed to edit product card:', editError);
        }
      }

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
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      console.warn('No callback data provided');
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка: данные запроса отсутствуют',
        show_alert: true,
      });
      return;
    }

    const match = callbackData.match(/^cartDel:(\d+)$/);
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
      const cart = await this.repository.getCart(userId);
      if (!cart.products[productId]) {
        console.log('Product not found in cart:', productId);
        await ctx.answerCallbackQuery({
          text: '❌ Продукт не найден в корзине',
          show_alert: true,
        });
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
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка при удалении из корзины',
        show_alert: true,
      });
    }
  }

  async handleIncreaseQty(ctx: Context): Promise<void> {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      console.warn('No callback data provided');
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка: данные запроса отсутствуют',
        show_alert: true,
      });
      return;
    }

    const match = callbackData.match(/^cartInc:(\d+)$/);
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
      const cart = await this.repository.getCart(userId);
      if (!cart.products[productId]) {
        console.log('Product not found in cart:', productId);
        await ctx.answerCallbackQuery({
          text: '❌ Продукт не найден в корзине',
          show_alert: true,
        });
        return;
      }

      if (cart.products[productId].qty >= this.MAX_QUANTITY) {
        console.log('Max quantity reached:', productId);
        await ctx.answerCallbackQuery({
          text: `❌ Максимум ${this.MAX_QUANTITY} единиц одного товара`,
          show_alert: true,
        });
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
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка при изменении количества',
        show_alert: true,
      });
    }
  }

  async handleDecreaseQty(ctx: Context): Promise<void> {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      console.warn('No callback data provided');
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка: данные запроса отсутствуют',
        show_alert: true,
      });
      return;
    }

    const match = callbackData.match(/^cartDec:(\d+)$/);
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
      const cart = await this.repository.getCart(userId);
      if (!cart.products[productId]) {
        console.log('Product not found in cart:', productId);
        await ctx.answerCallbackQuery({
          text: '❌ Продукт не найден в корзине',
          show_alert: true,
        });
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
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка при изменении количества',
        show_alert: true,
      });
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
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
}