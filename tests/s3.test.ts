import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';
import { envSchema } from '../src/config.js';
import {
  buildKey,
  createS3,
  MAX_UPLOAD_BYTES,
  S3NotConfiguredError,
  s3SettingsFrom,
} from '../src/lib/s3.js';

// Presigning is local signing math, so these use the real AWS SDK with fake credentials
// and never touch the network. `npm run s3:check` is what tests the real bucket.
const s3 = createS3({
  region: 'us-east-2',
  bucket: 'crm-attachments-test',
  accessKeyId: 'AKIAFAKEFAKEFAKEFAKE',
  secretAccessKey: 'fake-secret-fake-secret-fake-secret-1234',
});

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

function query(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe('S3 config', () => {
  it('accepts an environment with no AWS variables (app runs without S3)', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://localhost/crm',
      SESSION_SECRET: 'a-long-enough-test-secret',
    });
    expect(result.success).toBe(true);
  });

  it('throws a clear error naming each missing variable', () => {
    expect(() => s3SettingsFrom({ AWS_REGION: 'us-east-2', AWS_ACCESS_KEY_ID: '' })).toThrow(
      new S3NotConfiguredError(['S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']),
    );
    expect(() => s3SettingsFrom({})).toThrow(/S3 not configured: set AWS_REGION, S3_BUCKET/);
  });
});

describe('buildKey', () => {
  it('puts a customer file under customers/<id>/<uuid>-<name>', () => {
    expect(buildKey({ type: 'customers', id: 42 }, 'quote.pdf')).toMatch(
      new RegExp(`^customers/42/${UUID}-quote\\.pdf$`),
    );
  });

  it('gives two uploads of the same filename different keys', () => {
    const parent = { type: 'customers', id: 42 } as const;
    expect(buildKey(parent, 'quote.pdf')).not.toBe(buildKey(parent, 'quote.pdf'));
  });

  it("can't escape the parent folder with path tricks", () => {
    for (const name of ['../../etc/passwd', '..\\..\\windows\\evil.pdf', '/abs/path.pdf']) {
      const key = buildKey({ type: 'customers', id: 42 }, name);
      expect(key).toMatch(new RegExp(`^customers/42/${UUID}-[a-z0-9-]+(\\.[a-z0-9]+)?$`));
      expect(key.split('/')).toHaveLength(3);
    }
    // Directory parts are dropped, not folded into the name.
    expect(buildKey({ type: 'customers', id: 42 }, '../../etc/passwd')).toMatch(
      new RegExp(`/${UUID}-passwd$`),
    );
  });

  it('cleans spaces, symbols, capitals and accents', () => {
    expect(buildKey({ type: 'jobs', id: 7 }, 'Site Photo (1).JPG')).toMatch(
      new RegExp(`^jobs/7/${UUID}-site-photo-1\\.jpg$`),
    );
    expect(buildKey({ type: 'jobs', id: 7 }, 'Café Façade.png')).toMatch(/-cafe-facade\.png$/);
    expect(buildKey({ type: 'jobs', id: 7 }, '%%%.pdf')).toMatch(/-file\.pdf$/);
  });

  it('cuts very long filenames but keeps the extension', () => {
    const key = buildKey({ type: 'customers', id: 1 }, `${'a'.repeat(300)}.pdf`);
    const name = key.split('/')[2]!.slice(37); // after "<uuid>-"
    expect(name).toBe(`${'a'.repeat(60)}.pdf`);
  });

  it('rejects a parent id that is not a positive integer', () => {
    expect(() => buildKey({ type: 'customers', id: 0 }, 'a.pdf')).toThrow(/Invalid customers id/);
    expect(() => buildKey({ type: 'customers', id: 1.5 }, 'a.pdf')).toThrow();
  });
});

describe('presignUpload', () => {
  const request = {
    key: 'customers/42/x-quote.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1234,
  };

  it('points at the right bucket and region', async () => {
    const { url, key } = await s3.presignUpload(request);
    const parsed = new URL(url);
    expect(parsed.host).toBe('crm-attachments-test.s3.us-east-2.amazonaws.com');
    expect(parsed.pathname).toBe('/customers/42/x-quote.pdf');
    expect(key).toBe(request.key);
  });

  it('expires after 5 minutes', async () => {
    const upload = await s3.presignUpload(request);
    expect(query(upload.url).get('X-Amz-Expires')).toBe('300');
    expect(upload.expiresIn).toBe(300);
  });

  it('locks the file type and exact size into the signature', async () => {
    const upload = await s3.presignUpload(request);
    const signed = query(upload.url).get('X-Amz-SignedHeaders')!.split(';');
    expect(signed).toEqual(expect.arrayContaining(['content-type', 'content-length', 'host']));
    expect(upload.headers).toEqual({ 'Content-Type': 'application/pdf' });
  });

  it('rejects files over the size limit, and empty files, before creating a link', async () => {
    await expect(s3.presignUpload({ ...request, sizeBytes: MAX_UPLOAD_BYTES + 1 })).rejects.toThrow(
      /File size/,
    );
    await expect(s3.presignUpload({ ...request, sizeBytes: 0 })).rejects.toThrow(/File size/);
    await expect(
      s3.presignUpload({ ...request, sizeBytes: MAX_UPLOAD_BYTES }),
    ).resolves.toBeDefined();
  });

  it('rejects file types that are not on the allowlist', async () => {
    for (const contentType of ['application/x-msdownload', 'text/html', 'image/svg+xml']) {
      await expect(s3.presignUpload({ ...request, contentType })).rejects.toThrow(
        /File type not allowed/,
      );
    }
  });
});

describe('presignDownload', () => {
  it('expires after 5 minutes', async () => {
    const url = await s3.presignDownload('customers/42/x-quote.pdf', 'quote.pdf');
    expect(query(url).get('X-Amz-Expires')).toBe('300');
  });

  it('forces a download with the given filename instead of opening it in the browser', async () => {
    const url = await s3.presignDownload('customers/42/x-page.html', 'evil"\r\nname.html');
    expect(query(url).get('response-content-disposition')).toBe(
      'attachment; filename="evilname.html"',
    );
  });
});

describe('deleteObject', () => {
  it('sends a delete for exactly that bucket and key', async () => {
    const send = vi.spyOn(s3.client, 'send').mockResolvedValue({} as never);
    await s3.deleteObject('customers/42/x-quote.pdf');
    expect(send).toHaveBeenCalledOnce();
    const command = send.mock.calls[0]![0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'crm-attachments-test',
      Key: 'customers/42/x-quote.pdf',
    });
    send.mockRestore();
  });
});
