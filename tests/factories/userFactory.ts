import type { User } from '@grammyjs/types'; // Импортируем тип User

// Функция для создания тестового пользователя
export function createUser(overrides?: Partial<User>): User {
  // Базовый пользователь
  const defaultUser: User = {
    id: 123456789,
    is_bot: false,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'en',
  };

  // Перезаписываем поля, если переданы overrides
  return { ...defaultUser, ...overrides };
}
