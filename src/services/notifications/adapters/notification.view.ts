/**
 * 📢 Notification View - Primary Adapter
 * 
 * Адаптер для отображения уведомлений в Telegram
 * Реализует INotificationView
 */

import { INotificationView, Notification } from '../ports/notification.port';

export class NotificationView implements INotificationView {
    /**
     * Отобразить список уведомлений
     */
    renderNotificationList(notifications: Notification[]): string {
        if (notifications.length === 0) {
            return '📢 <b>У вас пока нет уведомлений</b>\n\nБудьте в курсе поступлений и акций!';
        }

        let result = '📢 <b>Ваши уведомления:</b>\n\n';
        
        notifications.forEach((notification, index) => {
            const date = notification.created_at 
                ? new Date(notification.created_at).toLocaleDateString('ru-RU')
                : 'Недавно';
            
            const readStatus = notification.is_read ? '✅' : '🔔';
            
            result += `${readStatus} <b>${notification.message}</b>\n`;
            result += `📅 ${date}\n`;
            
            if (index < notifications.length - 1) {
                result += '─'.repeat(30) + '\n';
            }
        });

        return result;
    }

    /**
     * Отобразить сообщение о поступлении товара
     */
    renderStockAlertMessage(
        productName: string, 
        price: number, 
        oldQuantity: number, 
        newQuantity: number
    ): string {
        return `🎉 <b>Товар "${productName}" снова в наличии!</b>\n\n` +
               `💰 <b>Цена:</b> ${price} ₽\n` +
               `📦 <b>Количество:</b> ${newQuantity} шт.\n\n` +
               `Было: ${oldQuantity} шт. → Стало: ${newQuantity} шт.`;
    }

    /**
     * Отобразить успешную подписку
     */
    renderSubscriptionSuccess(productName: string): string {
        return `🔔 <b>Подписка оформлена!</b>\n\n` +
               `Мы уведомим вас, когда товар "${productName}" появится на складе.`;
    }

    /**
     * Отобразить ошибку подписки
     */
    renderSubscriptionError(error: string): string {
        return `❌ <b>Ошибка при оформлении подписки</b>\n\n` +
               `${error}\n\nПопробуйте позже или обратитесь в поддержку.`;
    }

    /**
     * Отобразить сообщение об отписке
     */
    renderUnsubscriptionSuccess(productName: string): string {
        return `🔕 <b>Подписка отменена</b>\n\n` +
               `Вы больше не будете получать уведомления о товаре "${productName}".`;
    }

    /**
     * Отобразить информацию о подписке
     */
    renderSubscriptionInfo(productName: string, isSubscribed: boolean): string {
        if (isSubscribed) {
            return `🔔 <b>Вы подписаны на уведомления</b>\n\n` +
                   `Товар: "${productName}"\n` +
                   `Мы сообщим вам о поступлении.`;
        } else {
            return `🔕 <b>Вы не подписаны на уведомления</b>\n\n` +
                   `Товар: "${productName}"\n` +
                   `Нажмите "🔔 Уведомить о поступлении" для подписки.`;
        }
    }
} 