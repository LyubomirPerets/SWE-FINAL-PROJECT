import { createApp } from './app.js';
import { config } from './config.js';
import { closePool } from './db/pool.js';

const server = createApp().listen(config.PORT, () => {
  console.log(`CRM API listening on http://localhost:${config.PORT}`);
});

function shutdown(): void {
  server.close(() => {
    void closePool().then(() => process.exit(0));
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
