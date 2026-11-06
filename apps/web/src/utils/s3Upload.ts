import crypto from "crypto";

const DEFAULT_REGION = "ap-south-1";
const DEFAULT_PRESCRIPTION_BUCKET = "sph-prescription";
const DEFAULT_CLEANING_BUCKET = "cleaning-branch-sph";

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function hashSha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export interface S3UploadOptions {
  buffer: Buffer;
  key: string;
  contentType?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

/**
 * Resolves cleaning S3 credentials strictly from environment variables (.env)
 */
export function getCleaningS3Credentials() {
  const accessKeyId =
    process.env.CLEANING_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.CLEANING_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const bucket =
    process.env.CLEANING_AWS_S3_BUCKET_NAME || DEFAULT_CLEANING_BUCKET;
  const region =
    process.env.CLEANING_AWS_REGION || process.env.AWS_REGION || DEFAULT_REGION;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cleaning S3 credentials are missing. Please set CLEANING_AWS_ACCESS_KEY_ID and CLEANING_AWS_SECRET_ACCESS_KEY in your environment (.env)."
    );
  }

  return { accessKeyId, secretAccessKey, bucket, region };
}

/**
 * Upload a branch cleaning photo buffer to AWS S3 using environment variables.
 */
export async function uploadCleaningPhotoBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const creds = getCleaningS3Credentials();

  return await uploadBufferToS3({
    buffer,
    key,
    contentType,
    bucket: creds.bucket,
    region: creds.region,
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
  });
}

/**
 * Generic AWS S3 V4 signer and uploader.
 * All credentials are supplied via options or resolved from environment variables.
 */
export async function uploadBufferToS3(options: S3UploadOptions): Promise<string> {
  const region = options.region || process.env.AWS_REGION || DEFAULT_REGION;
  const bucket = options.bucket || process.env.AWS_S3_BUCKET_NAME || DEFAULT_PRESCRIPTION_BUCKET;
  const accessKeyId = options.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = options.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS S3 credentials missing. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment (.env)."
    );
  }

  const key = options.key.startsWith("/") ? options.key.slice(1) : options.key;
  const contentType = options.contentType || "image/jpeg";
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const url = `https://${host}/${encodeURI(key)}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = hashSha256(options.buffer);

  // Canonical Headers (must be lowercase and alphabetically sorted)
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest =
    `PUT\n` +
    `/${encodeURI(key)}\n` +
    `\n` +
    canonicalHeaders +
    `\n` +
    `${signedHeaders}\n` +
    payloadHash;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign =
    `${algorithm}\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    hashSha256(canonicalRequest);

  // Derive signing key
  const kDate = hmac("AWS4" + secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const authorizationHeader =
    `${algorithm} ` +
    `Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    Host: host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Authorization: authorizationHeader,
  };

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: new Uint8Array(options.buffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("S3 Upload Failed:", response.status, response.statusText, errorText);
    throw new Error(`S3 Upload failed with status ${response.status}: ${errorText || response.statusText}`);
  }

  return url;
}

/**
 * Authenticated GET for cleaning photos stored in private AWS S3 bucket.
 * Allows web & mobile clients to display photos without 403 AccessDenied errors.
 */
export async function fetchCleaningPhotoFromS3(
  key: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const creds = getCleaningS3Credentials();
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const host = `${creds.bucket}.s3.${creds.region}.amazonaws.com`;
  const url = `https://${host}/${encodeURI(cleanKey)}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = hashSha256("");

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest =
    `GET\n` +
    `/${encodeURI(cleanKey)}\n` +
    `\n` +
    canonicalHeaders +
    `\n` +
    `${signedHeaders}\n` +
    payloadHash;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${creds.region}/s3/aws4_request`;
  const stringToSign =
    `${algorithm}\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    hashSha256(canonicalRequest);

  const kDate = hmac("AWS4" + creds.secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, creds.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const authorizationHeader =
    `${algorithm} ` +
    `Credential=${creds.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Host: host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authorizationHeader,
    },
  });

  if (!response.ok) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return { buffer: Buffer.from(arrayBuffer), contentType };
}


