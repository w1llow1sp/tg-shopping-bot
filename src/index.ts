import {Telegraf} from 'telegraf';
import * as dotenv from 'dotenv';
// конфиг грузим
dotenv.config();

// Инициализация бота
const bot = new Telegraf(process.env.BOT_TOKEN as string);
console.log('Бот создан');

// Храним пользователей, получивших приветствие
const greetedUsers = new Set<number>();

// Приветствие при первом сообщении
bot.on('text', (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || 'пользователь';
    const messageText = ctx.message.text;

    if (!greetedUsers.has(userId)) {
        ctx.reply(
            `Добро пожаловать в наш магазин, ${username}! Для взаимодействия нажмите следующие кнопки:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{text: 'Каталог 🗂', callback_data: 'catalog'}],
                        [{text: 'Корзина 🧺', callback_data: 'cart'}],
                        [{text: 'Заказы 📌', callback_data: 'orders'}],
                    ],
                },
            }
        );
        greetedUsers.add(userId);
        console.log(`Приветствие отправлено для ${username}`);
        return
    }
    ctx.reply('Используй кнопки под приветствием!');
});
// Обработка inline-кнопок
bot.action('catalog', (ctx) => {
    ctx.answerCbQuery(); // Убирает "часики" на кнопке
    ctx.reply('Ты в каталоге!');
});

bot.action('cart', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('Твоя корзина пока пуста.');
});

bot.action('orders', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('Твои заказы (пока их нет).');
});


bot.launch()
    .then(() => console.log('Бот запущен'))
    .catch((error) => console.error('Ошибка:', error));
