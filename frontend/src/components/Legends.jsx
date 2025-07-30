import React from "react";
import Tooltip from "./Tooltip";
const Legends = () => {
  return (
    <div className="flex items-center gap-2 px-1 ">
      {/* Mismatch */}
      <div className="flex flex-col items-center gap-1 relative group">
        <Tooltip
          text="Mismatch if prayas value surpasses data."
          position="top"
        >
          <div className="rounded-full w-2 h-2 bg-[#f37a78]"></div>
        </Tooltip>
        <span className="text-[8px] text-gray-600">Prayas Mismatch</span>
      </div>
      <div className="flex flex-col items-center gap-1 relative group">
        <Tooltip text="Mismatch if difference > 3%" position="top">
          <div className="rounded-full w-2 h-2 bg-[#FFC107]"></div>
        </Tooltip>
        <span className="text-[8px] text-gray-600">Department Mismatch</span>
      </div>
      {/* Slight Mismatch */}
      <div className="flex flex-col items-center gap-1 relative group">
        <Tooltip text="Slight Mismatch if difference < 3% " position="top">
          <div className="rounded-full w-2 h-2 bg-[#f2e092]"></div>
        </Tooltip>
        <span className="text-[8px] text-gray-600">Slight Mismatch</span>
      </div>
      {/* Match */}
      <div className="flex flex-col items-center gap-1 relative group">
        <Tooltip text=" Match when percentage difference = 0%." position="top">
          <div className="rounded-full w-2 h-2 bg-[#78f3d1]"></div>
        </Tooltip>
        <span className="text-[8px] text-gray-600">Match</span>
      </div>
    </div>
  );
};
export default Legends;
