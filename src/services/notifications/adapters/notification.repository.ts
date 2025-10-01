/**
 * 📢 Notification Repository - Secondary Adapter
 * 
 * Адаптер для работы с уведомлениями в базе данных
 * Реализует INotificationRepository
 */

import { Pool } from 'pg';
import { INotificationRepository, Notification } from '../ports/notification.port';

export class NotificationRepository implements INotificationRepository {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Создать новое уведомление
     */
    async createNotification(notification: Notification): Promise<Notification> {
        try {
            const result = await this.pool.query(
                `INSERT INTO notifications (user_id, type_id, product_id, message, metadata, is_read, is_active) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING *`,
                [
                    notification.user_id,
                    notification.type_id,
                    notification.product_id,
                    notification.message,
                    notification.metadata ? JSON.stringify(notification.metadata) : null,
                    notification.is_read,
                    notification.is_active
                ]
            );

            return this.mapRowToNotification(result.rows[0]);
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Получить уведомления пользователя
     */
    async getUserNotifications(userId: number): Promise<Notification[]> {
        try {
            const result = await this.pool.query(
                `SELECT n.*, nt.name as type_name, nt.template 
                 FROM notifications n 
                 JOIN notification_types nt ON n.type_id = nt.id 
                 WHERE n.user_id = $1 AND n.is_active = TRUE 
                 ORDER BY n.created_at DESC`,
                [userId]
            );

            return result.rows.map(row => this.mapRowToNotification(row));
        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }

    /**
     * Получить уведомления для товара определенного типа
     */
    async getProductNotifications(productId: number, typeId: number): Promise<Notification[]> {
        try {
            const result = await this.pool.query(
                `SELECT * FROM notifications 
                 WHERE product_id = $1 AND type_id = $2 AND is_active = TRUE`,
                [productId, typeId]
            );

            return result.rows.map(row => this.mapRowToNotification(row));
        } catch (error) {
            console.error('Error getting product notifications:', error);
            throw error;
        }
    }

    /**
     * Обновить уведомление
     */
    async updateNotification(notificationId: number, updates: Partial<Notification>): Promise<void> {
        try {
            const setClause = Object.keys(updates)
                .map((key, index) => `${key} = $${index + 2}`)
                .join(', ');

            const values = [notificationId, ...Object.values(updates)];

            await this.pool.query(
                `UPDATE notifications SET ${setClause} WHERE id = $1`,
                values
            );
        } catch (error) {
            console.error('Error updating notification:', error);
            throw error;
        }
    }

    /**
     * Удалить уведомление
     */
    async deleteNotification(notificationId: number): Promise<void> {
        try {
            await this.pool.query(
                'DELETE FROM notifications WHERE id = $1',
                [notificationId]
            );
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    /**
     * Проверить существование подписки
     */
    async checkSubscriptionExists(userId: number, productId: number, typeId: number): Promise<boolean> {
        try {
            const result = await this.pool.query(
                `SELECT COUNT(*) as count FROM notifications 
                 WHERE user_id = $1 AND product_id = $2 AND type_id = $3 AND is_active = TRUE`,
                [userId, productId, typeId]
            );

            return parseInt(result.rows[0].count) > 0;
        } catch (error) {
            console.error('Error checking subscription exists:', error);
            return false;
        }
    }

    /**
     * Маппинг строки БД в объект Notification
     */
    private mapRowToNotification(row: any): Notification {
        return {
            id: row.id,
            user_id: row.user_id,
            type_id: row.type_id,
            product_id: row.product_id,
            message: row.message,
            created_at: row.created_at,
            sent_at: row.sent_at,
            is_read: row.is_read,
            is_active: row.is_active,
            metadata: row.metadata || undefined, // PostgreSQL JSONB уже является объектом
        };
    }
} 