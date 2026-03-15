import { supabase } from '@/integrations/supabase/client';

const LMS_ASSETS_SIGN_PREFIX = '/storage/v1/object/sign/lms-assets/';
const LMS_ASSETS_PUBLIC_PREFIX = '/storage/v1/object/public/lms-assets/';

/**
 * Get a signed URL for a storage file that expires after 1 hour.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Extract lms-assets storage path from either a raw path or storage URL.
 */
export function extractLmsAssetPath(value: string | null): string | null {
  if (!value) return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const isHttpUrl = /^https?:\/\//i.test(trimmedValue);
  if (!isHttpUrl) {
    return trimmedValue.replace(/^\/+/, '');
  }

  if (trimmedValue.includes(LMS_ASSETS_SIGN_PREFIX)) {
    const [urlWithoutQuery] = trimmedValue.split('?');
    const extractedPath = urlWithoutQuery.split(LMS_ASSETS_SIGN_PREFIX)[1];
    return extractedPath ? decodeURIComponent(extractedPath) : null;
  }

  if (trimmedValue.includes(LMS_ASSETS_PUBLIC_PREFIX)) {
    const [urlWithoutQuery] = trimmedValue.split('?');
    const extractedPath = urlWithoutQuery.split(LMS_ASSETS_PUBLIC_PREFIX)[1];
    return extractedPath ? decodeURIComponent(extractedPath) : null;
  }

  return null;
}

/**
 * Get signed URLs for course content (videos and documents).
 */
export async function getSignedAssetUrl(storagePath: string | null): Promise<string | null> {
  if (!storagePath) return null;
  return getSignedUrl('lms-assets', storagePath, 3600);
}

/**
 * Resolve a stable thumbnail value to a fresh signed URL.
 * Handles raw storage paths and expired signed/public URLs.
 */
export async function getSignedLmsAssetUrl(
  storedValue: string | null,
  expiresIn: number = 60 * 60 * 24 * 7,
): Promise<string | null> {
  if (!storedValue) return null;

  const storagePath = extractLmsAssetPath(storedValue);
  if (!storagePath) return storedValue;

  const signedUrl = await getSignedUrl('lms-assets', storagePath, expiresIn);
  if (signedUrl) return signedUrl;

  return /^https?:\/\//i.test(storedValue) ? storedValue : null;
}
