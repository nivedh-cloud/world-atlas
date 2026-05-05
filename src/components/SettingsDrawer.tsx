import React, { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CountrySelector } from './CountrySelector';
import { useAppSettings } from '../context/appSettingsContext';
import type { MapStyle } from '../context/appSettingsContext';
import { findCountrySlugByIso2, getCountryCodeFromName } from '../utils/geojsonLoader';
import { detectCountryCodeFromDeviceLocation } from '../utils/maptilerGeocodeCountry';
import { PREMIUM_DISPLAY_PRICE_INR } from '../config/premiumProducts';
import {
  openPremiumManageSubscriptions,
  purchasePremiumPlan,
  restorePremiumPurchases,
} from '../utils/premiumSubscription';
import { shouldReserveSpaceForBannerAd } from '../utils/adLayout';
import './SettingsDrawer.css';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAboutOpen: () => void;
  onDeveloperOpen: () => void;
  onStartNavigationTour?: () => void;
  /** Parent sets true briefly to auto-open Premium sheet when Settings opens (e.g. from hamburger menu) */
  launchPremiumFromMenu?: boolean;
  onLaunchPremiumFromMenuConsumed?: () => void;
}

const MAP_STYLE_CONFIG: { key: MapStyle; label: string; icon: string; desc: string }[] = [
  { key: 'default',   label: 'Default',   icon: '🗺️',  desc: 'Clean & minimal' },
  { key: 'base',      label: 'Tiles',     icon: '🗾',  desc: 'Basic country tiles' },
  { key: 'streets',   label: 'Streets',   icon: '🛣️',  desc: 'Road network' },
  { key: 'ocean',     label: 'Ocean',     icon: '🌊',  desc: 'Sea depth' },
  { key: 'landscape', label: 'Landscape', icon: '🌄',  desc: 'Natural scenery' },
  { key: 'topo',      label: 'Topo',      icon: '⛰️',  desc: 'Elevation contours' },
];

type PremiumCheckoutPlan = 'monthly' | 'yearly';

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  onAboutOpen,
  onDeveloperOpen,
  onStartNavigationTour,
  launchPremiumFromMenu = false,
  onLaunchPremiumFromMenuConsumed,
}) => {
  const { settings, updateSettings, toggleDarkMode, setMapStyle } = useAppSettings();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [premiumCheckoutPlan, setPremiumCheckoutPlan] = useState<PremiumCheckoutPlan>('yearly');
  const [premiumShopErr, setPremiumShopErr] = useState<string | null>(null);
  const [premiumBusy, setPremiumBusy] = useState<'monthly' | 'yearly' | 'restore' | null>(null);
  const refSlug = settings.referenceCurrencyCountryCode
    ? findCountrySlugByIso2(settings.referenceCurrencyCountryCode)
    : null;

  useEffect(() => {
    if (premiumModalOpen) setPremiumCheckoutPlan('yearly');
  }, [premiumModalOpen]);

  useEffect(() => {
    if (!isOpen || !launchPremiumFromMenu) return;
    setPremiumModalOpen(true);
    onLaunchPremiumFromMenuConsumed?.();
  }, [isOpen, launchPremiumFromMenu, onLaunchPremiumFromMenuConsumed]);

  const startPremiumCheckout = useCallback(
    (plan: PremiumCheckoutPlan) => {
      void (async () => {
        try {
          setPremiumShopErr(null);
          if (!Capacitor.isNativePlatform()) return;
          setPremiumBusy(plan);
          await purchasePremiumPlan(plan);
          updateSettings({ premiumAdFree: true, premiumSource: 'play' });
          setPremiumModalOpen(false);
          onClose();
        } catch (e: unknown) {
          const msg =
            e instanceof Error
              ? e.message
              : typeof e === 'string'
                ? e
                : plan === 'monthly'
                  ? 'Monthly purchase failed.'
                  : 'Yearly purchase failed.';
          if (!`${msg}`.toLowerCase().includes('cancel')) setPremiumShopErr(msg);
        } finally {
          setPremiumBusy(null);
        }
      })();
    },
    [onClose, updateSettings],
  );

  return (
    <>
      {isOpen && <div className="sd-overlay" onClick={onClose} />}

      <div className={`sd-drawer ${isOpen ? 'sd-open' : ''}`}>
        {/* Header */}
        <div className="sd-header">
          <div className="sd-header-left">
            <span className="sd-header-icon">⚙️</span>
            <span className="sd-header-title">Settings</span>
          </div>
          <button className="sd-close" onClick={onClose} aria-label="Close settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="sd-body">
          {/* Theme Toggle */}
          <div className="sd-section">
            <div className="sd-section-title">Appearance</div>
            <div className="sd-theme-row">
              <div className="sd-theme-info">
                <span className="sd-theme-icon">{settings.darkMode ? '🌙' : '☀️'}</span>
                <div>
                  <div className="sd-theme-label">{settings.darkMode ? 'Dark Mode' : 'Light Mode'}</div>
                  <div className="sd-theme-sub">{settings.darkMode ? 'Easy on the eyes at night' : 'Bright & clear'}</div>
                </div>
              </div>
              <button
                className={`sd-toggle ${settings.darkMode ? 'sd-toggle-on' : ''}`}
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
              >
                <span className="sd-toggle-thumb" />
              </button>
            </div>
          </div>

          {/* About / Developer — kept high so buttons stay reachable; body scroll relies on sd-body min-height:0 */}
          <div className="sd-section">
            <div className="sd-section-title">About</div>
            <button
              type="button"
              className="sd-about-btn"
              onClick={() => { onClose(); onAboutOpen(); }}
            >
              <span className="sd-about-icon">ℹ️</span>
              <div className="sd-about-text">
                <div className="sd-about-label">Data Sources &amp; Info</div>
                <div className="sd-about-sub">CIA Factbook · GFP · SIPRI · BICC · IMF · UNDP · UNESCO · IEA &amp; more</div>
              </div>
              <svg className="sd-about-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              type="button"
              className="sd-about-btn"
              onClick={() => { onClose(); onDeveloperOpen(); }}
            >
              <span className="sd-about-icon">👨‍💻</span>
              <div className="sd-about-text">
                <div className="sd-about-label">Developer Info</div>
                <div className="sd-about-sub">App details, tech stack &amp; contact</div>
              </div>
              <svg className="sd-about-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Map View */}
          <div className="sd-section">
            <div className="sd-section-title">Map Style</div>
            <div className="sd-map-grid">
              {MAP_STYLE_CONFIG.map(({ key, label, icon, desc }) => (
                <button
                  key={key}
                  className={`sd-map-card ${settings.mapStyle === key ? 'sd-map-card-active' : ''}`}
                  onClick={() => setMapStyle(key)}
                >
                  <span className="sd-map-icon">{icon}</span>
                  <span className="sd-map-label">{label}</span>
                  <span className="sd-map-desc">{desc}</span>
                  {settings.mapStyle === key && (
                    <span className="sd-map-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="sd-section">
            <div className="sd-section-title">Premium</div>
            {settings.premiumAdFree ? (
              <div className="sd-premium-active-wrap">
                <div className="sd-premium-active-card">
                  <span className="sd-premium-active-icon" aria-hidden>✨</span>
                  <div className="sd-premium-active-text">
                    <div className="sd-premium-active-label">You&apos;re ad-free</div>
                    <div className="sd-premium-active-sub">
                      {settings.premiumSource === 'play'
                        ? 'Active via Google Play. Renewal and cancellation are managed there.'
                        : 'Test mode — use Developer → QA to turn off ads for testing without a purchase.'}
                    </div>
                  </div>
                </div>
                {settings.premiumSource === 'play' && Capacitor.isNativePlatform() && (
                  <button
                    type="button"
                    className="sd-premium-manage"
                    onClick={() => {
                      void (async () => {
                        try {
                          await openPremiumManageSubscriptions();
                        } catch {
                          /* ignore */
                        }
                      })();
                    }}
                  >
                    Manage subscription
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="sd-premium-teaser">
                  Remove the banner and the fullscreen ad shown when you return after leaving the app.{' '}
                  <strong>
                    {PREMIUM_DISPLAY_PRICE_INR.monthly}/month · {PREMIUM_DISPLAY_PRICE_INR.yearly}/year
                  </strong>
                  {' '}— subscribe with Google Play.
                </p>
                <button
                  type="button"
                  className="sd-go-premium-btn"
                  onClick={() => setPremiumModalOpen(true)}
                >
                  Go Premium
                </button>
              </>
            )}
          </div>

          <div className="sd-section">
            <div className="sd-section-title">Currency</div>
            <p className="sd-currency-hint">
              Used in country info to translate CIA Factbook PPP (USD) figures into your currency. By default we try your location; change it anytime.
            </p>
            <div className="sd-currency-select">
              <CountrySelector
                label="Country"
                selectedCountry={refSlug ?? null}
                onCountryChange={(slug) => {
                  const iso = getCountryCodeFromName(slug).toUpperCase();
                  if (iso.length >= 2) updateSettings({ referenceCurrencyCountryCode: iso });
                }}
              />
            </div>
            <button
              type="button"
              className="sd-currency-location"
              onClick={() => {
                void (async () => {
                  const code = await detectCountryCodeFromDeviceLocation();
                  if (code && code.length >= 2) {
                    updateSettings({ referenceCurrencyCountryCode: code.toUpperCase() });
                  }
                })();
              }}
            >
              Use device location again
            </button>
          </div>

          {onStartNavigationTour && (
            <div className="sd-section">
              <div className="sd-section-title">Help</div>
              <button
                type="button"
                className="sd-about-btn"
                onClick={() => {
                  onClose();
                  onStartNavigationTour();
                }}
              >
                <span className="sd-about-icon">🧭</span>
                <div className="sd-about-text">
                  <div className="sd-about-label">App navigation tour</div>
                  <div className="sd-about-sub">Replay top-bar tips, then the menu tour when you open ☰ next</div>
                </div>
                <svg className="sd-about-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

        </div>
      </div>

      {premiumModalOpen && (
        <div
          className="sd-premium-overlay"
          role="presentation"
          onClick={() => setPremiumModalOpen(false)}
        >
          <div
            className="sd-premium-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sd-premium-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="sd-premium-sheet-head">
              <span className="sd-premium-sheet-icon" aria-hidden>⭐</span>
              <h2 id="sd-premium-title" className="sd-premium-sheet-title">World Atlas Premium</h2>
            </div>
            <ul className="sd-premium-benefits">
              <li>No banner along the bottom of the map</li>
              <li>No fullscreen ad after you leave the app and return</li>
              <li>
                Tap Subscribe to open Google Play checkout — use UPI, cards, net banking, or Play balance (options depend on your Google account and region)
              </li>
            </ul>
            {premiumShopErr && <p className="sd-premium-error">{premiumShopErr}</p>}
            {!Capacitor.isNativePlatform() ? (
              <p className="sd-premium-legal-note sd-premium-web-preview-note">
                You&apos;re on the web preview — Monthly / Yearly and Subscribe appear the same as on Android. Billing (UPI, cards, Play balance, etc.) opens only in the app installed from Google Play.
              </p>
            ) : null}
            <>
              <div className="sd-premium-checkout" role="group" aria-label="Subscription plan and checkout">
                <div className="sd-premium-plan-pick">
                  <button
                    type="button"
                    className={
                      `sd-premium-plan-option${premiumCheckoutPlan === 'monthly' ? ' sd-premium-plan-option--active' : ''}`
                    }
                    disabled={premiumBusy !== null}
                    aria-pressed={premiumCheckoutPlan === 'monthly'}
                    onClick={() => setPremiumCheckoutPlan('monthly')}
                  >
                    <span className="sd-premium-plan-option-label">Monthly</span>
                    <span className="sd-premium-plan-option-price">{PREMIUM_DISPLAY_PRICE_INR.monthly}</span>
                    <span className="sd-premium-plan-option-unit">per month</span>
                  </button>
                  <button
                    type="button"
                    className={
                      `sd-premium-plan-option${premiumCheckoutPlan === 'yearly' ? ' sd-premium-plan-option--active' : ''}`
                    }
                    disabled={premiumBusy !== null}
                    aria-pressed={premiumCheckoutPlan === 'yearly'}
                    onClick={() => setPremiumCheckoutPlan('yearly')}
                  >
                    <span className="sd-premium-plan-option-label">Yearly</span>
                    <span className="sd-premium-plan-option-price">{PREMIUM_DISPLAY_PRICE_INR.yearly}</span>
                    <span className="sd-premium-plan-option-unit">per year</span>
                    <span className="sd-premium-plan-option-badge">Best value</span>
                  </button>
                </div>
                <button
                  type="button"
                  className="sd-premium-subscribe-btn"
                  disabled={premiumBusy !== null || !Capacitor.isNativePlatform()}
                  title={!Capacitor.isNativePlatform() ? 'Install the Play Store Android app to complete checkout' : undefined}
                  onClick={() => startPremiumCheckout(premiumCheckoutPlan)}
                >
                  {!Capacitor.isNativePlatform() ? (
                    <>
                      <span className="sd-premium-subscribe-btn-title">Subscribe</span>
                      <span className="sd-premium-subscribe-btn-detail">
                        Google Play billing — use the installed Android app
                      </span>
                    </>
                  ) : premiumBusy === premiumCheckoutPlan ? (
                    'Opening Google Play checkout…'
                  ) : (
                    <>
                      <span className="sd-premium-subscribe-btn-title">Subscribe</span>
                      <span className="sd-premium-subscribe-btn-detail">
                        {premiumCheckoutPlan === 'monthly' ? 'Monthly' : 'Yearly'}
                        {' · '}
                        {premiumCheckoutPlan === 'monthly'
                          ? PREMIUM_DISPLAY_PRICE_INR.monthly
                          : PREMIUM_DISPLAY_PRICE_INR.yearly}
                        {' · Google Play (UPI & more)'}
                      </span>
                    </>
                  )}
                </button>
              </div>
              {Capacitor.isNativePlatform() ? (
                <button
                  type="button"
                  className="sd-premium-restore"
                  disabled={premiumBusy !== null}
                  onClick={() => {
                    void (async () => {
                      try {
                        setPremiumShopErr(null);
                        setPremiumBusy('restore');
                        const ok = await restorePremiumPurchases();
                        if (ok) {
                          updateSettings({ premiumAdFree: true, premiumSource: 'play' });
                          setPremiumModalOpen(false);
                          onClose();
                        } else {
                          setPremiumShopErr('No active Premium subscription found for this Google account.');
                        }
                      } catch (e: unknown) {
                        setPremiumShopErr(
                          e instanceof Error ? e.message : 'Restore failed. Try again.',
                        );
                      } finally {
                        setPremiumBusy(null);
                      }
                    })();
                  }}
                >
                  {premiumBusy === 'restore' ? 'Restoring…' : 'Restore purchases'}
                </button>
              ) : null}
              {Capacitor.isNativePlatform() ? (
                <p className="sd-premium-legal-note">
                  Google Play shows the real price and payment methods at checkout (e.g. UPI, bank card, net banking). Match your Play Console base plans to the INR amounts above. Server-side verification is recommended before granting sensitive entitlements beyond ad removal.
                </p>
              ) : (
                <p className="sd-premium-legal-note">
                  In the Play Store build, Subscribe opens Google’s sheet where you choose UPI, card, bank account, or other methods available for your Google account.
                </p>
              )}
            </>
            {shouldReserveSpaceForBannerAd(settings.premiumAdFree) ? (
              <div className="ad-layout-bottom-spacer" aria-hidden />
            ) : null}
            <div className="sd-premium-actions">
              <button
                type="button"
                className="sd-premium-cancel sd-premium-cancel--full"
                onClick={() => setPremiumModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
