import React from "react";
import { formatGushimName, ISRAEL_GUSHIM } from "../utils/israelGushimLoader";
import "./GushimSelector.css";

interface GushimSelectorProps {
  selectedGushim: string | null;
  onGushimChange: (gushim: string) => void;
}

export const GushimSelector: React.FC<GushimSelectorProps> = ({
  selectedGushim,
  onGushimChange,
}) => {
  return (
    <div className="gushim-selector">
      <label htmlFor="gushim-dropdown">Select a Region (Gushim):</label>
      <select
        id="gushim-dropdown"
        value={selectedGushim || ""}
        onChange={(e) => onGushimChange(e.target.value)}
        className="dropdown"
      >
        <option value="">-- Choose a region --</option>
        {ISRAEL_GUSHIM.map((gushim) => (
          <option key={gushim} value={gushim}>
            {formatGushimName(gushim)}
          </option>
        ))}
      </select>
    </div>
  );
};
