import React, { useState, useRef, useEffect } from "react";
import { COUNTRIES, formatCountryName, getCountryCodeFromName } from "../utils/geojsonLoader";
import "./UnifiedSelector.css";

export type SelectionType = "countries" | "continents" | "oceans";

interface UnifiedSelectorProps {
  selectedItem: string | null;
  onItemChange: (item: string, type: SelectionType) => void;
  currentType: SelectionType;
  onTypeChange: (type: SelectionType) => void;
}

const CONTINENTS = ['Asia', 'Europe', 'Africa', 'North America', 'South America', 'Australasia/Oceania', 'Antarctica'];
const OCEANS = ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Southern Ocean'];

export const UnifiedSelector: React.FC<UnifiedSelectorProps> = ({
  selectedItem,
  onItemChange,
  currentType,
  onTypeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Get items based on current type
  const getItems = (): string[] => {
    if (currentType === "countries") {
      return COUNTRIES;
    } else if (currentType === "continents") {
      return CONTINENTS;
    } else {
      return OCEANS;
    }
  };

  const items = getItems();

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const handleItemSelect = (item: string) => {
    onItemChange(item, currentType);
    setIsOpen(false);
    setSearch("");
  };

  const handleTypeChange = (type: SelectionType) => {
    onTypeChange(type);
    setSearch("");
  };

  // const getTypeLabel = (): string => {
  //   if (currentType === "countries") return "🌍 Countries";
  //   if (currentType === "continents") return "🗺️ Continents";
  //   return "🌊 Oceans";
  // };

  const getSelectedLabel = (): string => {
    if (!selectedItem) return `Select ${currentType}`;
    return formatCountryName(selectedItem);
  };

  return (
    <div className="unified-selector" ref={wrapperRef}>
      {/* Type Selector Menu */}
      <div className="type-selector-menu">
        <button
          className={`type-btn ${currentType === "countries" ? "active" : ""}`}
          onClick={() => handleTypeChange("countries")}
        >
          🌍 Countries
        </button>
        <button
          className={`type-btn ${currentType === "continents" ? "active" : ""}`}
          onClick={() => handleTypeChange("continents")}
        >
          🗺️ Continents
        </button>
        <button
          className={`type-btn ${currentType === "oceans" ? "active" : ""}`}
          onClick={() => handleTypeChange("oceans")}
        >
          🌊 Oceans
        </button>
      </div>

      {/* Item Selector Dropdown */}
      <div className="item-selector">
        <button
          className="selector-trigger"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{getSelectedLabel()}</span>
          <svg
            className={`dropdown-arrow ${isOpen ? "open" : ""}`}
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className="selector-dropdown">
            <input
              ref={searchRef}
              type="text"
              className="selector-search"
              placeholder={`Search ${currentType}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="selector-list">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <button
                    key={item}
                    className={`selector-item ${item === selectedItem ? "selected" : ""}`}
                    onClick={() => handleItemSelect(item)}
                  >
                    {currentType === "countries" && (
                      <img
                        src={`/flags/${getCountryCodeFromName(item)}.svg`}
                        alt={item}
                        className="selector-flag"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    {item === selectedItem && <span className="checkmark">✓</span>}
                    <span>{formatCountryName(item)}</span>
                  </button>
                ))
              ) : (
                <div className="no-results">No results found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
