-- migrate:up
CREATE TABLE IF NOT EXISTS catalog (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    image TEXT
);

CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (item_id) REFERENCES catalog(id)
);

-- migrate:down
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS catalog;
