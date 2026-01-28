/**
 * SharePoint Video URL Utilities
 * 
 * Handles validation and transformation of SharePoint video URLs
 * for embedding in an iframe.
 */

/**
 * Validates if a URL is a SharePoint video URL.
 * Matches patterns like:
 * - https://company.sharepoint.com/:v:/s/SiteName/...
 * - https://company.sharepoint.com/:v:/r/sites/...
 * - https://company-my.sharepoint.com/:v:/g/personal/...
 * - https://company.sharepoint.com/.../embed.aspx?...
 */
export function isSharePointUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    // Check if domain ends with sharepoint.com
    return parsed.hostname.endsWith('.sharepoint.com');
  } catch {
    return false;
  }
}

/**
 * Transforms a SharePoint share URL into an embeddable URL.
 * 
 * Input patterns:
 * - Share link: https://company.sharepoint.com/:v:/s/SiteName/EaBC123...
 * - Already embed: https://company.sharepoint.com/.../embed.aspx?...
 * 
 * Output:
 * - Embed URL with action=embedview parameter
 */
/**
 * Cleans a SharePoint URL that might contain extra HTML attributes
 * from copying the entire embed code instead of just the src URL.
 * 
 * Input: 'https://...embed.aspx?..." width="640" height="360"...'
 * Output: 'https://...embed.aspx?...'
 */
export function cleanSharePointUrl(input: string): string {
  if (!input) return input;
  
  // Trim whitespace
  let url = input.trim();
  
  // Check if the input contains HTML attributes after the URL (common mistake)
  // Look for patterns like: " width=" or "' width=" or just ending quote + attributes
  const quoteAttrPattern = /["']\s*(width|height|frameborder|scrolling|allowfullscreen|title|class|style)\s*=/i;
  const match = url.match(quoteAttrPattern);
  
  if (match && match.index !== undefined) {
    // Cut off everything from the quote before attributes
    url = url.substring(0, match.index);
  }
  
  // Also handle case where URL ends with a quote
  url = url.replace(/["']$/, '');
  
  return url.trim();
}

export function getSharePointEmbedUrl(url: string): string | null {
  // First clean the URL in case extra HTML attributes were pasted
  const cleanedUrl = cleanSharePointUrl(url);
  
  if (!isSharePointUrl(cleanedUrl)) return null;
  
  try {
    const parsed = new URL(cleanedUrl);
    
    // If already an embed URL, return as-is (don't add extra params that might break auth)
    if (parsed.pathname.includes('/embed.aspx') || parsed.pathname.includes('/_layouts/15/embed.aspx')) {
      return parsed.toString();
    }
    
    // Check if it's a video share link (contains /:v:/)
    if (parsed.pathname.includes('/:v:/')) {
      // Transform share link to embed URL
      parsed.searchParams.set('action', 'embedview');
      return parsed.toString();
    }
    
    // For other SharePoint URLs, try adding action=embedview
    parsed.searchParams.set('action', 'embedview');
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates a SharePoint URL and returns validation result.
 */
export function validateSharePointUrl(url: string): { valid: boolean; error?: string } {
  if (!url || !url.trim()) {
    return { valid: false, error: 'URL is required' };
  }
  
  try {
    new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  if (!isSharePointUrl(url)) {
    return { valid: false, error: 'URL must be a SharePoint link (*.sharepoint.com)' };
  }
  
  return { valid: true };
}
