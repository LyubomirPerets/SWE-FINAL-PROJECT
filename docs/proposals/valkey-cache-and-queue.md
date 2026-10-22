# Proposal: Valkey for job queues, caching and pub/sub

**Status:** Deferred. Add it in the sprint that ships the first async feature (most likely call/meeting transcription).
**Date:** 2026-10-14

## Summary

Add [Valkey](https://valkey.io/) (BSD-licensed, Linux Foundation fork of Redis 7.2) as an in-memory store for background jobs, caching and real-time events. Valkey speaks the Redis protocol, so standard Node clients (`ioredis`, `node-redis`) and BullMQ work unchanged. Switching to or from Redis later only means changing the image.

## Why Valkey over Redis

- Same protocol and client libraries, so there's no difference for our code.
- BSD license with no ambiguity. Redis moved to source-available in 2024 and added AGPLv3 in Redis 8, so it's open source again, but the license history is messier.
- It's the default "Redis" on AWS ElastiCache, Google Memorystore and most Linux distros.

## Why we need it (mapped to the PRD)

| PRD feature                               | Valkey role                                                                                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auto-transcribe and log calls/meetings    | **Job queue (BullMQ).** Upload a recording, queue a job, and a worker transcribes, summarizes with AI and writes the record to Postgres. Too slow to run inside an HTTP request. |
| Calendar and Gmail/Outlook sync           | **Repeatable jobs** for polling and webhook processing, plus **rate limiting** of outbound calls to stay under provider API quotas.                                              |
| Email workflows, templates, A/B testing   | **Delayed and scheduled jobs** (e.g. "send variant B in 3 days if no reply"), with retries.                                                                                      |
| Customer context before the agent answers | **Cache** the assembled context (contact, recent activity, last AI summary) so the screen loads fast.                                                                            |
| Manager live activity view                | **Pub/sub**, pushing events to the frontend via WebSocket/SSE across multiple backend instances.                                                                                 |
| Follow-up reminders                       | Delayed jobs.                                                                                                                                                                    |

The job queue is the main reason. Caching and pub/sub are useful extras.

## Ground rules

1. **Postgres is the source of truth and Valkey is temporary.** Transcripts, summaries and activity logs are stored in Postgres. Valkey holds only jobs, cached data and counters, and we should be able to wipe it without losing data.
2. **Enable AOF persistence** (`--appendonly yes`) so queued jobs survive a container restart.
3. **Run the worker as a separate process** (`src/worker.ts` with its own npm script), from the same codebase and image. Slow jobs must never block API requests.
4. **Keep sessions in Postgres** (`connect-pg-simple`) for now. Moving them to Valkey (`connect-redis`) is optional and not worth doing yet.

## Implementation checklist (about half a day)

- [ ] Add a `valkey` service to `docker-compose.yml`:
  ```yaml
  valkey:
    image: valkey/valkey:8
    command: ['valkey-server', '--appendonly', 'yes']
    ports:
      - '6379:6379'
    volumes:
      - valkeydata:/data
  ```
- [ ] Add a Valkey service container to `.github/workflows/ci.yml`
- [ ] `npm install ioredis bullmq`
- [ ] Add `REDIS_URL` (e.g. `redis://localhost:6379`) to `src/config.ts` and `.env` examples
- [ ] Shared connection module (e.g. `src/lib/valkey.ts`)
- [ ] Queue module (e.g. `src/queues/transcription.ts`) and worker entrypoint `src/worker.ts`
- [ ] `npm run worker` / `npm run dev:worker` scripts
- [ ] Integration test that enqueues a job and asserts the worker processed it
- [ ] Update README onboarding (start Valkey, run worker)

## Related scope note

LinkedIn's API is heavily restricted: messaging and profile sync require partner approval. Treat LinkedIn as manual links and notes, not automatic sync. Gmail/Outlook and Google Calendar are doable with OAuth.
