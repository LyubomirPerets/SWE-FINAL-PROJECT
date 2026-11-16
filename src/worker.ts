// Background worker entrypoint. Runs as a separate process from the API (same codebase/image).

// TODO: start a BullMQ Worker for each queue in src/queues/ (transcription first)
// TODO: set concurrency per worker; keep it low for CPU/API-heavy jobs
// TODO: log job completed/failed events
// TODO: graceful shutdown on SIGTERM/SIGINT: worker.close(), closeValkey(), closePool()
// TODO: add npm scripts: "worker": "node dist/worker.js", "dev:worker": "tsx watch src/worker.ts"
// TODO: add valkey service to docker-compose.yml (valkey/valkey:8, --appendonly yes, volume)
// TODO: add valkey service container to .github/workflows/ci.yml
// TODO: integration test (tests/worker.test.ts): enqueue a job and assert it was processed
// TODO: README onboarding: start Valkey, run the worker
