import { Download, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }>; }
export function PwaManager() {
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("pwa-install-dismissed") === "true");
  useEffect(() => {
    const onlineHandler = () => setOnline(true), offlineHandler = () => setOnline(false);
    const promptHandler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const installedHandler = () => setInstallPrompt(null);
    window.addEventListener("online", onlineHandler); window.addEventListener("offline", offlineHandler); window.addEventListener("beforeinstallprompt", promptHandler); window.addEventListener("appinstalled", installedHandler);
    if ("serviceWorker" in navigator && import.meta.env.PROD) void navigator.serviceWorker.register("/sw.js");
    return () => { window.removeEventListener("online", onlineHandler); window.removeEventListener("offline", offlineHandler); window.removeEventListener("beforeinstallprompt", promptHandler); window.removeEventListener("appinstalled", installedHandler); };
  }, []);
  async function install() { if (!installPrompt) return; await installPrompt.prompt(); const choice = await installPrompt.userChoice; if (choice.outcome === "accepted") setInstallPrompt(null); }
  return <>{!online && <div className="offline-banner" role="alert"><WifiOff /> Sem conexão. A consulta e o salvamento de dados ficarão disponíveis quando a internet retornar.</div>}{installPrompt && !dismissed && <div className="install-banner" role="status"><Download /><span><strong>Instalar Control Finance</strong><small>Acesse como aplicativo no computador ou celular.</small></span><button className="primary-button compact" onClick={() => void install()}>Instalar</button><button className="icon-button" aria-label="Fechar sugestão de instalação" onClick={() => { sessionStorage.setItem("pwa-install-dismissed", "true"); setDismissed(true); }}><X /></button></div>}</>;
}
