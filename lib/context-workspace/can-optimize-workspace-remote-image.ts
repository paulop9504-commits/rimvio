/**
 * Whether a remote image URL can use Vercel Image Optimization.
 * Unknown CDNs still render via next/image with unoptimized.
 */

const OPTIMIZED_HOST_SUFFIXES = [
  "unsplash.com",
  "images.unsplash.com",
  "googleapis.com",
  "gstatic.com",
  "googleusercontent.com",
  "ggpht.com",
  "liteapi.travel",
  "cloudinary.com",
  "imgix.net",
  "amazonaws.com",
  "cloudfront.net",
  "supabase.co",
  "rimvio.com",
] as const;

export function canOptimizeWorkspaceRemoteImage(src: string): boolean {
  try {
    const host = new URL(src).hostname.toLowerCase();
    return OPTIMIZED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}
