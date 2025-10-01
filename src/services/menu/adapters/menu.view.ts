/**
 * 🎨 Menu View Adapter
 * 
 * View использует только сервис
 * Реализация порта IMenuView для отображения меню в Telegram
 */

import { IMenuView, IMenuService, MenuData, WelcomeData } from '../ports/menu.port';

export class MenuView implements IMenuView {
    private readonly menuService: IMenuService;

    constructor(menuService: IMenuService) {
        this.menuService = menuService;
    }

    /**
     * Отобразить главное меню
     */
    async renderMainMenu(): Promise<any> {
        try {
            const menuData = await this.menuService.getMainMenu();
            
            // Создаем кнопки в одну колонку
            const buttons = menuData.options.map(option => [{
                text: option.text,
                callback_data: option.callback_data
            }]);

            return {
                text: `${menuData.title}\n\n${menuData.description}`,
                reply_markup: {
                    inline_keyboard: buttons
                },
                parse_mode: 'HTML'
            };
        } catch (error) {
            return this.renderError('Не удалось загрузить главное меню');
        }
    }

    /**
     * Отобразить приветственное сообщение
     */
    async renderWelcomeMessage(username: string): Promise<any> {
        try {
            const welcomeData = await this.menuService.getWelcomeMessage(username);
            
            // Создаем кнопки в одну колонку
            const buttons = [
                [{ text: '🥦 Каталог', callback_data: 'catalog:1' }],
                [{ text: '🧺 Корзина', callback_data: 'cart' }],
                [{ text: '🥬 Заказы', callback_data: 'order' }]
            ];

            return {
                text: welcomeData.text,
                reply_markup: {
                    inline_keyboard: buttons
                },
                parse_mode: 'HTML'
            };
        } catch (error) {
            return this.renderError('Не удалось создать приветственное сообщение');
        }
    }

    /**
     * Отобразить сообщение об ошибке
     */
    renderError(message: string): any {
        return {
            text: `❌ **Ошибка меню:** ${message}\n\nПопробуйте еще раз или обратитесь к администратору.`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🏠 Главная', callback_data: 'main' },
                        { text: '🔄 Повторить', callback_data: 'main' }
                    ]
                ]
            }
        };
    }

    /**
     * Отобразить неизвестную команду
     */
    renderUnknownCommand(): any {
        return {
            text: '❓ **Неизвестная команда**\n\nИспользуйте /start для начала работы или выберите действие из меню.',
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🏠 Главная', callback_data: 'main' },
                        { text: '📋 Каталог', callback_data: 'catalog:1' }
                    ]
                ]
            }
        };
    }

    /**
     * Отобразить статистику системы
     */
    async renderSystemStats(): Promise<any> {
        try {
            const stats = await this.menuService.getSystemStats();
            
            const statsText = `📊 **Статистика системы**\n\n` +
                `👥 Пользователей: ${stats.totalUsers}\n` +
                `📦 Товаров: ${stats.totalProducts}\n` +
                `📋 Заказов: ${stats.totalOrders}\n` +
                `🗄️ База данных: ${stats.databaseStatus}`;

            return {
                text: statsText,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🏠 Главная', callback_data: 'main' },
                            { text: '📋 Каталог', callback_data: 'catalog:1' }
                        ]
                    ]
                }
            };
        } catch (error) {
            return this.renderError('Не удалось загрузить статистику');
        }
    }


} 