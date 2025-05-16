// Enum для сообщений об ошибках
export enum ErrorMessages {
  FETCH_PRODUCTS_FAILED = 'Не удалось получить список товаров из каталога',
  FETCH_TOTAL_PRODUCTS_FAILED = 'Не удалось получить общее количество товаров',
  FETCH_PRODUCT_DETAIL_FAILED = 'Не удалось получить информацию о товаре',
  PRODUCT_NOT_FOUND = 'Товар с указанным ID не найден',
  FETCH_NEIGHBOR_PRODUCTS_FAILED = 'Не удалось получить соседние товары',
}

// Словарь SQL-запросов для работы с каталогом
export const SQL_QUERIES = {
  GET_PRODUCTS: 'SELECT id, name, description, price, image, itemsavailable FROM catalog ORDER BY id LIMIT $1 OFFSET $2',
  GET_TOTAL_PRODUCTS: 'SELECT COUNT(*) as count FROM catalog',
  GET_PRODUCT_DETAIL: 'SELECT id, name, description, price, image, itemsavailable FROM catalog WHERE id = $1',
  GET_PREV_PRODUCT: 'SELECT id FROM catalog WHERE id < $1 ORDER BY id DESC LIMIT 1',
  GET_NEXT_PRODUCT: 'SELECT id FROM catalog WHERE id > $1 ORDER BY id ASC LIMIT 1',
} as const;