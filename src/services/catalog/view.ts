import { Product } from './repository';
import { InlineKeyboard } from 'grammy';
import { CallbackDataRoutes } from '../../consts';

export class CatalogView {
  private productsPerPage: number;

  constructor(productsPerPage: number = 4) {
    this.productsPerPage = productsPerPage;
  }

  renderCatalog(products: Product[], currentPage: number, totalProducts: number) {
    const text = products.length
      ? `🥦Каталог товаров (страница ${currentPage + 1}):`
      : 'Каталог пуст :(';

    const keyboard = new InlineKeyboard();

    // Добавляем кнопки для продуктов
    products.forEach((product) => {
      keyboard.text(
        `${product.name} (${product.price} ₽)`,
        `${CallbackDataRoutes.product}:${product.id}`).row();
    });

    // Добавляем кнопки "Корзина" и "Главная"
    keyboard
      .text('Корзина', CallbackDataRoutes.cart)
      .text('Главная', CallbackDataRoutes.main).row();

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

  renderProduct(product: Product) {
    const keyboard = new InlineKeyboard();

    keyboard
      .text('Добавить в корзину 🧺', CallbackDataRoutes.cart + ":add" + `:${product.id}`)
      .row();
    const text = `**${product.name}**\n\n${product.description}\n\n${product.price}`;
    return { text, reply_markup: keyboard };
  }

  renderErrorMessage(): string {
    return 'Произошла ошибка при загрузке каталога. Попробуйте позже.';
  }
}