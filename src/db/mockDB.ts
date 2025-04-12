

export interface CatalogItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

export interface CartItem {
  id: number;
  user_id: number;
  item_id: number;
  quantity: number;
}

// Мок-таблицы
const mockCatalog: CatalogItem[] = [
  { id: 1, name: 'Товар 1', description: 'Описание 1', price: 100, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 2, name: 'Товар 2', description: 'Описание 2', price: 200, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 3, name: 'Товар 3', description: 'Описание 2', price: 200, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 4, name: 'Товар 4', description: 'Описание 4', price: 400, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 5, name: 'Товар 5', description: 'Описание 5', price: 500, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 6, name: 'Товар 6', description: 'Описание 6', price: 600, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 7, name: 'Товар 7', description: 'Описание 7', price: 600, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 8, name: 'Товар 8', description: 'Описание 8', price: 600, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 9, name: 'Товар 9', description: 'Описание 9', price: 600, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 10, name: 'Товар 10', description: 'Описание 10', price: 600, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 11, name: 'Товар 11', description: 'Описание 11', price: 600, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 12, name: 'Товар 12', description: 'Описание 12', price: 600, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
  { id: 13, name: 'Товар 13', description: 'Описание 13', price: 600, image: 'https://i.pinimg.com/736x/68/28/39/682839f4b5c7a30a3d626df6d460088d.jpg' },
];

const mockCart: CartItem[] = [];
let cartIdCounter = 1;

// Функции для каталога
export async function getCatalogItems(limit: number, offset: number): Promise<CatalogItem[]> {
  return mockCatalog.slice(offset, offset + limit);
}

export async function getCatalogItemById(id: number): Promise<CatalogItem | undefined> {
  return mockCatalog.find((item) => item.id === id);
}

export async function getCatalogCount(): Promise<number> {
  return mockCatalog.length;
}

// Функции для корзины
export async function addToCart(userId: number, itemId: number): Promise<void> {
  const existing = mockCart.find((item) => item.user_id === userId && item.item_id === itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    mockCart.push({ id: cartIdCounter++, user_id: userId, item_id: itemId, quantity: 1 });
  }
}

export async function getCartItems(userId: number): Promise<CartItem[]> {
  return mockCart.filter((item) => item.user_id === userId);
}
