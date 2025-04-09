import { Markup } from 'telegraf';

export const mainKeyboard = {
    reply_markup: {
        keyboard: [['Каталог'], ['Корзина'], ['Заказы']],
        resize_keyboard: true,
    },
};

export function catalogKeyboard(page: number, totalItems: number) {
    const itemsPerPage = 5;
    const navigation = [];
    if (page > 0) navigation.push({ text: 'Назад', callback_data: `catalog_${page - 1}` });
    if ((page + 1) * itemsPerPage < totalItems) navigation.push({ text: 'Вперед', callback_data: `catalog_${page + 1}` });

    return {
        reply_markup: {
            inline_keyboard: [navigation], // Добавь товары динамически
        },
    };
}

export const cartKeyboard = {
    reply_markup: {
        inline_keyboard: [[{ text: 'Оформить', callback_data: 'checkout' }]],
    },
};
