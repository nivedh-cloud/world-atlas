import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

const DEFAULT_APP_BANNER_AD_UNIT = "ca-app-pub-6545283419126344/2343700728";
const DEFAULT_INTERSTITIAL_AD_UNIT = "ca-app-pub-6545283419126344/2696203299";

/** App id (~) configured in Android `strings.xml` / iOS plist: ca-app-pub-6545283419126344~2344849507 */

const MIN_BACKGROUND_MS = 4_000;
const INTERSTITIAL_COOLDOWN_MS = 120_000;

/** Google sample IDs — https://developers.google.com/admob/android/test-ads#sample_ad_units */
export const ADMOB_SAMPLE_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
export const ADMOB_SAMPLE_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

/**
 * Serve AdMob sample / flagged test placements until you opt into real monetization builds.
 * - `vite`/dev: always test.
 * - Release: test unless `.env.production` sets `VITE_ADMOB_REAL_ADS=true`.
 */
function shouldUseTestAds(): boolean {
  if (import.meta.env.DEV) return true;
  return import.meta.env.VITE_ADMOB_REAL_ADS !== "true";
}

/** Ads are started from `App.tsx` only when `settings.premiumAdFree` is falsy. */

function bannerAdUnitId(): string {
  if (shouldUseTestAds()) return ADMOB_SAMPLE_BANNER_ID;
  const fromEnv = import.meta.env.VITE_ADMOB_BANNER_AD_UNIT_ID;
  return typeof fromEnv === "string" && fromEnv.length > 0 ? fromEnv : DEFAULT_APP_BANNER_AD_UNIT;
}

function interstitialAdUnitId(): string {
  if (shouldUseTestAds()) return ADMOB_SAMPLE_INTERSTITIAL_ID;
  const fromEnv = import.meta.env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID;
  return typeof fromEnv === "string" && fromEnv.length > 0 ? fromEnv : DEFAULT_INTERSTITIAL_AD_UNIT;
}

let pauseHandle: PluginListenerHandle | undefined;
let resumeHandle: PluginListenerHandle | undefined;
let interstitialDismissHandle: PluginListenerHandle | undefined;
let pauseStartedAt = 0;
let lastInterstitialAt = 0;

async function prepareInterstitial(adMob: typeof import("@capacitor-community/admob").AdMob): Promise<void> {
  await adMob.prepareInterstitial({
    adId: interstitialAdUnitId(),
    isTesting: shouldUseTestAds(),
  });
}

export async function initAndShowBannerAds(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const {
    AdMob,
    BannerAdSize,
    BannerAdPosition,
    InterstitialAdPluginEvents,
  } = await import("@capacitor-community/admob");

  await AdMob.initialize({
    initializeForTesting: shouldUseTestAds(),
  });

  await AdMob.showBanner({
    adId: bannerAdUnitId(),
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    isTesting: shouldUseTestAds(),
  });

  await prepareInterstitial(AdMob);

  interstitialDismissHandle?.remove?.();
  interstitialDismissHandle = await AdMob.addListener(
    InterstitialAdPluginEvents.Dismissed,
    () => void prepareInterstitial(AdMob),
  );

  pauseHandle?.remove?.();
  resumeHandle?.remove?.();

  pauseHandle = await App.addListener("pause", () => {
    pauseStartedAt = Date.now();
  });

  resumeHandle = await App.addListener("resume", async () => {
    if (!pauseStartedAt) return;
    const backgroundMs = Date.now() - pauseStartedAt;
    if (backgroundMs < MIN_BACKGROUND_MS) return;
    if (Date.now() - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return;
    try {
      await AdMob.showInterstitial();
      lastInterstitialAt = Date.now();
    } catch {
      void prepareInterstitial(AdMob);
    }
  });
}

export async function destroyBannerAds(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await pauseHandle?.remove?.();
  await resumeHandle?.remove?.();
  await interstitialDismissHandle?.remove?.();
  pauseHandle = undefined;
  resumeHandle = undefined;
  interstitialDismissHandle = undefined;
  pauseStartedAt = 0;

  const { AdMob } = await import("@capacitor-community/admob");
  try {
    await AdMob.removeBanner();
  } catch {
    /* no banner */
  }
}
