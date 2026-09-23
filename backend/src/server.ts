import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { closeSocket, initSocket } from './realtime/socket.js';

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('[boot] could not reach MongoDB:', (err as Error).message);
    console.error('[boot] check MONGODB_URI in backend/.env');
    process.exit(1);
  }

  // Express and Socket.IO share one HTTP server, so both live on the same port.
  const server = createServer(createApp());
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[api] ${signal} received, shutting down`);

    // Sockets must go first: an open connection holds the HTTP server open.
    void closeSocket()
      .catch(() => undefined)
      .then(() => {
        server.close(() => {
          void disconnectDatabase().finally(() => process.exit(0));
        });
        // Never hang forever on a connection that refuses to drain.
        setTimeout(() => process.exit(0), 5000).unref();
      });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    console.error('[api] unhandled rejection:', reason);
  });
}

void bootstrap();
