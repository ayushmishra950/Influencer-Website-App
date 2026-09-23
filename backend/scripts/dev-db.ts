/**
 * Starts a throwaway MongoDB on 127.0.0.1:27017 for local development.
 * Data lives in memory and disappears when this process stops — use a real
 * MONGODB_URI (local mongod or Atlas) for anything you want to keep.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const server = await MongoMemoryServer.create({
  instance: { port: 27017, dbName: 'aura' },
});

console.log(`[dev-db] running at ${server.getUri('aura')}`);
console.log('[dev-db] press Ctrl+C to stop (all data is discarded)');

const stop = async () => {
  await server.stop();
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
