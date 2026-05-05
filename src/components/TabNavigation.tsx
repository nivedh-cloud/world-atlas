import React from "react";
import "./TabNavigation.css";

interface TabNavigationProps {
  activeTab: "countries" | "municipalities" | "gushim";
  onTabChange: (tab: "countries" | "municipalities" | "gushim") => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="tab-navigation">
      <button
        className={`tab-button ${activeTab === "countries" ? "active" : ""}`}
        onClick={() => onTabChange("countries")}
      >
        🌍 Countries
      </button>
      <button
        className={`tab-button ${activeTab === "municipalities" ? "active" : ""}`}
        onClick={() => onTabChange("municipalities")}
      >
        🏘️ Israel Municipalities
      </button>
      <button
        className={`tab-button ${activeTab === "gushim" ? "active" : ""}`}
        onClick={() => onTabChange("gushim")}
      >
        🗺️ Israel Regions
      </button>
    </div>
  );
};
