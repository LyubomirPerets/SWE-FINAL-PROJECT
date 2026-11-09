// Shared Amazon S3 client for file storage (customer documents and photos; job files later).
//
// Files never pass through our server. The backend hands the browser a short-lived
// presigned URL, and the browser uploads to / downloads from S3 directly.
// The bucket is private ("Block all public access"), so a presigned URL is the only way in.

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

/** How long presigned upload/download URLs stay valid. */
export const URL_TTL_SECONDS = 5 * 60;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export type S3Settings = {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type S3Env = {
  AWS_REGION?: string | undefined;
  S3_BUCKET?: string | undefined;
  AWS_ACCESS_KEY_ID?: string | undefined;
  AWS_SECRET_ACCESS_KEY?: string | undefined;
};

const S3_VARS = ['AWS_REGION', 'S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] as const;

export class S3NotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`S3 not configured: set ${missing.join(', ')} in .env`);
    this.name = 'S3NotConfiguredError';
  }
}

/** Reads S3 settings from env vars, or throws naming exactly which ones are missing. */
export function s3SettingsFrom(env: S3Env): S3Settings {
  const missing = S3_VARS.filter((name) => !env[name]);
  if (missing.length > 0) throw new S3NotConfiguredError(missing);
  return {
    region: env.AWS_REGION!,
    bucket: env.S3_BUCKET!,
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  };
}

export type ParentRef = { type: 'customers' | 'jobs'; id: number };

/**
 * Object key for a new upload: `<customers|jobs>/<id>/<uuid>-<clean-filename>`.
 * The uuid keeps two uploads of the same filename from overwriting each other, and the
 * cleaning means a filename can never change which folder the object lands in.
 */
export function buildKey(parent: ParentRef, filename: string): string {
  if (!Number.isInteger(parent.id) || parent.id <= 0) {
    throw new Error(`Invalid ${parent.type} id: ${parent.id}`);
  }
  // Drop any directory parts, whether written with / or \.
  const base = path.posix.basename(filename.replaceAll('\\', '/'));
  const ext = path.posix.extname(base);
  const cleanExt = slug(ext).slice(0, 10);
  const cleanName = slug(base.slice(0, base.length - ext.length)).slice(0, 60) || 'file';
  return `${parent.type}/${parent.id}/${randomUUID()}-${cleanName}${cleanExt ? `.${cleanExt}` : ''}`;
}

/** Lowercase ASCII letters/digits separated by single dashes ("Café (1)" -> "cafe-1"). */
function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type UploadRequest = { key: string; contentType: string; sizeBytes: number };

export type PresignedUpload = {
  url: string;
  key: string;
  expiresIn: number;
  /** The browser must send these exact headers with its PUT, or S3 rejects the upload. */
  headers: { 'Content-Type': AllowedContentType };
};

function isAllowedType(type: string): type is AllowedContentType {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(type);
}

export function createS3(settings: S3Settings) {
  const client = new S3Client({
    region: settings.region,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
    // Without this, the SDK adds a checksum of an empty body to presigned PUT URLs,
    // and S3 then rejects the browser's real upload.
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });

  return {
    client,
    bucket: settings.bucket,

    /**
     * Presigned PUT URL for one upload. Content type and exact size are part of the
     * signature, so the browser can't swap in a different file type or a bigger file.
     */
    async presignUpload({ key, contentType, sizeBytes }: UploadRequest): Promise<PresignedUpload> {
      if (!isAllowedType(contentType)) {
        throw new Error(`File type not allowed: ${contentType}`);
      }
      if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
        throw new Error(`File size must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes`);
      }
      const command = new PutObjectCommand({
        Bucket: settings.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: sizeBytes,
      });
      const url = await getSignedUrl(client, command, {
        expiresIn: URL_TTL_SECONDS,
        signableHeaders: new Set(['content-type', 'content-length']),
      });
      return { url, key, expiresIn: URL_TTL_SECONDS, headers: { 'Content-Type': contentType } };
    },

    /**
     * Presigned GET URL. The browser always downloads the file as `downloadName` instead
     * of displaying it, so an uploaded HTML or SVG file can't run in the viewer's browser.
     */
    async presignDownload(key: string, downloadName: string): Promise<string> {
      const safeName = downloadName.replace(/["\\\r\n]/g, '').trim() || 'download';
      const command = new GetObjectCommand({
        Bucket: settings.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${safeName}"`,
      });
      return getSignedUrl(client, command, { expiresIn: URL_TTL_SECONDS });
    },

    async deleteObject(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: settings.bucket, Key: key }));
    },
  };
}

export type S3 = ReturnType<typeof createS3>;

let shared: S3 | undefined;

/** The app's S3 helpers, built from .env on first use. Throws S3NotConfiguredError if vars are missing. */
export function getS3(): S3 {
  shared ??= createS3(s3SettingsFrom(config));
  return shared;
}
