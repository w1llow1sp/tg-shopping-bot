import { createClient, RedisClientType } from 'redis';

export const RedisConn: RedisClientType = createClient({
    url: process.env.REDIS_DSN
});

RedisConn.on('error', (err) => console.error('Redis Client Error', err));

let isConnected = false;

export async function initializeConnection(): Promise<void> {
    if (isConnected) {
        return;
    }
    
    try {
        await RedisConn.connect();
        isConnected = true;
        console.log('Redis connection established!');
    } catch (err) {
        console.error('Redis connection error', err);
        // Не завершаем процесс, если Redis недоступен
        console.log('Continuing without Redis...');
    }
}

export async function ensureConnection(): Promise<void> {
    if (!isConnected) {
        await initializeConnection();
    }
}
