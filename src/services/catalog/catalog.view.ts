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

  private escapeHTML(text: string): string {
    // Экранируем специальные символы для HTML, включая дополнительные случаи
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  renderCatalog(
    products: Product[],
    currentPage: number,
    totalProducts: number,
  ): CatalogResponse {
    const pageText = this.escapeHTML(`страница ${currentPage + 1}`);
    const text = products.length
      ? `<b>🥦 Каталог товаров (${pageText}):</b>`
      : 'Каталог пуст :(';

    const keyboard = new InlineKeyboard();

    products.forEach((product) => {
      const productName = this.escapeHTML(product.name);
      keyboard
        .text(
          `${productName} (${this.escapeHTML(product.price.toString())} ₽)`,
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

    const name = this.escapeHTML(product.name || '');
    const description = this.escapeHTML(product.description || 'Нет описания');
    const price = this.escapeHTML(product.price?.toString() || '0');
    const itemsavailable = this.escapeHTML(product.itemsavailable?.toString() || '0');

    const caption = `<b>${name}</b>\n\n` +
      `<b>Описание:</b>\n${description}\n\n` +
      `<b>Цена:</b> ${price} ₽\n` +
      `<b>Доступное количество:</b> ${itemsavailable}`;

    // Логируем текст и его длину для диагностики
    console.log('Product caption/text:', caption);
    console.log('Caption length (bytes):', Buffer.byteLength(caption, 'utf8'));

    // Проверяем, является ли URL изображения валидным
    const isValidImageUrl = product.image && /^https?:\/\/.*\.(jpg|jpeg|png|gif)$/i.test(product.image);

    if (isValidImageUrl) {
      return {
        photo: product.image,
        caption,
        reply_markup: keyboard,
      };
    }

    console.warn('Invalid or missing image URL, rendering text-only:', product.image);
    return {
      text: caption,
      reply_markup: keyboard,
    };
  }

  renderErrorMessage(): string {
    return 'Произошла ошибка при загрузке каталога. Попробуйте позже.';
  }
}