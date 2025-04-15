import { vi } from 'vitest';

// Можно мокировать console, чтобы он не засорял вывод тестов,
// но при этом проверять, что логирование ошибок происходит.
// vi.spyOn(console, 'log').mockImplementation(() => {}); // Мок console.log
// vi.spyOn(console, 'error').mockImplementation(() => {}); // Мок console.error
// Лучше мокировать console.error только в конкретных тестах, где проверяется его вызов.

// Можно добавить другие глобальные настройки здесь, если нужно.
console.log('Vitest setup complete.');
