import { Bot, Context } from 'grammy';
import { Cart, CartRepository, ProductCart } from './repository';
import { CartView } from './view';
import { CallbackDataRoutes } from '../../consts';
import { MessageController } from '../../message';

const addProductRexExp = new RegExp(`^${CallbackDataRoutes.cart}:add:(\\d+)$`);
const delProductRexExp = new RegExp(`^${CallbackDataRoutes.cart}:del:(\\d+)$`);

export class CartService {
  private bot: Bot;
  private repository: CartRepository;
  private view: CartView;
  private messageController: MessageController;


  constructor(bot: Bot, repository: CartRepository, messageController: MessageController) {
    this.bot = bot;
    this.repository = repository;
    this.view = new CartView();
    this.messageController = messageController;
    this.registerHandlers();
  }
  private registerHandlers(): void {
    this.bot.callbackQuery(CallbackDataRoutes.cart, this.handleCart.bind(this));
    this.bot.callbackQuery(addProductRexExp, this.handleAddProduct.bind(this));
  }

  async handleCart(ctx: Context): Promise<void> {
    const userId = this.messageController.getUserId(ctx)
    if (userId === null) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true)
      return
    }
    const cart: Cart | null = await this.repository.getCart(userId)
    if (cart === null || (!cart.products)){
      const response = this.view.renderCartMessage(cart);
      await this.messageController.reply(ctx, response.text, { reply_markup: response.reply_markup });
    }

    // TODO: render cart
    const response = this.view.renderCartMessage(cart);
    await this.messageController.reply(ctx, response.text, { reply_markup: response.reply_markup });

  }
  async handleAddProduct(ctx: Context): Promise<void> {
    const match = ctx.callbackQuery?.data?.match(/^cart:add:(\d+)$/);
    const productId = match ? Number(match[1]) : 0;
    if (productId === null) {
      await this.messageController.reply(ctx, 'Продукта не существует', {}, true)
    }
    const userId = this.messageController.getUserId(ctx)
    if (userId === null) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true)
      return
    }
    const cart: Cart | null = await this.repository.getCart(userId)
    if (cart === null) {
      await this.messageController.reply(ctx, 'Произошла ошибка', {}, true)
      return
    }

    const productCart: ProductCart = {id: productId, qty: 1};
    cart.products[productCart.id] = productCart;

    await this.repository.saveCart(userId, cart)

    const response = this.view.renderProductAddedMessage(ctx, productId);
    await this.messageController.reply(ctx, response.text, { reply_markup: response.reply_markup });

  }
}