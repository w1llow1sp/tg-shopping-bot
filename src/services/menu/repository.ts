import { Pool } from 'pg';

export class MenuRepository {
  private pool: Pool;

  /**
   * Конструктор класса CatalogRepository.
   * @param pool - Экземпляр пула соединений PostgreSQL.
   */
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Получает список всех элементов каталога.
   * @returns Массив объектов каталога.
   */
  async getAllUsers(): Promise<{ id: number; name: string; price: number }[]> {
    const query = 'SELECT id, name, nickname FROM users'; // SQL-запрос
    try {
      const result = await this.pool.query(query); // Выполняем запрос через пул
      return result.rows; // Возвращаем строки результата
    } catch (error) {
      console.error('Ошибка выполнения запроса getAllUsers:', error);
      throw error; // Пробрасываем ошибку дальше
    }
  }

  async checkDbConnection(): Promise<string> {
    try {
      const result = await this.pool.query('SELECT version();');
      return result.rows[0].version;
    } catch (error) {
      console.error('Ошибка проверки подключения к базе данных:', error);
      throw error;
    }
  }
}