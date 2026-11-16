// Zod schemas for attachments (files stored in S3, metadata stored in Postgres).

// TODO: presignUploadSchema: { filename, contentType, sizeBytes, customerId? | jobId? } (exactly one parent)
// TODO: allowlist of content types (image/jpeg, image/png, application/pdf, audio/*)
// TODO: max file size limit (e.g. 10 MB images/docs, larger for recordings)
// TODO: confirmUploadSchema: { key } sent after the browser finishes the PUT to S3
// TODO: attachmentParamsSchema: { id } coerced to a positive int (match jobs.schema.ts style)
