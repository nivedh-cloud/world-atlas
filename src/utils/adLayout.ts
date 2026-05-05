import { Capacitor } from "@capacitor/core";

/** Extra inset for AdMob adaptive banner (~150px strip + overlay padding via --banner-ad-strip). */
export const BANNER_AD_STRIP_HEIGHT_VAR = "150px";

/** True when a bottom AdMob banner may be visible (native app, user not ad-free). */
export function shouldReserveSpaceForBannerAd(premiumAdFree: boolean | undefined): boolean {
  return Capacitor.isNativePlatform() && !premiumAdFree;
}
