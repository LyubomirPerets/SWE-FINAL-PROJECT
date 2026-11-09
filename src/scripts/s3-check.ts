// `npm run s3:check`: proves the real S3 setup works end to end.
// Uploads a tiny PNG through a presigned URL, downloads it back, checks CORS for the
// frontend's dev origin, then deletes it. Needs the AWS_* and S3_BUCKET values in .env.

import { randomUUID } from 'node:crypto';
import { getS3 } from '../lib/s3.js';

const FRONTEND_ORIGIN = 'http://localhost:5173';
// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

function pass(step: string): void {
  console.log(`  ✓ ${step}`);
}

async function main(): Promise<void> {
  const s3 = getS3();
  const key = `healthchecks/${randomUUID()}-s3-check.png`;
  console.log(`S3 check against bucket "${s3.bucket}"`);

  let uploaded = false;
  try {
    const upload = await s3.presignUpload({
      key,
      contentType: 'image/png',
      sizeBytes: PNG.length,
    });

    const preflight = await fetch(upload.url, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    const allowed = preflight.headers.get('access-control-allow-origin');
    if (!preflight.ok || (allowed !== FRONTEND_ORIGIN && allowed !== '*')) {
      throw new Error(
        `CORS: browser uploads from ${FRONTEND_ORIGIN} would be blocked (status ${preflight.status}). Check the bucket's CORS rule.`,
      );
    }
    pass(`CORS allows uploads from ${FRONTEND_ORIGIN}`);

    const put = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: PNG });
    if (!put.ok) throw new Error(`Upload failed: ${put.status} ${await put.text()}`);
    uploaded = true;
    pass('upload through a presigned URL');

    const get = await fetch(await s3.presignDownload(key, 'check.png'));
    if (!get.ok) throw new Error(`Download failed: ${get.status} ${await get.text()}`);
    const body = Buffer.from(await get.arrayBuffer());
    if (!body.equals(PNG)) throw new Error('Downloaded file does not match what was uploaded');
    const disposition = get.headers.get('content-disposition') ?? '';
    if (!disposition.startsWith('attachment')) {
      throw new Error(`Download is not forced as an attachment (got "${disposition}")`);
    }
    pass('download through a presigned URL (same bytes, forced as attachment)');

    await s3.deleteObject(key);
    uploaded = false;
    const gone = await fetch(await s3.presignDownload(key, 'check.png'));
    if (gone.status !== 404) throw new Error(`Expected 404 after delete, got ${gone.status}`);
    pass('delete');

    console.log('S3 is set up correctly.');
  } finally {
    if (uploaded) await s3.deleteObject(key).catch(() => undefined);
  }
}

main().catch((err: unknown) => {
  console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
