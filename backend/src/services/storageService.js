const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Cloudflare R2 Storage Service
 * R2 is S3-compatible, so we use the AWS SDK with a custom endpoint.
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'srrss';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''; // Optional: public bucket URL for direct access

// Build the R2 endpoint from the account ID
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID
  ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : '');

let s3Client = null;

/**
 * Get or create the S3-compatible client for Cloudflare R2
 */
function getClient() {
  if (s3Client) return s3Client;

  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    logger.warn('Cloudflare R2 credentials not configured — file uploads will fail.');
    return null;
  }

  s3Client = new S3Client({
    region: 'auto', // R2 uses 'auto' as the region
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  logger.info('Cloudflare R2 client initialized.');
  return s3Client;
}

/**
 * Generate a unique storage key for the file
 * @param {string} userId - The user's ID
 * @param {string} originalName - Original filename
 * @returns {string} S3/R2 object key
 */
function generateKey(userId, originalName) {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  return `resumes/${userId}/resume-${timestamp}-${random}${ext}`;
}

/**
 * Upload a file buffer to Cloudflare R2
 * @param {Object} params
 * @param {Buffer} params.buffer - File buffer
 * @param {string} params.key - Object key (path in bucket)
 * @param {string} params.contentType - MIME type
 * @param {Object} [params.metadata] - Optional metadata
 * @returns {Promise<{key: string, url: string}>}
 */
async function uploadFile({ buffer, key, contentType, metadata = {} }) {
  const client = getClient();
  if (!client) {
    throw new Error('R2 storage is not configured. Set R2 environment variables.');
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
  });

  await client.send(command);

  // Build the URL — use public URL if available, otherwise return the key
  const url = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
    : `r2://${R2_BUCKET_NAME}/${key}`;

  logger.info(`File uploaded to R2: ${key}`);
  return { key, url };
}

/**
 * Get a pre-signed download URL for a file in R2
 * @param {string} key - Object key
 * @param {number} [expiresIn=3600] - URL expiry in seconds (default 1 hour)
 * @returns {Promise<string>} Pre-signed URL
 */
async function getDownloadUrl(key, expiresIn = 3600) {
  const client = getClient();
  if (!client) {
    throw new Error('R2 storage is not configured.');
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn });
  return signedUrl;
}

/**
 * Delete a file from R2
 * @param {string} key - Object key
 * @returns {Promise<void>}
 */
async function deleteFile(key) {
  const client = getClient();
  if (!client) {
    throw new Error('R2 storage is not configured.');
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
  logger.info(`File deleted from R2: ${key}`);
}

/**
 * Check if R2 storage is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

module.exports = {
  uploadFile,
  getDownloadUrl,
  deleteFile,
  generateKey,
  isConfigured,
};
