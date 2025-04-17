import { Product } from './model';
import { InlineKeyboard } from 'grammy';

export class CatalogView {
  private productsPerPage: number;

  constructor(productsPerPage: number = 4) {
    this.productsPerPage = productsPerPage;
  }

  renderCatalog(products: Product[], currentPage: number, totalProducts: number) {
    const text = products.length
      ? `Каталог товаров (страница ${currentPage + 1}):`
      : 'Каталог пуст :(';

    const keyboard = new InlineKeyboard();

    // Добавляем кнопки для продуктов
    products.forEach((product) => {
      keyboard.text(`${product.name} (${product.price} ₽)`, `product_${product.id}`).row();
    });

    // Добавляем кнопки "Корзина" и "Главная"
    keyboard.text('Корзина', 'cart').text('Главная', 'main').row();

    // Логика пагинации
    const totalPages = Math.ceil(totalProducts / this.productsPerPage);
    if (totalPages > 1) {
      if (currentPage === 0) {
        keyboard.text('>>', `catalog_next_${currentPage + 1}`);
      } else if (currentPage === totalPages - 1) {
        keyboard.text('<<', `catalog_prev_${currentPage - 1}`);
      } else {
        keyboard.text('<<', `catalog_prev_${currentPage - 1}`).text('>>', `catalog_next_${currentPage + 1}`);
      }
    }

    return { text, reply_markup: keyboard };
  }

  renderProductPlaceholder(productId: number): string {
    return `Вы выбрали продукт с ID ${productId}. Подробная информация скоро будет доступна!`;
  }

  renderErrorMessage(): string {
    return 'Произошла ошибка при загрузке каталога. Попробуйте позже.';
  }
}