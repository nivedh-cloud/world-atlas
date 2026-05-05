import React from "react";
import { ISRAEL_TRIBES, formatTribeName } from "../utils/israelTribesLoader";
import "./TribesSelector.css";

interface TribesSelectorProps {
  selectedTribe: string | null;
  onTribeChange: (tribe: string) => void;
}

export const TribesSelector: React.FC<TribesSelectorProps> = ({
  selectedTribe,
  onTribeChange,
}) => {
  return (
    <div className="tribes-selector">
      <label htmlFor="tribes-dropdown">Select a Tribe / Region:</label>
      <select
        id="tribes-dropdown"
        value={selectedTribe || ""}
        onChange={(e) => onTribeChange(e.target.value)}
        className="dropdown"
      >
        <option value="">-- Choose a tribe --</option>
        {ISRAEL_TRIBES.map((tribe) => (
          <option key={tribe} value={tribe}>
            {formatTribeName(tribe)}
          </option>
        ))}
      </select>
    </div>
  );
};
