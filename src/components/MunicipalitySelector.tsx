import React from "react";
import { formatMunicipalityName, ISRAEL_MUNICIPALITIES } from "../utils/israelMunicipalitiesLoader";
import "./MunicipalitySelector.css";

interface MunicipalitySelectorProps {
  selectedMunitipality: string | null;
  onMunicipalityChange: (municipality: string) => void;
}

export const MunicipalitySelector: React.FC<MunicipalitySelectorProps> = ({
  selectedMunitipality,
  onMunicipalityChange,
}) => {
  return (
    <div className="municipality-selector">
      <label htmlFor="municipality-dropdown">Select a Municipality:</label>
      <select
        id="municipality-dropdown"
        value={selectedMunitipality || ""}
        onChange={(e) => onMunicipalityChange(e.target.value)}
        className="dropdown"
      >
        <option value="">-- Choose a municipality --</option>
        {ISRAEL_MUNICIPALITIES.map((municipality) => (
          <option key={municipality} value={municipality}>
            {formatMunicipalityName(municipality)}
          </option>
        ))}
      </select>
    </div>
  );
};
