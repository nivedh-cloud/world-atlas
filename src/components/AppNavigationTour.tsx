import { useMemo } from "react";
import { Joyride } from "react-joyride";
import type { Step, ButtonType } from "react-joyride";
import { EVENTS, STATUS } from "react-joyride";
import {
  MAP_TOOLBAR_TOUR_STORAGE_KEY,
  MENU_DRAWER_TOUR_STORAGE_KEY,
} from "./appNavigationTourStorage";
import "./AppNavigationTour.css";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const tourButtons: ButtonType[] = ["back", "close", "skip", "primary"];

const sharedOptions = {
  zIndex: 21000,
  overlayClickAction: false as const,
  primaryColor: "#0064ff",
  textColor: "#1a1a2e",
  backgroundColor: "#ffffff",
  arrowColor: "#ffffff",
  spotlightPadding: 8,
  showProgress: true,
  buttons: tourButtons,
  skipBeacon: true,
};

const sharedLocale = {
  back: "Back",
  close: "Close",
  last: "Done",
  next: "Next",
  nextWithProgress: "Next ({current} of {total})",
  skip: "Skip",
};

/** First launch — top bar only: menu, picker, settings, country info */
function buildMapToolbarSteps(): Step[] {
  return [
    {
      target: '[data-tour="tour-nav-menu"]',
      placement: "bottom",
      title: "Navigation menu",
      content:
        "Open this menu anytime for countries, continents, oceans, rankings, compare, and more. We’ll show those soon after you tap here for the first time.",
    },
    {
      target: '[data-tour="tour-selector"]',
      placement: "bottom",
      title: "Country selector",
      content:
        "Search and pick what’s on the map. The globe loads its boundary and flies to fit. Countries, continents, and oceans come from this list once you switch mode in the menu.",
    },
    {
      target: '[data-tour="tour-settings"]',
      placement: "bottom",
      title: "Settings",
      content: "Appearance, map style tiles, facts about data sources — and replay these tips whenever you want.",
    },
    {
      target: '[data-tour="tour-details"]',
      placement: "left",
      title: "Country info",
      content:
        "Opens the details drawer — facts, flag, and data for the selected country. Select a country first, then tap here.",
    },
  ];
}

type MenuDrawerTourActions = {
  expandStatsSubmenu: () => void;
  closeMenu: () => void;
};

/** First time the drawer opens — Explore, Statistics (+ rankings), Compare */
function buildMenuDrawerSteps(a: MenuDrawerTourActions): Step[] {
  return [
    {
      target: '[data-tour="tour-explore"]',
      placement: "right",
      title: "Explore",
      content:
        "Switch between Countries, Continents, and Oceans. The header picker and map geographies change to match.",
    },
    {
      target: '[data-tour="tour-stats"]',
      placement: "right",
      title: "Statistics",
      content:
        "Tap Statistics to reveal ranking themes (population, area, GDP, health, defence, and more). Each opens the full leaderboard screen.",
    },
    {
      target: '[data-tour="tour-stats-sub"]',
      placement: "right",
      title: "Ranking picks",
      content: "Choose a metric to open its world ranking. Tap a row to zoom the map to that place and open its profile.",
      before: async () => {
        a.expandStatsSubmenu();
        await wait(340);
      },
    },
    {
      target: '[data-tour="tour-compare"]',
      placement: "right",
      title: "Compare",
      content:
        "Open the compare screen — pick two countries side by side; then jump from there back to the map and details.",
    },
  ];
}

function onTourFinishedPersist(
  data: { type: string; status: string },
  storageKey: string,
): boolean {
  const finishedTour =
    data.type === EVENTS.TOUR_END ||
    (data.type === EVENTS.TOUR_STATUS &&
      (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED));
  if (!finishedTour) return false;
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    /* ignore */
  }
  return true;
}

type MapToolbarTourProps = {
  run: boolean;
  onRunChange: (run: boolean) => void;
};

export function MapToolbarTour({ run, onRunChange }: MapToolbarTourProps) {
  const steps = useMemo(() => buildMapToolbarSteps(), []);

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      scrollToFirstStep={false}
      options={sharedOptions}
      locale={{ ...sharedLocale, skip: "Skip" }}
      onEvent={(data) => {
        if (onTourFinishedPersist(data, MAP_TOOLBAR_TOUR_STORAGE_KEY)) {
          onRunChange(false);
        }
      }}
    />
  );
}

type MenuDrawerTourProps = {
  run: boolean;
  onRunChange: (run: boolean) => void;
  actions: MenuDrawerTourActions;
};

export function MenuDrawerTour({ run, onRunChange, actions }: MenuDrawerTourProps) {
  const steps = useMemo(() => buildMenuDrawerSteps(actions), [actions]);

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      scrollToFirstStep={false}
      options={sharedOptions}
      locale={{ ...sharedLocale, skip: "Skip" }}
      onEvent={(data) => {
        if (onTourFinishedPersist(data, MENU_DRAWER_TOUR_STORAGE_KEY)) {
          actions.closeMenu();
          onRunChange(false);
        }
      }}
    />
  );
}
