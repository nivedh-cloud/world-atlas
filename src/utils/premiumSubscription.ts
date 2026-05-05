import { Capacitor } from '@capacitor/core';
import type { Transaction } from '@capgo/native-purchases';

import type { PremiumProductConfig } from '../config/premiumProducts';
import { getPremiumProductConfig, premiumSubscriptionProductIds } from '../config/premiumProducts';

function entitledTransaction(tx: Transaction, cfg: PremiumProductConfig): boolean {
  const pid = tx.productIdentifier;
  if (pid !== cfg.monthlyProductId && pid !== cfg.yearlyProductId) return false;
  const pType = (tx.productType ?? '').toLowerCase();
  if (pType !== 'subs') return false;
  if (tx.purchaseState === '0') return false;
  if (tx.purchaseState === '1') return true;
  if (tx.isActive === true) return true;
  if (tx.expirationDate) return new Date(tx.expirationDate) > new Date();
  return !!(tx.transactionId ?? tx.orderId);
}

export async function hasActivePremiumEntitlement(cfg = getPremiumProductConfig()): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    if (!isBillingSupported) return false;

    const plat = Capacitor.getPlatform();
    const purchasesOpts =
      plat === 'ios'
        ? { productType: PURCHASE_TYPE.SUBS, onlyCurrentEntitlements: true as const }
        : { productType: PURCHASE_TYPE.SUBS };
    const { purchases } = await NativePurchases.getPurchases(purchasesOpts);
    return purchases.some(tx => entitledTransaction(tx, cfg));
  } catch {
    return false;
  }
}

export async function restorePremiumPurchases(cfg = getPremiumProductConfig()): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
    await NativePurchases.restorePurchases();
    const plat = Capacitor.getPlatform();
    const purchasesOpts =
      plat === 'ios'
        ? { productType: PURCHASE_TYPE.SUBS, onlyCurrentEntitlements: true as const }
        : { productType: PURCHASE_TYPE.SUBS };
    const { purchases } = await NativePurchases.getPurchases(purchasesOpts);
    return purchases.some(tx => entitledTransaction(tx, cfg));
  } catch {
    return false;
  }
}

export async function purchasePremiumPlan(plan: 'monthly' | 'yearly', cfg = getPremiumProductConfig()): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Subscriptions are available in the Play Store build only.');
  }
  const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');

  const { isBillingSupported } = await NativePurchases.isBillingSupported();
  if (!isBillingSupported) throw new Error('Billing is not supported on this device.');

  const productIdentifier = plan === 'monthly' ? cfg.monthlyProductId : cfg.yearlyProductId;
  const basePlanIdentifier = plan === 'monthly' ? cfg.monthlyBasePlanId : cfg.yearlyBasePlanId;

  const tx = await NativePurchases.purchaseProduct({
    productIdentifier,
    planIdentifier: basePlanIdentifier,
    productType: PURCHASE_TYPE.SUBS,
    quantity: Capacitor.getPlatform() === 'ios' ? 1 : undefined,
    autoAcknowledgePurchases: true,
  });

  if (Capacitor.getPlatform() === 'android' && tx.purchaseState !== undefined && tx.purchaseState !== '1') {
    throw new Error(tx.purchaseState === '0' ? 'Purchase is pending. Try again in a moment.' : 'Purchase did not complete.');
  }
}

export type LoadedPremiumOffers = {
  monthly: {
    title: string;
    priceLabel: string;
    productIdentifier: string;
    basePlanId: string;
  } | null;
  yearly: {
    title: string;
    priceLabel: string;
    productIdentifier: string;
    basePlanId: string;
  } | null;
};

/**
 * Matches products returned by the store to our configured monthly/yearly IDs.
 * On Android subscriptions, definitions use identifier = base plan, planIdentifier = Play product ID.
 */
export async function loadPremiumOffers(cfg = getPremiumProductConfig()): Promise<LoadedPremiumOffers> {
  const empty: LoadedPremiumOffers = { monthly: null, yearly: null };
  if (!Capacitor.isNativePlatform()) return empty;

  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
    const ids = premiumSubscriptionProductIds(cfg);
    if (ids.length === 0) return empty;

    const { products } = await NativePurchases.getProducts({
      productIdentifiers: ids,
      productType: PURCHASE_TYPE.SUBS,
    });

    const pick = (productId: string, basePlanId: string) => {
      const match = products.find(
        p => (p.planIdentifier === productId && p.identifier === basePlanId)
          || (p.identifier === basePlanId && p.planIdentifier === productId),
      );
      if (match) {
        return {
          title: match.title || 'Premium',
          priceLabel: match.priceString,
          productIdentifier: productId,
          basePlanId,
        };
      }
      const loose = products.find(p => p.planIdentifier === productId || p.identifier === basePlanId);
      if (loose) {
        return {
          title: loose.title || 'Premium',
          priceLabel: loose.priceString,
          productIdentifier: productId,
          basePlanId,
        };
      }
      return null;
    };

    return {
      monthly: pick(cfg.monthlyProductId, cfg.monthlyBasePlanId),
      yearly: pick(cfg.yearlyProductId, cfg.yearlyBasePlanId),
    };
  } catch {
    return empty;
  }
}

export async function openPremiumManageSubscriptions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { NativePurchases } = await import('@capgo/native-purchases');
  await NativePurchases.manageSubscriptions();
}
