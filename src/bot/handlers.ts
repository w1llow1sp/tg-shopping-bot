import { Telegraf } from 'telegraf';
import { showCatalog, showCart, showCheckout } from './scenes';
import { mainKeyboard, catalogKeyboard, cartKeyboard } from './keyboards';
import { CartItem } from '../types';

export function setupHandlers(bot: Telegraf) {
    bot.start((ctx) => ctx.reply('Добро пожаловать в магазин!', mainKeyboard));
    bot.hears('Каталог', (ctx) => showCatalog(ctx, 0));
    bot.hears('Корзина', (ctx) => showCart(ctx));
    bot.hears('Заказы', (ctx) => ctx.reply('Ваши заказы (пока пусто).'));

    bot.action(/catalog_(\d+)/, (ctx) => showCatalog(ctx, parseInt(ctx.match[1])));
    bot.action(/item_(\d+)/, (ctx) => {
        const itemId = parseInt(ctx.match[1]);
        ctx.reply('Показ товара ' + itemId); // Добавить логику
    });
    bot.action(/add_(\d+)/, (ctx) => {
        const itemId = parseInt(ctx.match[1]);
        ctx.reply('Товар добавлен в корзину'); // Добавить логику
    });
    bot.action('checkout', showCheckout);
}
