import { Telegraf } from 'telegraf';
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
                    keyboard: [['Каталог'], ['Корзина'], ['Заказы']],
                    resize_keyboard: true,
                    one_time_keyboard: false,
                },
            }
        );
        greetedUsers.add(userId);
        console.log(`Приветствие отправлено для ${username}`);
        return
    }
    // Обработка кнопок
    switch (messageText) {
        case 'Каталог':
            ctx.reply('Ты в каталоге!');
            break;
        case 'Корзина':
            ctx.reply('Твоя корзина пока пуста.');
            break;
        case 'Заказы':
            ctx.reply('Твои заказы (пока их нет).');
            break;
        default:
            ctx.reply('Выбери одну из кнопок ниже!');
    }
});



bot.launch()
    .then(() => console.log('Бот запущен'))
    .catch((error) => console.error('Ошибка:', error));
