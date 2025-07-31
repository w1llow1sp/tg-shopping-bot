/**
 * 🏗️ Menu Infrastructure - Mapper
 * 
 * Инфраструктурный слой для маппинга данных
 */

import { UserInfo, SystemStats } from '../ports/menu.port';

/**
 * Маппер для преобразования данных меню
 */
export class MenuMapper {
    /**
     * Преобразовать данные из БД в доменную модель пользователя
     */
    static mapUserFromDatabase(dbUser: any): UserInfo {
        return {
            id: dbUser.id,
            name: dbUser.name,
            nickname: dbUser.nickname,
            username: dbUser.username
        };
    }

    /**
     * Преобразовать массив данных из БД в доменные модели пользователей
     */
    static mapUsersArrayFromDatabase(dbUsers: any[]): UserInfo[] {
        return dbUsers.map(user => this.mapUserFromDatabase(user));
    }

    /**
     * Преобразовать доменную модель пользователя в данные для БД
     */
    static mapUserToDatabase(user: UserInfo): any {
        return {
            id: user.id,
            name: user.name,
            nickname: user.nickname,
            username: user.username
        };
    }

    /**
     * Преобразовать массив доменных моделей пользователей в данные для БД
     */
    static mapUsersArrayToDatabase(users: UserInfo[]): any[] {
        return users.map(user => this.mapUserToDatabase(user));
    }

    /**
     * Преобразовать данные статистики из БД в доменную модель
     */
    static mapSystemStatsFromDatabase(dbStats: any): SystemStats {
        return {
            totalUsers: parseInt(dbStats.total_users || '0', 10),
            totalProducts: parseInt(dbStats.total_products || '0', 10),
            totalOrders: parseInt(dbStats.total_orders || '0', 10),
            databaseStatus: dbStats.database_status || 'OK'
        };
    }

    /**
     * Валидировать имя пользователя
     */
    static isValidUsername(username: string): boolean {
        if (!username || username.trim().length === 0) {
            return false;
        }
        
        // Проверяем длину
        if (username.length < 3 || username.length > 30) {
            return false;
        }
        
        // Проверяем допустимые символы (только буквы, цифры и подчеркивания)
        const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
        return validUsernameRegex.test(username);
    }

    /**
     * Валидировать имя пользователя
     */
    static isValidName(name: string): boolean {
        if (!name || name.trim().length === 0) {
            return false;
        }
        
        // Проверяем длину
        if (name.length < 2 || name.length > 50) {
            return false;
        }
        
        // Проверяем допустимые символы (буквы, цифры, пробелы, дефисы)
        const validNameRegex = /^[a-zA-Zа-яА-Я0-9\s\-]+$/;
        return validNameRegex.test(name);
    }

    /**
     * Очистить и нормализовать имя пользователя
     */
    static sanitizeName(name: string): string {
        return name.trim().replace(/\s+/g, ' ');
    }

    /**
     * Очистить и нормализовать username
     */
    static sanitizeUsername(username: string): string {
        return username.trim().toLowerCase();
    }

    /**
     * Создать отображаемое имя пользователя
     */
    static createDisplayName(user: UserInfo): string {
        if (user.nickname) {
            return `${user.name} (@${user.nickname})`;
        }
        return user.name;
    }

    /**
     * Создать краткое описание пользователя
     */
    static createShortDescription(user: UserInfo, maxLength: number = 50): string {
        const displayName = this.createDisplayName(user);
        if (displayName.length <= maxLength) {
            return displayName;
        }
        return displayName.substring(0, maxLength - 3) + '...';
    }

    /**
     * Форматировать статистику пользователей
     */
    static formatUsersCount(count: number): string {
        if (count === 0) {
            return 'Нет пользователей';
        }
        if (count === 1) {
            return '1 пользователь';
        }
        if (count < 5) {
            return `${count} пользователя`;
        }
        return `${count} пользователей`;
    }

    /**
     * Форматировать статистику товаров
     */
    static formatProductsCount(count: number): string {
        if (count === 0) {
            return 'Нет товаров';
        }
        if (count === 1) {
            return '1 товар';
        }
        if (count < 5) {
            return `${count} товара`;
        }
        return `${count} товаров`;
    }

    /**
     * Форматировать статистику заказов
     */
    static formatOrdersCount(count: number): string {
        if (count === 0) {
            return 'Нет заказов';
        }
        if (count === 1) {
            return '1 заказ';
        }
        if (count < 5) {
            return `${count} заказа`;
        }
        return `${count} заказов`;
    }

    /**
     * Создать текст статистики системы
     */
    static createSystemStatsText(stats: SystemStats): string {
        return `📊 **Статистика системы**\n\n` +
            `👥 Пользователей: ${this.formatUsersCount(stats.totalUsers)}\n` +
            `📦 Товаров: ${this.formatProductsCount(stats.totalProducts)}\n` +
            `📋 Заказов: ${this.formatOrdersCount(stats.totalOrders)}\n` +
            `🗄️ База данных: ${stats.databaseStatus}`;
    }

    /**
     * Создать текст списка пользователей
     */
    static createUsersListText(users: UserInfo[]): string {
        if (users.length === 0) {
            return '👥 **Пользователи**\n\nСписок пользователей пуст.';
        }

        const usersText = users.map((user, index) => 
            `${index + 1}. ${this.createDisplayName(user)}`
        ).join('\n');

        return `👥 **Пользователи** (${users.length})\n\n${usersText}`;
    }

    /**
     * Создать текст информации о пользователе
     */
    static createUserInfoText(user: UserInfo): string {
        let text = `👤 **Информация о пользователе**\n\n` +
            `🆔 ID: ${user.id}\n` +
            `📝 Имя: ${user.name}`;
        
        if (user.nickname) {
            text += `\n👤 Никнейм: @${user.nickname}`;
        }
        
        return text;
    }
} 