
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

    // Добавляем кнопки для продуктов с экранированием имени
    products.forEach((product) => {
      const productName = this.escapeMarkdown(product.name);
      keyboard
        .text(
          `${productName} \(${product.price} ₽\)`,
          `${CallbackDataRoutes.product}:${product.id}`,
        )
        .row();
    });

    // Добавляем кнопки "Корзина" и "Главная"
    keyboard
      .text('Корзина', CallbackDataRoutes.cart)
      .text('Главная', CallbackDataRoutes.main)
      .row();

    // Логика пагинации
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

  renderProduct(product: Product): CatalogResponse {
    const keyboard = new InlineKeyboard()
      .text('Добавить в корзину 🧺', `${CallbackDataRoutes.cart}:add:${product.id}`)
      .row();

    const name = this.escapeMarkdown(product.name);
    const description = this.escapeMarkdown(product.description);

    const caption = `**${name}**\n\n` +
      `**Описание:**\n${description}\n\n` +
      `**Цена:** ${product.price} ₽\n` +
      `**Доступное количество:** ${product.itemsavailable}`;

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
    return 'Произошла ошибка при загрузке каталога\\. Попробуйте позже\\.';
  }
}