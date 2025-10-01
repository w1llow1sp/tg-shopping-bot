/**
 * 📢 Notification Ports
 * 
 * Порты для системы уведомлений по гексагональной архитектуре
 */

export interface Notification {
    id?: number;
    user_id: number;
    type_id: number;
    product_id?: number;
    message: string;
    created_at?: Date;
    sent_at?: Date | null;
    is_read: boolean;
    is_active: boolean;
    metadata?: Record<string, any>;
}

export interface NotificationType {
    id: number;
    code: string;
    name: string;
    description?: string;
    template: string;
    is_active: boolean;
    created_at?: Date;
}

// Primary Ports (внешние интерфейсы)
export interface INotificationService {
    subscribeToStockAlert(userId: number, productId: number): Promise<void>;
    unsubscribeFromStockAlert(userId: number, productId: number): Promise<void>;
    sendStockAlert(productId: number, oldQuantity: number, newQuantity: number): Promise<void>;
    getUserNotifications(userId: number): Promise<Notification[]>;
    markNotificationAsRead(notificationId: number): Promise<void>;
    markNotificationAsSent(notificationId: number): Promise<void>;
}

export interface INotificationView {
    renderNotificationList(notifications: Notification[]): string;
    renderStockAlertMessage(productName: string, price: number, oldQuantity: number, newQuantity: number): string;
    renderSubscriptionSuccess(productName: string): string;
    renderSubscriptionError(error: string): string;
    renderUnsubscriptionSuccess(productName: string): string;
}

// Secondary Ports (внутренние интерфейсы)
export interface INotificationRepository {
    createNotification(notification: Notification): Promise<Notification>;
    getUserNotifications(userId: number): Promise<Notification[]>;
    getProductNotifications(productId: number, typeId: number): Promise<Notification[]>;
    updateNotification(notificationId: number, updates: Partial<Notification>): Promise<void>;
    deleteNotification(notificationId: number): Promise<void>;
    checkSubscriptionExists(userId: number, productId: number, typeId: number): Promise<boolean>;
}

export interface INotificationTypeRepository {
    getNotificationTypeByCode(code: string): Promise<NotificationType>;
    getNotificationTypeById(id: number): Promise<NotificationType>;
    getAllNotificationTypes(): Promise<NotificationType[]>;
}

// Domain Models
export interface StockAlertData {
    productId: number;
    productName: string;
    price: number;
    oldQuantity: number;
    newQuantity: number;
}

// Callback Data Routes
export const NotificationCallbackRoutes = {
    SUBSCRIBE_STOCK: 'notify:stock:subscribe',
    UNSUBSCRIBE_STOCK: 'notify:stock:unsubscribe',
    VIEW_NOTIFICATIONS: 'notifications:view',
    MARK_READ: 'notifications:read',
} as const;

// Error Types
export enum NotificationErrorType {
    SUBSCRIPTION_EXISTS = 'SUBSCRIPTION_EXISTS',
    SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
    PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
    INVALID_USER = 'INVALID_USER',
    DATABASE_ERROR = 'DATABASE_ERROR',
}

export class NotificationError extends Error {
    constructor(
        public type: NotificationErrorType,
        message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'NotificationError';
    }
} 