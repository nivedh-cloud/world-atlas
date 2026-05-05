/**
 * Google Play: create one subscription (or two) + base plans, then paste IDs here or in `.env`:
 * VITE_PREMIUM_MONTHLY_PRODUCT_ID, VITE_PREMIUM_YEARLY_PRODUCT_ID (same ID if one sub, two plans)
 * VITE_PREMIUM_MONTHLY_BASE_PLAN_ID, VITE_PREMIUM_YEARLY_BASE_PLAN_ID  (base plan IDs from Play Console)
 */

/** Promotional INR prices shown in the app; configure matching base-plan prices in Play Console for checkout. */
export const PREMIUM_DISPLAY_PRICE_INR = {
  monthly: '₹100',
  yearly: '₹999',
} as const;

export type PremiumProductConfig = {
  monthlyProductId: string;
  yearlyProductId: string;
  monthlyBasePlanId: string;
  yearlyBasePlanId: string;
};

export function getPremiumProductConfig(): PremiumProductConfig {
  const fallbackProduct = 'world_atlas_premium';
  const monthlyPid = import.meta.env.VITE_PREMIUM_MONTHLY_PRODUCT_ID?.trim();
  const yearlyPid = import.meta.env.VITE_PREMIUM_YEARLY_PRODUCT_ID?.trim();
  const monthlyProductId = monthlyPid || yearlyPid || fallbackProduct;
  const yearlyProductId = yearlyPid || monthlyPid || fallbackProduct;

  return {
    monthlyProductId,
    yearlyProductId,
    monthlyBasePlanId: import.meta.env.VITE_PREMIUM_MONTHLY_BASE_PLAN_ID?.trim() || 'monthly',
    yearlyBasePlanId: import.meta.env.VITE_PREMIUM_YEARLY_BASE_PLAN_ID?.trim() || 'yearly',
  };
}

export function premiumSubscriptionProductIds(cfg: PremiumProductConfig): string[] {
  return [...new Set([cfg.monthlyProductId, cfg.yearlyProductId])];
}
