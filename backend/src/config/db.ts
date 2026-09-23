import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  console.log(`[db] connected -> ${mongoose.connection.name}`);

  mongoose.connection.on('error', (err: Error) => console.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}
