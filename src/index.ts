import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
// конфиг грузим
dotenv.config();

// Инициализация бота
const bot = new Telegraf(process.env.BOT_TOKEN as string);
console.log('Бот создан');

// Пример каталога товаров
const catalog = [
    { id: 1, name: 'Товар 1', description: 'Описание 1', price: 100, image: 'https://via.placeholder.com/150' },
    { id: 2, name: 'Товар 2', description: 'Описание 2', price: 200, image: 'https://via.placeholder.com/150' },
    { id: 3, name: 'Товар 3', description: 'Описание 3', price: 300, image: 'https://via.placeholder.com/150' },
];

// Корзина пользователей (в памяти)
const cart: { [userId: number]: { id: number; quantity: number }[] } = {};

// Список пользователей, получивших приветствие
const greetedUsers = new Set<number>();

// Автоматическое приветствие при первом сообщении
bot.on('message', (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || 'пользователь';

    if (!greetedUsers.has(userId)) {
        ctx.reply(
            `Добро пожаловать в наш магазин, ${username}! Для взаимодействия нажмите следующие кнопки:`,
            {
                reply_markup: {
                    keyboard: [['Каталог'], ['Корзина'], ['Заказы']],
                    resize_keyboard: true,
                    one_time_keyboard: false,
                },
            }
        );
        greetedUsers.add(userId);
        console.log(`Приветствие отправлено для ${username}`);
    }
});

// Обработка кнопки "Каталог"
bot.hears('Каталог', (ctx) => showCatalog(ctx, 0));

// Обработка кнопки "Корзина"
bot.hears('Корзина', (ctx) => showCart(ctx));

// Обработка кнопки "Заказы"
bot.hears('Заказы', (ctx) => ctx.reply('Твои заказы (пока их нет).'));

// Показ каталога с пагинацией
function showCatalog(ctx: any, page: number) {
    const itemsPerPage = 5;
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = catalog.slice(start, end);

    const buttons = paginatedItems.map((item) => [{ text: item.name, callback_data: `item_${item.id}` }]);
    const navigation = [];
    if (page > 0) navigation.push({ text: 'Назад', callback_data: `catalog_${page - 1}` });
    if (end < catalog.length) navigation.push({ text: 'Вперед', callback_data: `catalog_${page + 1}` });

    ctx.reply('Выберите товар:', {
        reply_markup: {
            inline_keyboard: [...buttons, navigation],
        },
    });
}

// Показ товара
bot.action(/item_(\d+)/, (ctx) => {
    const itemId = parseInt(ctx.match[1]);
    const item = catalog.find((i) => i.id === itemId);
    if (!item) return;

    ctx.replyWithPhoto(item.image, {
        caption: `${item.name}\n${item.description}\nЦена: ${item.price} руб.`,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '<<', callback_data: `item_${getPrevItemId(itemId)}` },
                    { text: '>>', callback_data: `item_${getNextItemId(itemId)}` },
                ],
                [{ text: 'Добавить в корзину', callback_data: `add_${itemId}` }],
                [{ text: 'Назад', callback_data: 'catalog_0' }],
            ],
        },
    });
});

// Навигация по товарам
function getPrevItemId(id: number) {
    const index = catalog.findIndex((i) => i.id === id);
    return catalog[index - 1]?.id || catalog[catalog.length - 1].id;
}

function getNextItemId(id: number) {
    const index = catalog.findIndex((i) => i.id === id);
    return catalog[index + 1]?.id || catalog[0].id;
}

// Добавление в корзину
bot.action(/add_(\d+)/, (ctx) => {
    const itemId = parseInt(ctx.match[1]);
    const userId = ctx.from.id;
    if (!cart[userId]) cart[userId] = [];
    const cartItem = cart[userId].find((i) => i.id === itemId);
    if (cartItem) cartItem.quantity++;
    else cart[userId].push({ id: itemId, quantity: 1 });
    ctx.answerCbQuery('Товар добавлен в корзину!');
});

// Показ корзины
function showCart(ctx: any) {
    const userId = ctx.from.id;
    const userCart = cart[userId] || [];
    if (!userCart.length) {
        ctx.reply('Ваша корзина пуста.');
        return;
    }

    const total = userCart.reduce((sum, i) => {
        const item = catalog.find((c) => c.id === i.id);
        return sum + (item?.price || 0) * i.quantity;
    }, 0);

    const buttons = userCart.map((i) => {
        const item = catalog.find((c) => c.id === i.id);
        return [{ text: `${item?.name} (${i.quantity} шт.)`, callback_data: `cart_item_${i.id}` }];
    });

    ctx.reply(`Ваша корзина:\nИтого: ${total} руб.`, {
        reply_markup: {
            inline_keyboard: [
                ...buttons,
                [{ text: 'Оформить', callback_data: 'checkout' }],
                [{ text: 'Назад', callback_data: 'main' }],
            ],
        },
    });
}

// Просмотр товара в корзине
bot.action(/cart_item_(\d+)/, (ctx) => {
    const itemId = parseInt(ctx.match[1]);
    const userId = ctx.from.id;
    const item = catalog.find((i) => i.id === itemId);
    const cartItem = cart[userId].find((i) => i.id === itemId);
    if (!item || !cartItem) return;

    ctx.replyWithPhoto(item.image, {
        caption: `${item.name}\n${item.description}\nКоличество: ${ cartItem.quantity}`,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '+', callback_data: `plus_${itemId}` },
                    { text: `${cartItem.quantity} шт`, callback_data: 'noop' },
                    { text: '-', callback_data: `minus_${itemId}` },
                    { text: 'x', callback_data: `remove_${itemId}` },
                ],
                [
                    { text: '<<', callback_data: `cart_item_${getPrevCartItem(userId, itemId)}` },
                    { text: '>>', callback_data: `cart_item_${getNextCartItem(userId, itemId)}` },
                ],
                [
                    { text: 'Назад', callback_data: 'cart' },
                    { text: 'Корзина', callback_data: 'cart' },
                ],
            ],
        },
    });
});

function getPrevCartItem(userId: number, itemId: number) {
    const userCart = cart[userId];
    const index = userCart.findIndex((i) => i.id === itemId);
    return userCart[index - 1]?.id || userCart[userCart.length - 1].id;
}

function getNextCartItem(userId: number, itemId: number) {
    const userCart = cart[userId];
    const index = userCart.findIndex((i) => i.id === itemId);
    return userCart[index + 1]?.id || userCart[0].id;
}

// Управление корзиной
bot.action(/plus_(\d+)/, (ctx) => {
    const itemId = parseInt(ctx.match[1]);
    const userId = ctx.from.id;
    const cartItem = cart[userId].find((i) => i.id === itemId);
    if (cartItem) cartItem.quantity++;
    ctx.answerCbQuery('Количество увеличено');
    showCart(ctx);
});

bot.action(/minus_(\d+)/, (ctx) => {
    const itemId = parseInt(ctx.match[1]);
    const userId = ctx.from.id;
    const cartItem = cart[userId].find((i) => i.id === itemId);
    if (cartItem && cartItem.quantity > 1) cartItem.quantity--;
    else if (cartItem) cart[userId] = cart[userId].filter((i) => i.id !== itemId);
    ctx.answerCbQuery('Количество уменьшено');
    showCart(ctx);
});

bot.action(/remove_(\d+)/, (ctx) => {
    const itemId = parseInt(ctx.match[1]);
    const userId = ctx.from.id;
    cart[userId] = cart[userId].filter((i) => i.id !== itemId);
    ctx.answerCbQuery('Товар удалён');
    showCart(ctx);
});

// Оформление заказа
bot.action('checkout', (ctx) => {
    const userId = ctx.from.id;
    const total = cart[userId].reduce((sum, i) => {
        const item = catalog.find((c) => c.id === i.id);
        return sum + (item?.price || 0) * i.quantity;
    }, 0);

    ctx.reply(
        `Нажимая оплатить, я даю согласие на обработку персональных данных.\n` +
        `Ваш телеграм nickname будет использоваться для связи с вами для уточнения деталей заказа.\n\n` +
        `Для связи с продавцом @tg_nickname`,
        {
            reply_markup: {
                inline_keyboard: [[{ text: `Оформить (${total} руб.)`, callback_data: 'pay' }]],
            },
        }
    );
});

bot.action('pay', (ctx) => {
    const userId = ctx.from.id;
    delete cart[userId]; // Очищаем корзину
    ctx.reply('Спасибо за заказ! Мы свяжемся с вами через @tg_nickname.');
});

// Возврат на главный экран
bot.action('main', (ctx) => {
    ctx.reply('Вы вернулись на главный экран!', {
        reply_markup: {
            keyboard: [['Каталог'], ['Корзина'], ['Заказы']],
            resize_keyboard: true,
        },
    });
});

console.log('Команды настроены');

// Запуск бота
bot.launch()
    .then(() => console.log('Бот запущен'))
    .catch((error) => console.error('Ошибка:', error));
console.log('Запуск вызван');
