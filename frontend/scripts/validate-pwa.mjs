import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "public/manifest.webmanifest"), "utf8"));
if (manifest.lang !== "pt-BR" || manifest.display !== "standalone" || !manifest.start_url) throw new Error("Manifesto PWA incompleto");
if (!Array.isArray(manifest.icons) || manifest.icons.length < 2 || !manifest.icons.some((icon) => icon.purpose === "maskable")) throw new Error("Ícones PWA incompletos");
for (const icon of manifest.icons) await access(path.join(root, "public", icon.src.replace(/^\//, "")));
const [serviceWorker, html, css] = await Promise.all([readFile(path.join(root, "public/sw.js"), "utf8"), readFile(path.join(root, "index.html"), "utf8"), readFile(path.join(root, "src/styles.css"), "utf8")]);
if (!serviceWorker.includes('request.headers.has("Authorization")') || !serviceWorker.includes('url.pathname.startsWith("/api")')) throw new Error("O service worker deve ignorar dados autenticados e a API");
if (!html.includes('lang="pt-BR"') || !html.includes('rel="manifest"')) throw new Error("HTML sem idioma ou manifesto");
if (!css.includes(":focus-visible") || !css.includes("prefers-reduced-motion") || !css.includes(".skip-link")) throw new Error("Recursos básicos de acessibilidade ausentes");
console.log("PWA e verificações estáticas de acessibilidade: válidas");
