// /api/attachments routes. Files never pass through our server; the browser uploads straight to S3.

// TODO: Router with requireAuth on all routes
// TODO: POST   /presign        -> presigned PUT URL for a new upload
// TODO: POST   /confirm        -> record metadata after the upload succeeds
// TODO: GET    /?customerId=|jobId= -> list attachments for a parent
// TODO: GET    /:id/download   -> presigned GET URL (redirect or JSON)
// TODO: DELETE /:id            -> office staff only (requireRole('associate', 'manager'))
// TODO: mount in src/app.ts next to customers/jobs routers
// TODO: tests/attachments.test.ts with the S3 client mocked
