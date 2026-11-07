// BullMQ queue for call/meeting transcription (first async feature from the PRD).

// TODO: create Queue('transcription') using the BullMQ connection factory from src/lib/valkey.ts
// TODO: define the job payload type (recording S3 key, customer id, uploaded-by user id)
// TODO: enqueueTranscription(payload) helper with retries (attempts + exponential backoff)
// TODO: removeOnComplete / removeOnFail limits so finished jobs don't pile up in Valkey
// TODO: processor function: download recording from S3 -> transcribe -> summarize -> write to Postgres
// TODO: decide later: reminders/email queues follow the same pattern in sibling files
