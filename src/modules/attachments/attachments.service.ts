// Attachment metadata in Postgres + S3 object lifecycle via src/lib/s3.ts.

// TODO: migration 00X_attachments.sql (coordinate with DB teammate): id, s3_key, filename,
//       content_type, size_bytes, customer_id FK, job_id FK, uploaded_by FK users, created_at
// TODO: createPendingUpload(): build the S3 key, return presigned PUT URL + key
// TODO: confirmUpload(): verify the object exists (HeadObject), then insert the metadata row
// TODO: listForCustomer(customerId) / listForJob(jobId)
// TODO: getDownloadUrl(id): look up the row, return a presigned GET URL
// TODO: deleteAttachment(id): delete the S3 object, then the row
// TODO: technician access: only attachments on jobs assigned to them (same rule as jobs routes)
