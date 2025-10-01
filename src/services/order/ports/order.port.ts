// Временный порт для Order сервиса (заглушка)
export interface IOrderService {
    getOrderPlaceholder(): Promise<string>;
}

export interface IOrderView {
    renderOrderPlaceholder(): Promise<any>;
}

export interface IOrderRepository {
    // Пока пустой - будет реализован позже
}

export const OrderConfig = {
    PLACEHOLDER_MESSAGE: 'Функционал в разработке'
} as const; 