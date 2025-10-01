import { Pool } from 'pg';

export const pool = new Pool({
    connectionString: process.env.POSTGRESQL_DSN,
});

pool.on('error', (err) => {
    console.error('Ошибка подключения к БД: ', err)
    process.exit(-1)
})

export async function initializePool(): Promise<void> {
    try {
        await pool.query('SELECT 1');
        console.log('Postgres pool established!');
    } catch (err) {
        console.error('Postgres pool error', err);
        process.exit(-1);
    }
}

export async function closePool(): Promise<void> {
    try {
        await pool.end();
        console.log('PostgreSQL pool closed successfully');
    } catch (err) {
        console.error('Error closing PostgreSQL pool:', err);
    }
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    try {
        const res = await pool.query(text, params);
        return res.rows;
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        throw err;
    }
}