// Shared Valkey connection (Redis protocol).
// See docs/proposals/valkey-cache-and-queue.md for the reasoning and ground rules.

// TODO: npm install ioredis (and bullmq once the first queue lands)
// TODO: add REDIS_URL (e.g. redis://localhost:6379) to src/config.ts schema and .env.example
// TODO: create a single shared client from config.REDIS_URL and export it
// TODO: BullMQ needs its own connection with maxRetriesPerRequest: null; export a factory for that
// TODO: log connection errors (mirror the pool.on('error') handling in src/db/pool.ts)
// TODO: export closeValkey() and call it from server.ts shutdown alongside closePool()
// TODO: in tests, point at a separate logical DB (e.g. /1) and flush it in globalSetup
