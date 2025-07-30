import React, { useState } from "react";
import { LightbulbIcon } from "lucide-react";

const Insights = ({ insights }) => {
  const noInsights =
    !insights || insights === "No Insights" || insights.length === 0;

  if (noInsights) {
    return (
      <div className="bg-[#70a7d838]">
        <h3 className="text-left text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
          Key Insights
        </h3>
        <div className="px-4 py-7">
          <p className="text-[#6b7580] text-base">No key findings to display</p>
        </div>
      </div>
    );
  }

  const lines = Array.isArray(insights) ? insights : [insights];
  const [showAll, setShowAll] = useState(false);
  const visibleInsights = showAll ? lines : lines.slice(0, 3);

  const cleanInsight = (text) =>
    text.replace(/[\*•"\{\}\[\]]/g, "");

  return (
    <div className="bg-[#70a7d838]">
      <h3 className="text-left text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
        Key Insights
      </h3>

      <div className="px-4 pb-3">
        {visibleInsights.map((insight, idx) => (
          <label
            key={idx}
            className="flex gap-x-2 py-2 flex-row items-start"
          >
            <LightbulbIcon className="w-5 h-5 text-blue-500 mt-[2px] flex-shrink-0" />
            <p className="text-[#131416] text-left font-normal leading-relaxed whitespace-pre-wrap">
              {cleanInsight(insight).trim()}.
            </p>
          </label>
        ))}
      </div>

      {lines.length > 3 && (
        <div className="flex px-4 py-3 justify-start">
          <button
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-white text-[#131416] text-sm font-bold leading-normal tracking-[0.015em]"
            onClick={() => setShowAll(!showAll)}
          >
            <span className="truncate">
              {showAll ? "View Less" : "View More"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Insights;
