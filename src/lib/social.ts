/** Social networks a business can list, and how a bare @handle becomes a link. */
export const NETWORKS = ["tiktok", "instagram", "facebook", "youtube", "x", "snapchat", "linkedin", "website"] as const;
export type Network = (typeof NETWORKS)[number];
export type SocialLink = { network: Network; url: string };

const BASE: Record<Network, (h: string) => string> = {
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  instagram: (h) => `https://www.instagram.com/${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  x: (h) => `https://x.com/${h}`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
  linkedin: (h) => `https://www.linkedin.com/company/${h}`,
  website: (h) => `https://${h}`,
};

/** "@ma.marque" → https://www.tiktok.com/@ma.marque ; "tiktok.com/@x" → https://tiktok.com/@x */
export function toSocialUrl(network: Network, raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/\.[a-z]{2,}(\/|$)/i.test(v) && (network === "website" || v.includes("/"))) return `https://${v}`;
  return BASE[network](v.replace(/^@/, ""));
}

/** What to show in a list: the handle when we can read one, else the host + path. */
export function socialLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    return path && path !== "/" ? decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "") : u.host;
  } catch {
    return url;
  }
}
