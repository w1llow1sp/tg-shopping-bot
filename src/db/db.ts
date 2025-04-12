import { Pool } from 'pg';

export const pool = new Pool({
    user: process.env.DB_USER || 'shopuser',
    host:process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'shopdb',
    password: process.env.DB_PASSWORD || 'shoppass',
    port: parseInt(process.env.DB_PORT || '5432')
})

pool.on('error', (err) => {
    console.error('Ошибка подключения к БД: ', err)
    process.exit(-1)
})
export async function query(text:string, params?:any[]) {
    const res = await pool.query(text,params);
    return res.rows
}
