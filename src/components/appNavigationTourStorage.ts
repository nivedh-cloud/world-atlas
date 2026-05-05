/** LocalStorage keys & helpers — split from React component file for lint (react-refresh). */

/** Older single-phase key — migrated to split keys on read */
export const LEGACY_NAVIGATION_TOUR_STORAGE_KEY = "world_atlas_nav_tour_v1_completed";
export const MAP_TOOLBAR_TOUR_STORAGE_KEY = "world_atlas_tour_map_toolbar_v1";
export const MENU_DRAWER_TOUR_STORAGE_KEY = "world_atlas_tour_menu_drawer_v1";

/** Call once early (e.g. app mount) so existing users aren’t prompted again */
export function migrateLegacyNavigationTourKeys(): void {
  try {
    if (localStorage.getItem(LEGACY_NAVIGATION_TOUR_STORAGE_KEY)) {
      localStorage.setItem(MAP_TOOLBAR_TOUR_STORAGE_KEY, "1");
      localStorage.setItem(MENU_DRAWER_TOUR_STORAGE_KEY, "1");
      localStorage.removeItem(LEGACY_NAVIGATION_TOUR_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function isMapToolbarTourCompleted(): boolean {
  migrateLegacyNavigationTourKeys();
  try {
    return Boolean(localStorage.getItem(MAP_TOOLBAR_TOUR_STORAGE_KEY));
  } catch {
    return true;
  }
}

export function isMenuDrawerTourCompleted(): boolean {
  migrateLegacyNavigationTourKeys();
  try {
    return Boolean(localStorage.getItem(MENU_DRAWER_TOUR_STORAGE_KEY));
  } catch {
    return true;
  }
}
