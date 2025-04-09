import { catalog } from '../data/catalog';
import { catalogKeyboard, cartKeyboard } from './keyboards';

export function showCatalog(ctx: any, page: number) {
    const itemsPerPage = 5;
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = catalog.slice(start, end);

    const buttons = paginatedItems.map((item) => [{ text: item.name, callback_data: `item_${item.id}` }]);
    const keyboard = catalogKeyboard(page, catalog.length);
    keyboard.reply_markup.inline_keyboard.unshift(...buttons);

    ctx.reply('Выберите товар:', keyboard);
}

export function showCart(ctx: any) {
    // Здесь будет логика корзины
    ctx.reply('Ваша корзина:', cartKeyboard);
}

export function showCheckout(ctx: any) {
    ctx.reply(
        `Нажимая оплатить, я даю согласие на обработку персональных данных.\n` +
        `Ваш телеграм nickname будет использоваться для связи с вами.\n` +
        `Для связи с продавцом @tg_nickname`,
        {
            reply_markup: {
                inline_keyboard: [[{ text: 'Оформить (100 руб.)', callback_data: 'pay' }]],
            },
        }
    );
}
