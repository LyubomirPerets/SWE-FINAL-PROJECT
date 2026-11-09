// Shared Amazon S3 client for file storage (job photos, call recordings, documents).

// TODO: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
// TODO: add AWS_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY to src/config.ts and .env.example
// TODO: optional S3_ENDPOINT + forcePathStyle for local dev against MinIO/LocalStack
// TODO: export a single S3Client built from config
// TODO: presignUpload(key, contentType, maxBytes): presigned PUT URL, short expiry (~5 min)
// TODO: presignDownload(key): presigned GET URL, short expiry
// TODO: deleteObject(key) for when an attachment row is deleted
// TODO: object key convention, e.g. customers/<customerId>/<uuid>-<filename>, jobs/<jobId>/...
// TODO: bucket setup notes for README: block all public access, CORS rule allowing PUT from the frontend origin
// TODO: never commit real AWS credentials; CI should mock S3 or use MinIO
