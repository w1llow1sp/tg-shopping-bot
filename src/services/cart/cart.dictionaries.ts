// Конфигурационные параметры корзины
import { CallbackDataRoutes } from '../../consts';

export const CartConfig = {
  CACHE_TTL_SECONDS: 24 * 60 * 60, // Время жизни кэша корзины (24 часа)
  PRICE_CACHE_TTL_SECONDS: 24 * 60 * 60, // Время жизни кэша цен (24 часа)
  MAX_QUANTITY: 10, // Максимальное количество одного товара в корзине
} as const;

// SQL-запросы для работы с корзиной
export const CartQueries = {
  // Запрос для получения элементов корзины
  SELECT_CART: `
    SELECT item_id, quantity
    FROM cart
    WHERE user_id = $1
  `,
  // Запрос для удаления корзины пользователя
  DELETE_CART: `
    DELETE FROM cart
    WHERE user_id = $1
  `,
  // Запрос для добавления элемента в корзину
  INSERT_CART_ITEM: `
    INSERT INTO cart (user_id, item_id, quantity)
    VALUES ($1, $2, $3)
  `,
} as const;

// Регулярные выражения для обработки callback-запросов
export const CartCallbackRegex = {
  // Регулярное выражение для добавления продукта (cart:add:ID)
  ADD_PRODUCT: new RegExp(`^${CallbackDataRoutes.cartAdd}:(\\d+)$`),
  // Регулярное выражение для удаления продукта (cart:del:ID)
  DELETE_PRODUCT: new RegExp(`^${CallbackDataRoutes.cartDel}:(\\d+)$`),
  // Регулярное выражение для увеличения количества (cart:inc:ID)
  INCREASE_QTY: new RegExp(`^${CallbackDataRoutes.cartInc}:(\\d+)$`),
  // Регулярное выражение для уменьшения количества (cart:dec:ID)
  DECREASE_QTY: new RegExp(`^${CallbackDataRoutes.cartDec}:(\\d+)$`),
} as const;

export enum CartErrorMessages {
  HANDLE_CART_WRONG_USER = '❌ Ошибка: неверный пользователь',
  HANDLE_CART_CART_OPEN_ERROR='❌ Ошибка при открытии корзины',

  REQUEST_ERROR = '❌ Ошибка: данные запроса отсутствуют',
  WRONG_USER_OR_PRODUCT = '❌ Ошибка: неверный пользователь или продукт',
  PRODUCT_NOT_FOUND_IN_CART = '❌ Продукт не найден в корзине',

  HANDLE_ADD_PRODUCT_PRODUCT_IS_NOT_ENOUGHT = '❌ Недостаточно товара на складе',
  HANDLE_ADD_PRODUCT_PRODUCT_NOT_FOUND = 'Продукт не найден',
  HANDLE_ADD_PRODUCT_ERROR_IN_CART_ADDING = 'Ошибка при добавлении в корзину',


  HANDLE_DELETE_PRODUCT_DELETE_ITEM_ERROR = '❌ Ошибка при удалении из корзины',

  HANDLE_INCREASE_QTY_QUANTITY_CHANGE_ERROR = '❌ Ошибка при изменении количества'

}