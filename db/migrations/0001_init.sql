-- migrate:up
-- CREATE database IF NOT EXISTS shopdb
--                      WITH owner postgres

CREATE TABLE IF NOT EXISTS catalog (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    image TEXT,
    itemsavailable INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (item_id) REFERENCES catalog(id)
);

-- Таблица типов уведомлений
CREATE TABLE IF NOT EXISTS notification_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template TEXT NOT NULL, -- шаблон сообщения
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставляем базовые типы уведомлений
INSERT INTO notification_types (code, name, description, template) VALUES
('stock_alert', 'Поступление товара', 'Уведомление о поступлении товара на склад', '🎉 Товар "{product_name}" снова в наличии! Цена: {price} ₽'),
('price_drop', 'Снижение цены', 'Уведомление о снижении цены на товар', '💰 Цена на "{product_name}" снижена! Было: {old_price} ₽, стало: {new_price} ₽'),
('new_product', 'Новый товар', 'Уведомление о появлении нового товара', '🆕 Новый товар: "{product_name}" за {price} ₽'),
('order_status', 'Статус заказа', 'Уведомление об изменении статуса заказа', '📦 Заказ #{order_id}: {status}'),
('promotion', 'Акция', 'Уведомление об акциях и скидках', '🎁 Акция: {promotion_text}');

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type_id INTEGER NOT NULL,
    product_id INTEGER NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB NULL, -- дополнительные данные в JSON
    FOREIGN KEY (type_id) REFERENCES notification_types(id),
    FOREIGN KEY (product_id) REFERENCES catalog(id) ON DELETE SET NULL
);

-- Создаем функцию для логирования изменений количества товаров
CREATE OR REPLACE FUNCTION log_stock_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Если количество товара изменилось с 0 на больше 0, создаем событие
    IF OLD.itemsavailable = 0 AND NEW.itemsavailable > 0 THEN
        -- Здесь можно добавить логику для отправки уведомлений
        -- Пока просто логируем изменение
        RAISE NOTICE 'Stock replenished for product %: % -> %', 
            NEW.id, OLD.itemsavailable, NEW.itemsavailable;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для отслеживания изменений в таблице catalog
CREATE TRIGGER catalog_stock_change_trigger
    AFTER UPDATE ON catalog
    FOR EACH ROW
    EXECUTE FUNCTION log_stock_changes();

-- Создаем таблицу для событий изменения количества товаров
CREATE TABLE IF NOT EXISTS stock_events (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'replenished', 'depleted', 'changed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (product_id) REFERENCES catalog(id) ON DELETE CASCADE
);

-- Создаем функцию для создания событий изменения количества
CREATE OR REPLACE FUNCTION create_stock_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Определяем тип события
    DECLARE
        event_type VARCHAR(50);
    BEGIN
        IF OLD.itemsavailable = 0 AND NEW.itemsavailable > 0 THEN
            event_type := 'replenished';
        ELSIF OLD.itemsavailable > 0 AND NEW.itemsavailable = 0 THEN
            event_type := 'depleted';
        ELSE
            event_type := 'changed';
        END IF;
        
        -- Создаем запись о событии
        INSERT INTO stock_events (product_id, old_quantity, new_quantity, event_type)
        VALUES (NEW.id, OLD.itemsavailable, NEW.itemsavailable, event_type);
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для создания событий
CREATE TRIGGER catalog_stock_event_trigger
    AFTER UPDATE ON catalog
    FOR EACH ROW
    EXECUTE FUNCTION create_stock_event();

-- migrate:down
DROP TRIGGER IF EXISTS catalog_stock_event_trigger ON catalog;
DROP FUNCTION IF EXISTS create_stock_event();
DROP TABLE IF EXISTS stock_events;
DROP TRIGGER IF EXISTS catalog_stock_change_trigger ON catalog;
DROP FUNCTION IF EXISTS log_stock_changes();
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS notification_types;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS catalog;
