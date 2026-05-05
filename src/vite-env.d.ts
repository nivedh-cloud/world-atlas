/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;

  /** Play / App Store subscription product & base-plan IDs (`src/config/premiumProducts.ts`) */
  readonly VITE_PREMIUM_MONTHLY_PRODUCT_ID?: string;
  readonly VITE_PREMIUM_YEARLY_PRODUCT_ID?: string;
  readonly VITE_PREMIUM_MONTHLY_BASE_PLAN_ID?: string;
  readonly VITE_PREMIUM_YEARLY_BASE_PLAN_ID?: string;

  readonly VITE_ADMOB_BANNER_AD_UNIT_ID?: string;
  readonly VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID?: string;
  /** Build with `true` only for production live ads — otherwise Google sample/test ads load. */
  readonly VITE_ADMOB_REAL_ADS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
