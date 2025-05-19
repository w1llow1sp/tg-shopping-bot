import { Bot, Context } from 'grammy';
import { CatalogRepository } from '../catalog/catalog.repository';
import { CatalogService } from '../catalog/catalog.service';
import { CartView } from './cart.view';
import { MessageController } from '../../message';
import { RedisClientType } from 'redis';
import { Cart, CartRepository } from './cart.repository';
import { CallbackDataRoutes } from '../../consts';
import {
  CartCallbackRegex,
  CartConfig,
  CartErrorMessages,
} from './cart.dictionaries';

// Сервис для обработки логики корзины
// управляет добавлением, удалением и изменением товаров в корзине
export class CartService {
  private bot: Bot;
  private repository: CartRepository;
  private catalogRepository: CatalogRepository;
  private catalogService: CatalogService;
  private view: CartView;
  private messageController: MessageController;
  private redis: RedisClientType;

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

    // Логирование инициализации сервиса
    console.log('CartService инициализирован:', {
      hasBot: !!bot,
      hasRepository: !!repository,
      hasCatalogRepository: !!catalogRepository,
      hasCatalogService: !!catalogService,
      hasRedis: !!redis,
      hasMessageController: !!messageController,
    });
  }

  // --- Регистрация обработчиков ---

  // Регистрация обработчиков callback-запросов
  private registerHandlers(): void {
    // Обработчик для открытия корзины
    this.bot.callbackQuery(CallbackDataRoutes.cart, this.handleCart.bind(this));
    // Обработчики для действий с продуктами с использованием регулярных выражений
    this.bot.callbackQuery(
      CartCallbackRegex.ADD_PRODUCT,
      this.handleAddProduct.bind(this),
    );
    this.bot.callbackQuery(
      CartCallbackRegex.DELETE_PRODUCT,
      this.handleDeleteProduct.bind(this),
    );
    this.bot.callbackQuery(
      CartCallbackRegex.INCREASE_QTY,
      this.handleIncreaseQty.bind(this),
    );
    this.bot.callbackQuery(
      CartCallbackRegex.DECREASE_QTY,
      this.handleDecreaseQty.bind(this),
    );
  }

  // --- Вспомогательные методы ---

  // Извлекает ID продукта из callback-данных
  private extractProductId(callbackData: string): number {
    const match = callbackData.match(/:(\d+)$/);
    return match ? Number(match[1]) : 0;
  }

  // --- Обработчики действий ---

  // Обработка запроса на открытие корзины
  async handleCart(ctx: Context): Promise<void> {
    // Проверяем наличие userId
    const userId = this.messageController.getUserId(ctx);
    if (!userId) {
      console.warn('handleCart: Неверный userId', { ctxUpdate: ctx.update });
      await ctx.answerCallbackQuery({
        text: CartErrorMessages.HANDLE_CART_WRONG_USER as string,
        show_alert: true,
      });
      return;
    }

    try {
      // Получаем корзину, пересчитываем итог и сохраняем
      const cart = await this.repository.getCart(userId);
      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      // Рендерим сообщение с содержимым корзины
      const response = await this.view.renderCartMessage(cart);
      console.log('Рендеринг корзины:', response);

      await this.messageController.reply(
        ctx,
        response.text,
        {
          reply_markup: response.reply_markup,
          parse_mode: 'HTML',
        },
        true,
      );

      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleCart:', error);
      await ctx.answerCallbackQuery({
        text:CartErrorMessages.HANDLE_CART_CART_OPEN_ERROR as string,
        show_alert: true,
      });
    }
  }

  // Обработка добавления продукта в корзину
  async handleAddProduct(ctx: Context): Promise<void> {
    // Проверяем наличие callback-данных
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      console.warn('Отсутствуют данные callback');
      await ctx.answerCallbackQuery({
        text: CartErrorMessages.REQUEST_ERROR as string,
        show_alert: true,
      });
      return;
    }

    // Извлекаем userId и productId
    const productId = this.extractProductId(callbackData);
    const userId = this.messageController.getUserId(ctx);

    if (!userId || !productId) {
      console.warn('Неверный userId или productId:', { userId, productId });
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка: неверный пользователь или продукт',
        show_alert: true,
      });
      return;
    }

    try {
      // Проверяем наличие продукта на складе
      const product = await this.catalogRepository.getProductDetail(productId);
      if (product.itemsavailable <= 0) {
        console.warn('Товар отсутствует на складе:', productId);
        await ctx.answerCallbackQuery({
          text: '❌ Товар закончился на складе',
          show_alert: true,
        });
        return;
      }

      // Получаем корзину пользователя
      const cart = await this.repository.getCart(userId);
      if (cart.products[productId]) {
        // Проверяем наличие на складе
        if (cart.products[productId].qty >= product.itemsavailable) {
          console.log('Недостаточно товара на складе:', productId);
          await ctx.answerCallbackQuery({
            text: `� maps: Недостаточно товара на складе (доступно: ${product.itemsavailable})`,
            show_alert: true,
          });
          return;
        }
        // Закомментирована проверка максимального количества
        /*
        if (cart.products[productId].qty >= CartConfig.MAX_QUANTITY) {
          console.log('Достигнуто максимальное количество:', productId);
          await ctx.answerCallbackQuery({
            text: `❌ Максимум ${CartConfig.MAX_QUANTITY} единиц одного товара`,
            show_alert: true,
          });
          return;
        }
        */
        cart.products[productId].qty += 1;
      } else {
        // Добавляем новый продукт
        if (product.itemsavailable < 1) {
          console.warn('Недостаточно товара для добавления:', productId);
          await ctx.answerCallbackQuery({
            text: `❌ Недостаточно товара на складе`,
            show_alert: true,
          });
          return;
        }
        cart.products[productId] = { id: productId, qty: 1 };
      }

      // Обновляем итог и сохраняем корзину
      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      // Обновляем карточку продукта в чате
      const message = ctx.callbackQuery?.message;
      if (message) {
        try {
          const [neighbors, prevCallback] = await Promise.all([
            this.catalogRepository.getNeighborProducts(productId),
            this.messageController.getPreviousCallbackData(ctx),
          ]);
          const backCallback: string | undefined = prevCallback ?? undefined;

          const response = this.catalogService
            .getView()
            .renderProduct(
              product,
              neighbors.prevId,
              neighbors.nextId,
              backCallback,
              true,
            );

          if ('photo' in response) {
            console.log('Обновление фото-сообщения');
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
            console.log('Обновление текстового сообщения');
            await ctx.editMessageText(response.text, {
              reply_markup: response.reply_markup,
              parse_mode: 'HTML',
            });
          }
        } catch (editError) {
          console.warn('Ошибка обновления карточки продукта:', editError);
        }
      }

      // Уведомляем об успешном добавлении
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
      await ctx.answerCallbackQuery({
        text: `❌ ${message}`,
        show_alert: true,
      });
    }
  }

  // Обработка удаления продукта из корзины
  async handleDeleteProduct(ctx: Context): Promise<void> {
    // Проверяем наличие callback-данных
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      console.warn('Отсутствуют данные callback');
      await ctx.answerCallbackQuery({
        text:CartErrorMessages.REQUEST_ERROR as string ,
        show_alert: true,
      });
      return;
    }

    // Извлекаем userId и productId
    const productId = this.extractProductId(callbackData);
    const userId = this.messageController.getUserId(ctx);

    if (!userId || !productId) {
      console.warn('Неверный userId или productId:', { userId, productId });
      await ctx.answerCallbackQuery({
        text:CartErrorMessages.WRONG_USER_OR_PRODUCT as string,
        show_alert: true,
      });
      return;
    }

    try {
      // Получаем корзину и проверяем наличие продукта
      const cart = await this.repository.getCart(userId);
      if (!cart.products[productId]) {
        console.log('Продукт не найден в корзине:', productId);
        await ctx.answerCallbackQuery({
          text:CartErrorMessages.PRODUCT_NOT_FOUND_IN_CART as string,
          show_alert: true,
        });
        return;
      }

      // Удаляем продукт и обновляем корзину
      delete cart.products[productId];
      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      // Рендерим обновленное сообщение корзины
      const response = await this.view.renderCartMessage(cart);
      await this.messageController.reply(
        ctx,
        response.text,
        {
          reply_markup: response.reply_markup,
          parse_mode: 'HTML',
        },
        true,
      );
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleDeleteProduct:', error);
      await ctx.answerCallbackQuery({
        text:CartErrorMessages.HANDLE_DELETE_PRODUCT_DELETE_ITEM_ERROR as string,
        show_alert: true,
      });
    }
  }

  // Обработка увеличения количества продукта
  async handleIncreaseQty(ctx: Context): Promise<void> {
    // Проверяем наличие callback-данных
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      console.warn('Отсутствуют данные callback');
      await ctx.answerCallbackQuery({
        text: CartErrorMessages.REQUEST_ERROR as string,
        show_alert: true,
      });
      return;
    }

    // Извлекаем userId и productId
    const productId = this.extractProductId(callbackData);
    const userId = this.messageController.getUserId(ctx);

    if (!userId || !productId) {
      console.warn('Неверный userId или productId:', { userId, productId });
      await ctx.answerCallbackQuery({
        text: CartErrorMessages.WRONG_USER_OR_PRODUCT as string ,
        show_alert: true,
      });
      return;
    }

    try {
      // Получаем корзину и проверяем наличие продукта
      const cart = await this.repository.getCart(userId);
      if (!cart.products[productId]) {
        console.log('Продукт не найден в корзине:', productId);
        await ctx.answerCallbackQuery({
          text: CartErrorMessages.PRODUCT_NOT_FOUND_IN_CART as string ,
          show_alert: true,
        });
        return;
      }

      // Проверяем наличие на складе
      const product = await this.catalogRepository.getProductDetail(productId);
      if (cart.products[productId].qty >= product.itemsavailable) {
        console.log('Недостаточно товара на складе:', productId);
        await ctx.answerCallbackQuery({
          text: `${CartErrorMessages.HANDLE_ADD_PRODUCT_PRODUCT_IS_NOT_ENOUGHT} (доступно: ${product.itemsavailable})`,
          show_alert: true,
        });
        return;
      }

      // Закомментирована проверка максимального количества
      /*
      if (cart.products[productId].qty >= CartConfig.MAX_QUANTITY) {
        console.log('Достигнуто максимальное количество:', productId);
        await ctx.answerCallbackQuery({
          text: `❌ Максимум ${CartConfig.MAX_QUANTITY} единиц одного товара`,
          show_alert: true,
        });
        return;
      }
      */

      // Увеличиваем количество и обновляем корзину
      cart.products[productId].qty += 1;
      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      // Рендерим обновленное сообщение корзины
      const response = await this.view.renderCartMessage(cart);
      await this.messageController.reply(
        ctx,
        response.text,
        {
          reply_markup: response.reply_markup,
          parse_mode: 'HTML',
        },
        true,
      );
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleIncreaseQty:', error);
      await ctx.answerCallbackQuery({
        text: CartErrorMessages.HANDLE_INCREASE_QTY_QUANTITY_CHANGE_ERROR as string,
        show_alert: true,
      });
    }
  }

  // Обработка уменьшения количества продукта
  async handleDecreaseQty(ctx: Context): Promise<void> {
    // Проверяем наличие callback-данных
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) {
      console.warn('Отсутствуют данные callback');
      await ctx.answerCallbackQuery({
        text:CartErrorMessages.REQUEST_ERROR as string,
        show_alert: true,
      });
      return;
    }

    // Извлекаем userId и productId
    const productId = this.extractProductId(callbackData);
    const userId = this.messageController.getUserId(ctx);

    if (!userId || !productId) {
      console.warn('Неверный userId или productId:', { userId, productId });
      await ctx.answerCallbackQuery({
        text:CartErrorMessages.WRONG_USER_OR_PRODUCT as string,
        show_alert: true,
      });
      return;
    }

    try {
      // Получаем корзину и проверяем наличие продукта
      const cart = await this.repository.getCart(userId);
      if (!cart.products[productId]) {
        console.log('Продукт не найден в корзине:', productId);
        await ctx.answerCallbackQuery({
          text:CartErrorMessages.PRODUCT_NOT_FOUND_IN_CART as string,
          show_alert: true,
        });
        return;
      }

      // Уменьшаем количество или удаляем продукт
      if (cart.products[productId].qty > 1) {
        cart.products[productId].qty -= 1;
      } else {
        delete cart.products[productId];
      }
      cart.total = await this.calculateTotal(cart);
      await this.repository.saveCart(userId, cart);

      // Рендерим обновленное сообщение корзины
      const response = await this.view.renderCartMessage(cart);
      await this.messageController.reply(
        ctx,
        response.text,
        {
          reply_markup: response.reply_markup,
          parse_mode: 'HTML',
        },
        true,
      );
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleDecreaseQty:', error);
      await ctx.answerCallbackQuery({
        text: CartErrorMessages.HANDLE_INCREASE_QTY_QUANTITY_CHANGE_ERROR as string,
        show_alert: true,
      });
    }
  }

  // --- Вспомогательные методы ---

  // Расчет общей стоимости корзины
  private async calculateTotal(cart: Cart): Promise<number> {
    let total = 0;
    for (const product of Object.values(cart.products)) {
      const price = await this.getCachedPrice(product.id);
      total += product.qty * price;
    }
    return total;
  }

  // Получение цены продукта с кэшированием
  private async getCachedPrice(productId: number): Promise<number> {
    const priceCacheKey = `product:price:${productId}`;
    const cachedPrice = await this.redis.get(priceCacheKey);

    if (cachedPrice) {
      return parseFloat(cachedPrice);
    }

    const product = await this.catalogRepository.getProductDetail(productId);
    await this.redis.set(priceCacheKey, product.price.toString());
    await this.redis.expire(priceCacheKey, CartConfig.PRICE_CACHE_TTL_SECONDS);

    return product.price;
  }

  // Экранирование текста для Telegram
  private escapeText(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
}
