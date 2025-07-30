import React from "react";

// Reorder so view5 is first
const views = ["view5", "view6", "view7", "view4" , "view2", "view1", "view3" ];

const viewLabels = {
  view1: "Critical Data Missing",
  view2: "Department Data Missing",
  view3: "Scheme Data Missing",
  view4: "Days Gap Between Critical vs Department",
  view5: "Absolute Difference",
  view6: "Critical > Department",
  view7: "Department > Critical",
};

const ViewTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="pb-3">
      <div className="flex border-b border-[#dee0e3] px-4 gap-8">
        {views.map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setActiveTab(tabKey)}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${
              activeTab === tabKey
                ? "border-b-[#131416] text-[#131416]"
                : "border-b-transparent text-[#6b7580]"
            }`}
          >
            <p className="text-sm font-bold tracking-[0.015em] capitalize">
              {viewLabels[tabKey]}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ViewTabs;
