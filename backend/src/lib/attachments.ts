import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
export const maximumAttachmentSize = 5 * 1024 * 1024;
export async function ensureAttachmentStorage() { await mkdir(uploadRoot, { recursive: true }); await access(uploadRoot, constants.R_OK | constants.W_OK); }

export function detectAttachment(buffer: Buffer) {
  if (buffer.subarray(0, 5).toString() === "%PDF-") return { mimeType: "application/pdf", extension: ".pdf" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mimeType: "image/jpeg", extension: ".jpg" };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mimeType: "image/png", extension: ".png" };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return { mimeType: "image/webp", extension: ".webp" };
  return null;
}
export function safeOriginalName(name: string) {
  return path.basename(name).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || "comprovante";
}
export function attachmentHash(buffer: Buffer) { return createHash("sha256").update(buffer).digest("hex"); }
export function attachmentPath(storedName: string) {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/i.test(storedName)) throw new Error("Nome de anexo inválido");
  return path.join(uploadRoot, storedName);
}
export async function storeAttachment(buffer: Buffer, extension: string) {
  await ensureAttachmentStorage();
  const storedName = `${randomUUID()}${extension}`;
  await writeFile(attachmentPath(storedName), buffer, { flag: "wx" });
  return storedName;
}
export async function removeStoredAttachment(storedName: string) {
  await unlink(attachmentPath(storedName)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
}
