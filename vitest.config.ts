// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Использовать глобальные переменные Vitest (describe, it, expect, vi)
    environment: 'node', // Среда выполнения тестов
    setupFiles: ['./tests/setup.ts'], // Файл для глобальной настройки перед тестами
    // reporters: ['verbose'], // Опционально: более подробный вывод
  },
});
