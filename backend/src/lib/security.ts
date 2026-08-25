import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const strongPasswordSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres").max(72)
  .regex(/[a-z]/, "Inclua pelo menos uma letra minúscula")
  .regex(/[A-Z]/, "Inclua pelo menos uma letra maiúscula")
  .regex(/\d/, "Inclua pelo menos um número");

export function generateResetToken() {
  return randomBytes(24).toString("base64url");
}
export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function sessionDescription(userAgent: string | null) {
  if (!userAgent) return "Dispositivo não identificado";
  const browser = /Edg\//.test(userAgent) ? "Microsoft Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Google Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Navegador";
  const system = /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Windows/.test(userAgent) ? "Windows" : /Mac OS/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "Sistema desconhecido";
  return `${browser} em ${system}`;
}
