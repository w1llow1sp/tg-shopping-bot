/**
 * 📢 Notification Types Documentation
 * 
 * Документация по типам уведомлений в системе
 * Все типы хранятся в таблице notification_types
 */

export enum NotificationType {
    STOCK_ALERT = 'stock_alert',
    PRICE_DROP = 'price_drop', 
    NEW_PRODUCT = 'new_product',
    ORDER_STATUS = 'order_status',
    PROMOTION = 'promotion'
}

/**
 * 📋 Типы уведомлений в системе:
 * 
 * 1. 🎉 STOCK_ALERT - "Поступление товара"
 *    - Отправляется когда товар снова появляется на складе
 *    - Шаблон: "🎉 Товар "{product_name}" снова в наличии! Цена: {price} ₽"
 *    - Metadata: { old_quantity: 0, new_quantity: 10, price: 125 }
 * 
 * 2. 💰 PRICE_DROP - "Снижение цены"
 *    - Отправляется при снижении цены на товар
 *    - Шаблон: "💰 Цена на "{product_name}" снижена! Было: {old_price} ₽, стало: {new_price} ₽"
 *    - Metadata: { old_price: 150, new_price: 125, discount_percent: 17 }
 * 
 * 3. 🆕 NEW_PRODUCT - "Новый товар"
 *    - Отправляется при добавлении нового товара в каталог
 *    - Шаблон: "🆕 Новый товар: "{product_name}" за {price} ₽"
 *    - Metadata: { category: "грунты", description: "..." }
 * 
 * 4. 📦 ORDER_STATUS - "Статус заказа"
 *    - Отправляется при изменении статуса заказа
 *    - Шаблон: "📦 Заказ #{order_id}: {status}"
 *    - Metadata: { order_id: 123, status: "confirmed", tracking_number: "..." }
 * 
 * 5. 🎁 PROMOTION - "Акция"
 *    - Отправляется при запуске акций и скидок
 *    - Шаблон: "🎁 Акция: {promotion_text}"
 *    - Metadata: { discount_percent: 20, valid_until: "2024-01-01", conditions: "..." }
 */

export interface NotificationMetadata {
    // Общие поля
    product_name?: string;
    price?: number;
    
    // Для stock_alert
    old_quantity?: number;
    new_quantity?: number;
    
    // Для price_drop
    old_price?: number;
    new_price?: number;
    discount_percent?: number;
    
    // Для new_product
    category?: string;
    description?: string;
    
    // Для order_status
    order_id?: number;
    status?: string;
    tracking_number?: string;
    
    // Для promotion
    promotion_text?: string;
    valid_until?: string;
    conditions?: string;
}

/**
 * 🔧 Примеры использования:
 * 
 * // Подписаться на уведомление о поступлении
 * INSERT INTO notifications (user_id, type_id, product_id, message, metadata) 
 * VALUES (123, 1, 5, '🎉 Товар "Грунт" снова в наличии!', 
 *        '{"product_name": "Грунт", "price": 125, "old_quantity": 0, "new_quantity": 10}');
 * 
 * // Получить все активные уведомления пользователя
 * SELECT n.*, nt.name as type_name, nt.template 
 * FROM notifications n 
 * JOIN notification_types nt ON n.type_id = nt.id 
 * WHERE n.user_id = 123 AND n.is_active = TRUE AND n.sent_at IS NULL;
 * 
 * // Статистика по типам уведомлений
 * SELECT nt.name, COUNT(*) as count 
 * FROM notifications n 
 * JOIN notification_types nt ON n.type_id = nt.id 
 * GROUP BY nt.name;
 */ 