import { Context, InlineKeyboard } from 'grammy';
import { Response } from '../menu/menu.view';
import { CallbackDataRoutes } from '../../consts';
import { Cart } from './cart.repository';
import { CatalogRepository } from '../catalog/catalog.repository';

export class CartView {
  private catalogRepository: CatalogRepository;

  constructor(catalogRepository: CatalogRepository) {
    this.catalogRepository = catalogRepository;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  async renderCartMessage(cart: Cart | null): Promise<Response> {
    if (!cart || Object.keys(cart.products).length === 0) {
      const text = '🧺 Ваша корзина пуста';
      const reply_markup = new InlineKeyboard()
        .text('Вернуться в меню', CallbackDataRoutes.main)
        .text('Каталог', `${CallbackDataRoutes.catalog}:0`);
      return { text, reply_markup };
    }

    let text = '🧺 Ваша корзина:\n\n';
    const keyboard = new InlineKeyboard();

    for (const product of Object.values(cart.products)) {
      const productDetail = await this.catalogRepository.getProductDetail(product.id);
      const productName = this.escapeMarkdown(productDetail.name);
      text += `${productName} - ${product.qty} x ${productDetail.price} ₽ = ${
        product.qty * productDetail.price
      } ₽\n`;
      keyboard
        .text(`${productName}`, `${CallbackDataRoutes.product}:${product.id}`)
        .row()
        .text('❌️', `${CallbackDataRoutes.cart}:del:${product.id}`)
        .text('-', `${CallbackDataRoutes.cart}:dec:${product.id}`)
        .text('+', `${CallbackDataRoutes.cart}:inc:${product.id}`)
        .row();
    }

    text += `\nИтого: ${cart.total} ₽`;

    keyboard
      .text('Вернуться в меню', CallbackDataRoutes.main)
      .text('Каталог', `${CallbackDataRoutes.catalog}:0`)
      .text('Оформить заказ')
      .row();

    return { text, reply_markup: keyboard };
  }

  async renderProductAddedMessage(ctx: Context, productId: number): Promise<Response> {
    const product = await this.catalogRepository.getProductDetail(productId);
    const keyboard = new InlineKeyboard()
      .text('❌', `${CallbackDataRoutes.cart}:del:${productId}`)
      .text('+', `${CallbackDataRoutes.cart}:inc:${productId}`)
      .text('-', `${CallbackDataRoutes.cart}:dec:${productId}`)
      .row()
      .text('Вернуться в меню', CallbackDataRoutes.main)
      .text('Каталог', `${CallbackDataRoutes.catalog}:0`);

    const productName = this.escapeMarkdown(product.name);
    return {
      text: `✅ ${productName} добавлен в корзину!`,
      reply_markup: keyboard,
    };
  }
}