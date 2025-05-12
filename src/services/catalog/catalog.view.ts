import { Product } from './catalog.repository';
import { InlineKeyboard } from 'grammy';
import { CallbackDataRoutes } from '../../consts';

export type CatalogResponse =
  | { text: string; reply_markup: InlineKeyboard }
  | { photo: string; caption: string; reply_markup: InlineKeyboard };

export class CatalogView {
  private productsPerPage: number;

  constructor(productsPerPage: number = 4) {
    this.productsPerPage = productsPerPage;
  }

  private escapeMarkdown(text: string): string {
    // Экранируем все специальные символы для MarkdownV2, включая точку
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  renderCatalog(
    products: Product[],
    currentPage: number,
    totalProducts: number,
  ): CatalogResponse {
    const pageText = this.escapeMarkdown(`страница ${currentPage + 1}`);
    const text = products.length
      ? `🥦 Каталог товаров \\(${pageText}\\):`
      : 'Каталог пуст \\:(';

    const keyboard = new InlineKeyboard();

    products.forEach((product) => {
      const productName = this.escapeMarkdown(product.name);
      keyboard
        .text(
          `${productName} \(${this.escapeMarkdown(product.price.toString())} ₽\)`,
          `${CallbackDataRoutes.product}:${product.id}`,
        )
        .row();
    });

    keyboard
      .text('Корзина', CallbackDataRoutes.cart)
      .text('Главная', CallbackDataRoutes.main)
      .row();

    const totalPages = Math.ceil(totalProducts / this.productsPerPage);
    if (totalPages > 1) {
      if (currentPage === 0) {
        keyboard.text('>>', `${CallbackDataRoutes.catalog}:${currentPage + 1}`);
      } else if (currentPage === totalPages - 1) {
        keyboard.text('<<', `${CallbackDataRoutes.catalog}:${currentPage - 1}`);
      } else {
        keyboard
          .text('<<', `${CallbackDataRoutes.catalog}:${currentPage - 1}`)
          .text('>>', `${CallbackDataRoutes.catalog}:${currentPage + 1}`);
      }
    }

    return { text, reply_markup: keyboard };
  }

  renderProduct(
    product: Product,
    prevProductId: number | null = null,
    nextProductId: number | null = null,
    backCallback?: string,
  ): CatalogResponse {
    const keyboard = new InlineKeyboard();

    // Навигационные кнопки "<<" и ">>"
    if (prevProductId || nextProductId) {
      keyboard
        .text(
          prevProductId ? '<<' : ' ',
          prevProductId ? `${CallbackDataRoutes.product}:${prevProductId}` : 'noop',
        )
        .text(
          nextProductId ? '>>' : ' ',
          nextProductId ? `${CallbackDataRoutes.product}:${nextProductId}` : 'noop',
        )
        .row();
    }

    // Кнопка "Добавить в корзину"
    keyboard
      .text('Добавить в корзину 🧺', `${CallbackDataRoutes.cart}:add:${product.id}`)
      .row();

    // Кнопка "Назад" (всегда отображается)
    const backCallbackValue = backCallback || `${CallbackDataRoutes.catalog}:0`;
    keyboard.text('<< 🥦 Назад', backCallbackValue).row();

    const name = this.escapeMarkdown(product.name);
    const description = this.escapeMarkdown(product.description || 'Нет описания');
    const price = this.escapeMarkdown(product.price.toString());
    const itemsavailable = this.escapeMarkdown(product.itemsavailable.toString());

    const caption = `**${name}**\n\n` +
      `**Описание:**\n${description}\n\n` +
      `**Цена:** ${price} ₽\n` +
      `**Доступное количество:** ${itemsavailable}`;

    // Логируем текст для диагностики
    console.log('Product caption/text:', caption);

    if (product.image && product.image.startsWith('http')) {
      return {
        photo: product.image,
        caption,
        reply_markup: keyboard,
      };
    }

    return {
      text: caption,
      reply_markup: keyboard,
    };
  }

  renderErrorMessage(): string {
    return 'Произошла ошибка при загрузке каталога. Попробуйте позже.';
  }
}