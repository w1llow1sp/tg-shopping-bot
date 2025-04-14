import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Bot, Context } from 'grammy';
import type { User } from '@grammyjs/types';
import { MenuService } from '../../src/services/menu/service'; // Путь к вашему MenuService
import { MenuRepository } from '../../src/services/menu/repository'; // Путь к вашему MenuRepository
import { createUser } from '../factories/userFactory'; // Импортируем фабрику

// --- Мокируем зависимости ---

// Минимальный мок для MenuRepository (пока методы не используются в /start)
// Если в будущем /start будет вызывать репозиторий, добавьте сюда моки методов
const mockRepository: MenuRepository = {
  // Например: getItem: vi.fn(), saveUser: vi.fn(), ...
} as unknown as MenuRepository; // Используем as unknown для простоты

// Тип для мока Bot
type MockBot = Pick<Bot, 'command' | 'on'>;

describe('MenuService', () => {
  let mockBot: MockBot;
  let menuService: MenuService;
  // Переменная для хранения захваченного обработчика команды /start
  let startCommandHandler: ((ctx: Context) => Promise<void>) | undefined;

  beforeEach(() => {
    // Сбрасываем все моки перед каждым тестом
    vi.clearAllMocks();
    startCommandHandler = undefined; // Сбрасываем захваченный обработчик

    // Создаем мок Bot
    mockBot = {
      command: vi.fn((command: string, handler: (ctx: Context) => Promise<void>) => {
        // Захватываем обработчик, если это команда 'start'
        if (command === 'start') {
          startCommandHandler = handler;
        }
        return mockBot as Bot; // Возвращаем для возможной цепочки вызовов
      }),
      on: vi.fn(() => mockBot as Bot), // Мокируем 'on' на всякий случай
    };

    // Создаем экземпляр MenuService с моками
    // Конструктор вызовет registerMenu() и зарегистрирует обработчик в mockBot
    menuService = new MenuService(mockBot as Bot, mockRepository);
  });

  it('should register /start command handler on initialization', () => {
    // Проверяем, что метод bot.command был вызван для 'start'
    expect(mockBot.command).toHaveBeenCalledWith('start', expect.any(Function));
    // Проверяем, что наш обработчик был успешно захвачен
    expect(startCommandHandler).toBeDefined();
    expect(startCommandHandler).toBeInstanceOf(Function);
  });

  it('/start command should reply with correct welcome message and keyboard for user with username', async () => {
    // Убеждаемся, что обработчик захвачен
    expect(startCommandHandler).toBeDefined();
    if (!startCommandHandler) throw new Error('Start handler not captured');

    // --- Arrange ---
    const testUser: User = createUser({ username: 'test_user', first_name: 'Tester' }); // Пользователь с username
    const mockReply = vi.fn(); // Создаем мок-функцию для ctx.reply
    const mockCtx: Partial<Context> = { // Создаем частичный мок контекста
      from: testUser,
      reply: mockReply,
    };

    // --- Act ---
    // Вызываем захваченный обработчик команды /start
    await startCommandHandler(mockCtx as Context);

    // --- Assert ---
    // 1. Проверяем, что ctx.reply был вызван один раз
    expect(mockReply).toHaveBeenCalledTimes(1);

    // 2. Формируем ожидаемые аргументы для ctx.reply
    const expectedUsername = `@${testUser.username}`;
    const expectedMessage = `Добро пожаловать в наш магазин, ${expectedUsername}! Для взаимодействия нажмите следующие кнопки:`;
    const expectedKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Каталог', callback_data: 'catalog' }],
          [{ text: 'Корзина', callback_data: 'cart' }],
          [{ text: 'Заказы', callback_data: 'order' }],
        ],
      },
    };

    // 3. Проверяем, что ctx.reply был вызван с ПРАВИЛЬНЫМИ аргументами
    expect(mockReply).toHaveBeenCalledWith(expectedMessage, expectedKeyboard);
  });

  it('/start command should reply with correct welcome message using first_name if username is missing', async () => {
    // Убеждаемся, что обработчик захвачен
    expect(startCommandHandler).toBeDefined();
    if (!startCommandHandler) throw new Error('Start handler not captured');

    // --- Arrange ---
    const testUser = createUser({ username: undefined, first_name: 'JustTester' }); // Пользователь БЕЗ username
    const mockReply = vi.fn();
    const mockCtx: Partial<Context> = {
      from: testUser,
      reply: mockReply,
    };

    // --- Act ---
    await startCommandHandler(mockCtx as Context);

    // --- Assert ---
    // 1. Проверяем вызов ctx.reply
    expect(mockReply).toHaveBeenCalledTimes(1);

    // 2. Формируем ожидаемые аргументы (используем first_name)
    const expectedUsername = testUser.first_name; // Ожидаем first_name
    const expectedMessage = `Добро пожаловать в наш магазин, ${expectedUsername}! Для взаимодействия нажмите следующие кнопки:`;
    const expectedKeyboard = { // Клавиатура та же
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Каталог', callback_data: 'catalog' }],
          [{ text: 'Корзина', callback_data: 'cart' }],
          [{ text: 'Заказы', callback_data: 'order' }],
        ],
      },
    };

    // 3. Проверяем аргументы ctx.reply
    expect(mockReply).toHaveBeenCalledWith(expectedMessage, expectedKeyboard);
  });

  // Можно добавить тест на обработку ошибки внутри ctx.reply, если необходимо
  // Например, если сеть недоступна
});
