import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Plus, Share2, Smartphone, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "puntr-pwa-install-dismissed";
const HIDE_KEY = "puntr-pwa-install-hidden";
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function isIosSafari() {
  const ua = window.navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export function PwaExperience() {
  const { t } = useTranslation("common");
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showNotch, setShowNotch] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // A newly activated worker means the deployed application has changed.
    // Reload once when it takes control so installed PWAs cannot remain on an old JS bundle.
    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;
    const refreshWorker = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (!disposed) await registration.update();
      } catch (error) {
        console.error("[Puntr PWA] Service worker update check failed", error);
      }
    };

    if (document.readyState === "complete") void refreshWorker();
    else window.addEventListener("load", refreshWorker, { once: true });

    // Re-check whenever a user returns to the installed PWA after a deployment.
    const onFocus = () => void registration?.update().catch((error) => {
      console.error("[Puntr PWA] Service worker focus update failed", error);
    });
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      window.removeEventListener("load", refreshWorker);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstall);
    return () => window.removeEventListener("beforeinstallprompt", captureInstall);
  }, []);

  useEffect(() => {
    const requestInstall = () => {
      if (isStandalone()) return;
      setShowNotch(false);
      setShowPrompt(true);
      if (isIosSafari()) setShowIosGuide(true);
    };
    window.addEventListener("puntr:request-install", requestInstall);
    return () => window.removeEventListener("puntr:request-install", requestInstall);
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    const iosDevice = isIosSafari();
    setIos(iosDevice);
    let dismissedUntil = 0;
    let hiddenUntil = 0;
    try {
      dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
      hiddenUntil = Number(localStorage.getItem(HIDE_KEY) || 0);
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
    if (hiddenUntil > Date.now()) return;
    if (dismissedUntil > Date.now()) {
      setShowNotch(true);
      return;
    }

    const onInstalled = () => {
      setShowPrompt(false);
      setShowNotch(false);
      setInstallEvent(null);
      try {
        localStorage.removeItem(DISMISS_KEY);
        localStorage.removeItem(HIDE_KEY);
      } catch {
        /* Ignore unavailable storage. */
      }
    };
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => {
      if (iosDevice || installEvent) setShowPrompt(true);
    }, 6500);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installEvent]);

  const snooze = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    } catch {
      /* Keep the notch for this render when storage is unavailable. */
    }
    setShowPrompt(false);
    setShowNotch(true);
    setShowIosGuide(false);
  };
  const dismissPermanently = () => {
    try {
      localStorage.removeItem(DISMISS_KEY);
      localStorage.setItem(HIDE_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    } catch {
      /* Keep it hidden for this render when storage is unavailable. */
    }
    setShowPrompt(false);
    setShowNotch(false);
    setShowIosGuide(false);
  };
  const reopenPrompt = () => {
    setShowNotch(false);
    setShowPrompt(true);
    if (isIosSafari()) setShowIosGuide(true);
  };
  const install = async () => {
    if (ios) {
      setShowIosGuide(true);
      return;
    }
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
      setShowNotch(false);
      try {
        localStorage.removeItem(DISMISS_KEY);
        localStorage.removeItem(HIDE_KEY);
      } catch {
        /* Ignore unavailable storage. */
      }
    }
    setInstallEvent(null);
  };

  if ((!showPrompt && !showNotch) || isStandalone()) return null;
  return (
    <>
      {showNotch && !showPrompt && (
        <button
          type="button"
          onClick={reopenPrompt}
          aria-label="Get The App"
          className="fixed left-0 top-1/2 z-[90] inline-flex -translate-y-1/2 items-center gap-2 rounded-r-xl border border-l-0 border-white/15 bg-[#101510] px-3 py-3 text-xs font-extrabold text-white shadow-xl shadow-black/25 transition hover:bg-[#17351f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4ADE80]"
        >
          <Download className="size-4 text-[#4ADE80]" />
          <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">Get The App</span>
        </button>
      )}
      {showPrompt && (
        <aside
          className="fixed inset-x-3 z-[90] mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0D0D0D] p-4 text-white shadow-2xl shadow-black/30"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
          aria-label={t("pwa.promptLabel")}
        >
          <div className="flex items-start gap-3">
            <img
              src="/brand/icon-192.png"
              alt=""
              width={52}
              height={52}
              className="shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display text-sm font-extrabold tracking-tight">
                  puntr<span className="text-[#16A34A]">.</span>
                </p>
                <span className="rounded-full bg-[#16A34A]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4ADE80]">
                  {t("pwa.badge")}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold">{t("pwa.title")}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/65">{t("pwa.body")}</p>
            </div>
            <button
              type="button"
              onClick={dismissPermanently}
              aria-label={t("action.close")}
              className="rounded-full p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={install}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#15803D]"
            >
              {ios ? <Share2 className="size-4" /> : <Download className="size-4" />}
              {t("pwa.install")}
            </button>
            <button
              type="button"
              onClick={snooze}
              className="rounded-xl px-3 py-2.5 text-xs font-semibold text-white/65 transition hover:bg-white/10"
            >
              {t("pwa.notNow")}
            </button>
          </div>
        </aside>
      )}
      {showIosGuide && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/65 p-3 sm:items-center"
          role="presentation"
          onClick={() => setShowIosGuide(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="puntr-ios-install-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101010] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-white shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/brand/icon-192.png"
                  alt=""
                  width={44}
                  height={44}
                  className="rounded-xl"
                />
                <div>
                  <p className="font-display text-sm font-extrabold">
                    puntr<span className="text-[#16A34A]">.</span>
                  </p>
                  <p className="text-xs text-white/55">{t("pwa.iosSubtitle")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                aria-label={t("action.close")}
                className="rounded-full p-2 text-white/60 hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
            <h2 id="puntr-ios-install-title" className="mt-5 font-display text-lg font-extrabold">
              {t("pwa.iosTitle")}
            </h2>
            <p className="mt-1 text-sm text-white/65">{t("pwa.iosBody")}</p>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10">
                  <Share2 className="size-4 text-[#4ADE80]" />
                </span>
                <span>{t("pwa.iosStep1")}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10">
                  <Plus className="size-4 text-[#4ADE80]" />
                </span>
                <span>{t("pwa.iosStep2")}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10">
                  <Smartphone className="size-4 text-[#4ADE80]" />
                </span>
                <span>{t("pwa.iosStep3")}</span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-bold text-white"
            >
              {t("pwa.gotIt")}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
