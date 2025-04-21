import { createClient, RedisClientType } from 'redis';

export const RedisConn: RedisClientType = createClient({
    url: process.env.REDIS_DSN
});

RedisConn.on('error', (err) => console.error('Redis Client Error', err));

export async function initializeConnection(): Promise<void> {
    try {
        await RedisConn.connect();
        console.log('Redis connection established!');
    } catch (err) {
        console.error('Redis connection error', err);
        process.exit(-1);
    }
}
