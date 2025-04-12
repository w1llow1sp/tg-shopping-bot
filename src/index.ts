import express from 'express';
import { Bot, webhookCallback, Context } from 'grammy';
import dotenv from 'dotenv';


dotenv.config();

// Проверка переменных окружения
interface Env {
    BOT_TOKEN: string;
    WEBHOOK_URL: string;
    PORT?: string;
}

const env: Env = {
    BOT_TOKEN: process.env.BOT_TOKEN || '',
    WEBHOOK_URL: process.env.WEBHOOK_URL || '',
    PORT: process.env.PORT || '3000',
};

if (!env.BOT_TOKEN || !env.WEBHOOK_URL) {
    throw new Error('BOT_TOKEN и WEBHOOK_URL должны быть указаны в .env');
}

const bot = new Bot(env.BOT_TOKEN);
const app = express();
app.use(express.json());

// Храним пользователей, получивших приветствие
const greetedUsers = new Set<number>();

// Приветствие с inline-кнопками
bot.on('message:text', (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || 'пользователь';

    if (!greetedUsers.has(userId)) {
        ctx.reply(
            `Добро пожаловать в наш магазин, ${username}! Для взаимодействия нажмите следующие кнопки:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Каталог', callback_data: 'catalog_0' }],
                        [{ text: 'Корзина', callback_data: 'cart' }],
                        [{ text: 'Заказы', callback_data: 'orders' }],
                    ],
                },
            }
        );
        greetedUsers.add(userId);
        console.log(`Приветствие отправлено для ${username}`);
        return;
    }

    ctx.reply('Используй кнопки под приветствием!');
});

// Показ каталога с пагинацией (4 в ряд)
/*bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    if (data.match(/^catalog_(\d+)$/)) {
        console.log('Обработчик catalog вызван с callback_data:', data);
        try {
            const page = parseInt(data.split('_')[1]);
            const itemsPerPage = 8; // 4 в ряд, 2 ряда
            const offset = page * itemsPerPage;

            const items: CatalogItem[] = await getCatalogItems(itemsPerPage, offset);
            const totalItems = await getCatalogCount();

            console.log('Товары:', items);
            console.log('Всего товаров:', totalItems);

            if (!items.length) {
                ctx.reply('Каталог пуст.');
                ctx.answerCallbackQuery();
                return;
            }

            const keyboard = [];
            for (let i = 0; i < items.length; i += 4) {
                const row = items.slice(i, i + 4).map((item) => ({
                    text: item.name,
                    callback_data: `item_${item.id}`,
                }));
                keyboard.push(row);
            }

            const navigation = [];
            if (page > 0) navigation.push({ text: 'Назад', callback_data: `catalog_${page - 1}` });
            if (offset + items.length < totalItems) {
                navigation.push({ text: 'Вперед', callback_data: `catalog_${page + 1}` });
            }
            if (navigation.length > 0) keyboard.push(navigation);

            console.log('Клавиатура:', keyboard);

            ctx.reply('Выберите товар:', {
                reply_markup: { inline_keyboard: keyboard },
            });
            ctx.answerCallbackQuery();
        } catch (error) {
            console.error('Ошибка в catalog:', error);
            ctx.reply('Произошла ошибка при загрузке каталога.');
            ctx.answerCallbackQuery();
        }
    }

    // Показ карточки товара
    if (data.match(/^item_(\d+)$/)) {
        const itemId = parseInt(data.split('_')[1]);
        const item = await getCatalogItemById(itemId);
        if (!item) return;

        const prevId = await getPrevItemId(itemId);
        const nextId = await getNextItemId(itemId);

        ctx.replyWithPhoto(item.image, {
            caption: `${item.name}\n${item.description}\nЦена: ${item.price} руб.`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '<<', callback_data: `item_${prevId}` },
                        { text: '>>', callback_data: `item_${nextId}` },
                    ],
                    [{ text: 'Добавить в корзину', callback_data: `add_${itemId}` }],
                    [{ text: '<<< Назад к каталогу', callback_data: 'catalog_0' }],
                ],
            },
        });
        ctx.answerCallbackQuery();
    }

    // Добавление в корзину
    if (data.match(/^add_(\d+)$/)) {
        const itemId = parseInt(data.split('_')[1]);
        const userId = ctx.from?.id;
        if (!userId) return;

        await addToCart(userId, itemId);
        ctx.answerCallbackQuery({ text: 'Товар добавлен в корзину!' });
    }

    // Показ корзины
    if (data === 'cart') {
        const userId = ctx.from?.id;
        if (!userId) return;

        const cartItems = await getCartItems(userId);
        if (!cartItems.length) {
            ctx.reply('Ваша корзина пуста.');
            ctx.answerCallbackQuery();
            return;
        }

        const cartDetails = await Promise.all(
            cartItems.map(async (i) => {
                const item = await getCatalogItemById(i.item_id);
                return {
                    name: item?.name || 'Неизвестный товар',
                    quantity: i.quantity,
                    totalPrice: (item?.price || 0) * i.quantity,
                };
            })
        );

        const total = cartDetails.reduce((sum, i) => sum + i.totalPrice, 0);
        const message = cartDetails
            .map((i) => `${i.name} - ${i.quantity} шт. (${i.totalPrice} руб.)`)
            .join('\n');

        ctx.reply(`Ваша корзина:\n${message}\nИтого: ${total} руб.`);
        ctx.answerCallbackQuery();
    }

    // Заглушка для заказов
    if (data === 'orders') {
        ctx.reply('Твои заказы (пока их нет).');
        ctx.answerCallbackQuery();
    }
});

// Вспомогательные функции для навигации по товарам
async function getPrevItemId(currentId: number): Promise<number> {
    const allItems = await getCatalogItems(await getCatalogCount(), 0);
    const currentIndex = allItems.findIndex((item) => item.id === currentId);
    return currentIndex > 0 ? allItems[currentIndex - 1].id : allItems[allItems.length - 1].id;
}

async function getNextItemId(currentId: number): Promise<number> {
    const allItems = await getCatalogItems(await getCatalogCount(), 0);
    const currentIndex = allItems.findIndex((item) => item.id === currentId);
    return currentIndex < allItems.length - 1 ? allItems[currentIndex + 1].id : allItems[0].id;
}*/

// Настройка вебхуков
const WEBHOOK_PATH = `/webhook/${env.BOT_TOKEN}`;
app.use(WEBHOOK_PATH, webhookCallback(bot, 'express'));

const PORT = parseInt(env.PORT || '3000', 10);
app.listen(PORT, async () => {
    console.log(`Server started on port ${PORT}`);

    const webhookUrl = `${env.WEBHOOK_URL}${WEBHOOK_PATH}`;
    try {
        await bot.api.setWebhook(webhookUrl);
        console.log(`Webhook url set: ${webhookUrl}`);
    } catch (error) {
        console.error('Error setting webhook url:', error);
    }
});
