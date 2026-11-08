import "server-only";

import { randomBytes } from "node:crypto";

import { v2 as cloudinary } from "cloudinary";

import { env } from "./env";

/**
 * Logo + product photos. Stored in Cloudinary as "authenticated" images:
 * the plain address returns 404; only the server hands out short-lived
 * signed links, and only to a signed-in admin.
 */
export class UploadError extends Error {}

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request limit

const SIGNATURES = [
  { ext: "jpg", test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", test: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", test: (b: Buffer) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
];

let ready = false;
function cld() {
  const url = env().CLOUDINARY_URL;
  if (!url) throw new UploadError("storage-off");
  if (!ready) {
    const u = new URL(url);
    cloudinary.config({ cloud_name: u.hostname, api_key: decodeURIComponent(u.username), api_secret: decodeURIComponent(u.password), secure: true });
    ready = true;
  }
  return cloudinary;
}

export function storageEnabled() {
  return Boolean(env().CLOUDINARY_URL);
}

/** Checks size and the REAL type (first bytes), then stores. Returns the key to keep on the booking. */
export async function storeImage(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError("empty");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("too-big");
  const body = Buffer.from(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(body));
  if (!sig) throw new UploadError("type");
  const publicId = `${env().CLOUDINARY_FOLDER}/uploads/${new Date().toISOString().slice(0, 7)}/${randomBytes(12).toString("hex")}`;
  await new Promise((resolve, reject) =>
    cld()
      .uploader.upload_stream({ public_id: publicId, type: "authenticated", resource_type: "image", overwrite: false }, (e, r) => (e ? reject(e) : resolve(r)))
      .end(body),
  );
  return `cloudinary:${publicId}`;
}

/** Is this a key our own upload route produced? (The browser cannot attach anyone else's file.) */
export function isOwnKey(key: string) {
  return new RegExp(`^cloudinary:${env().CLOUDINARY_FOLDER}/uploads/\\d{4}-\\d{2}/[a-f0-9]{24}$`).test(key);
}

/** A signed link, valid one hour, for the admin screens. */
export function signedImageUrl(key: string, width = 1200) {
  const publicId = key.replace(/^cloudinary:/, "");
  return cld().url(publicId, {
    type: "authenticated",
    sign_url: true,
    secure: true,
    transformation: [{ width, crop: "limit", quality: "auto", fetch_format: "auto" }],
  });
}
