/**
 * 📢 Notification Type Repository - Secondary Adapter
 * 
 * Адаптер для работы с типами уведомлений в базе данных
 * Реализует INotificationTypeRepository
 */

import { Pool } from 'pg';
import { INotificationTypeRepository, NotificationType } from '../ports/notification.port';

export class NotificationTypeRepository implements INotificationTypeRepository {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Получить тип уведомления по коду
     */
    async getNotificationTypeByCode(code: string): Promise<NotificationType> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM notification_types WHERE code = $1 AND is_active = TRUE',
                [code]
            );

            if (result.rows.length === 0) {
                throw new Error(`Notification type with code '${code}' not found`);
            }

            return this.mapRowToNotificationType(result.rows[0]);
        } catch (error) {
            console.error('Error getting notification type by code:', error);
            throw error;
        }
    }

    /**
     * Получить тип уведомления по ID
     */
    async getNotificationTypeById(id: number): Promise<NotificationType> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM notification_types WHERE id = $1 AND is_active = TRUE',
                [id]
            );

            if (result.rows.length === 0) {
                throw new Error(`Notification type with ID ${id} not found`);
            }

            return this.mapRowToNotificationType(result.rows[0]);
        } catch (error) {
            console.error('Error getting notification type by ID:', error);
            throw error;
        }
    }

    /**
     * Получить все типы уведомлений
     */
    async getAllNotificationTypes(): Promise<NotificationType[]> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM notification_types WHERE is_active = TRUE ORDER BY id'
            );

            return result.rows.map(row => this.mapRowToNotificationType(row));
        } catch (error) {
            console.error('Error getting all notification types:', error);
            throw error;
        }
    }

    /**
     * Маппинг строки БД в объект NotificationType
     */
    private mapRowToNotificationType(row: any): NotificationType {
        return {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description,
            template: row.template,
            is_active: row.is_active,
            created_at: row.created_at,
        };
    }
} 