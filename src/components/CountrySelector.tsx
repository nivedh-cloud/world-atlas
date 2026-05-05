import React, { useState, useRef, useEffect } from "react";
import { formatCountryName, COUNTRIES, getCountryCodeFromName } from "../utils/geojsonLoader";
import "./CountrySelector.css";

interface CountrySelectorProps {
  selectedCountry: string | null;
  onCountryChange: (country: string) => void;
  items?: string[];
  label?: string;
  /** Use a fixed full-viewport panel so the list isn’t clipped inside overflow:hidden parents (e.g. full-screen stats). */
  fixedPanel?: boolean;
}

// Get the local flag SVG path for a country name
const getLocalFlagPath = (countryName: string): string => {
  const code = getCountryCodeFromName(countryName);
  return `/flags/${code}.svg`;
};

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onCountryChange,
  items = COUNTRIES,
  label = 'Countries',
  fixedPanel = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = items.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (country: string) => {
    onCountryChange(country);
    setSearch("");
    setIsOpen(false);
    // Clear search input field
    if (searchRef.current) {
      searchRef.current.value = "";
    }
  };

  const displayName = selectedCountry ? formatCountryName(selectedCountry) : null;
  const isCountries = label === 'Country' || label === 'Countries';
  const searchPlaceholder = `Search ${label?.toLowerCase() || 'item'}...`;

  return (
    <div className="cs-wrapper" ref={wrapperRef} data-tour="tour-selector">
      {/* Trigger Button */}
      <button
        className={`cs-trigger ${isOpen ? "cs-open" : ""} ${selectedCountry ? "cs-has-value" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedCountry && isCountries ? (
          <img
            className="cs-trigger-flag"
            src={getLocalFlagPath(selectedCountry)}
            alt={selectedCountry}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="cs-globe">🌍</span>
        )}
        <span className="cs-label">{displayName ?? `Select a ${label}`}</span>
        <svg
          className={`cs-caret ${isOpen ? "cs-caret-up" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`cs-panel ${fixedPanel ? "cs-panel-fixed" : ""}`} role="listbox">
          {/* Search */}
          <div className="cs-search-row">
            <svg className="cs-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              className="cs-search-input"
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button className="cs-clear-btn" onClick={() => setSearch("")}>✕</button>
            ) : (
              <button className="cs-close-btn" onClick={() => { setIsOpen(false); setSearch(""); }}>✕</button>
            )}
          </div>

          {/* List */}
          <div className="cs-list">
            {filtered.length === 0 ? (
              <div className="cs-empty">No countries found</div>
            ) : (
              filtered.map((country) => (
                  <button
                    key={country}
                    className={`cs-item ${selectedCountry === country ? "cs-item-active" : ""}`}
                    role="option"
                    aria-selected={selectedCountry === country}
                    onClick={() => handleSelect(country)}
                  >
                    {isCountries ? (
                      <>
                        <img
                          className="cs-flag"
                          src={getLocalFlagPath(country)}
                          alt={country}
                          onError={(e) => { 
                            (e.currentTarget as HTMLImageElement).style.display = 'none'; 
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block'; 
                          }}
                        />
                        <span className="cs-flag-placeholder" style={{ display: 'none' }}>🌐</span>
                      </>
                    ) : (
                      <span className="cs-flag-placeholder">🌐</span>
                    )}
                    <span className="cs-item-name">{formatCountryName(country)}</span>
                    {selectedCountry === country && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
