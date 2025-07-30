import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "react-date-range";
import { formatToDDMMYYYY } from "../config/config";

const Filters = ({ schemes, selectedScheme, setScheme, kpis, selectedKpi, setKpi }) => {
  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
  const [kpiDropdownOpen, setKpiDropdownOpen] = useState(false);
  const [schemeSearch, setSchemeSearch] = useState("");
  const [kpiSearch, setKpiSearch] = useState("");

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const schemeDropdownRef = useRef(null);
  const kpiDropdownRef = useRef(null);

  const filteredSchemes = schemes.filter((scheme) =>
    scheme.toLowerCase().includes(schemeSearch.toLowerCase())
  );

  const filteredKpis = kpis.filter((kpi) =>
    String(kpi).toLowerCase().includes(kpiSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        schemeDropdownRef.current &&
        !schemeDropdownRef.current.contains(event.target)
      ) {
        setSchemeDropdownOpen(false);
      }
      if (
        kpiDropdownRef.current &&
        !kpiDropdownRef.current.contains(event.target)
      ) {
        setKpiDropdownOpen(false);
      }
      // Also close calendar if clicking outside calendar or button
      if (
        !event.target.closest(".calendar-container") &&
        !event.target.closest(".date-button")
      ) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  };

  return (
    <>
      <div className="flex flex-wrap px-4 py-3 gap-4 items-center justify-between">
        <div className="flex flex-wrap px-4 py-3 gap-4 items-center">
          {/* Scheme Dropdown */}
          <div className="relative" ref={schemeDropdownRef}>
            <div className="flex flex-col">
              <label htmlFor="" className="text-xs font-medium">Select Scheme</label>
              <button
                onClick={() => setSchemeDropdownOpen(!schemeDropdownOpen)}
                className="text-[12px] bg-[#70a7d8] px-4 py-2 text-white rounded-2xl w-60"
              >
                {selectedScheme || "Select Scheme"}
              </button>
            </div>

            {schemeDropdownOpen && (
              <div className="absolute mt-1 w-60 bg-white border border-gray-300 rounded-lg shadow-md z-50">
                <input
                  type="text"
                  placeholder="Search schemes..."
                  value={schemeSearch}
                  onChange={(e) => setSchemeSearch(e.target.value)}
                  className="w-full text-[12px] rounded-t-lg p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {filteredSchemes.map((scheme, index) => (
                    <label
                      key={`${scheme}-${index}`}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]"
                      onClick={() => {
                        setScheme(scheme);
                        setSchemeDropdownOpen(false);
                      }}
                    >
                      <span className="text-gray-700 truncate">{scheme}</span>
                    </label>
                  ))}
                  {filteredSchemes.length === 0 && (
                    <div className="p-2 text-gray-400 text-sm">No schemes found.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* KPI Dropdown */}
          <div className="relative" ref={kpiDropdownRef}>
            <div className="flex flex-col">
              <label htmlFor="" className="text-xs font-medium
">Select KPI</label>
              <button
                onClick={() => setKpiDropdownOpen(!kpiDropdownOpen)}
                className="text-[12px] bg-[#70a7d8] px-4 py-2 text-white rounded-2xl w-60"
                disabled={!selectedScheme}
              >
                {selectedKpi ? `${selectedKpi}` : "Select KPI"}
              </button>
            </div>

            {kpiDropdownOpen && selectedScheme && (
              <div className="absolute mt-1 w-60 bg-white border border-gray-300 rounded-lg shadow-md z-50">
                <input
                  type="text"
                  placeholder="Search KPIs..."
                  value={kpiSearch}
                  onChange={(e) => setKpiSearch(e.target.value)}
                  className="w-full text-[12px] rounded-t-lg p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {filteredKpis.map((kpi, index) => (
                    <label
                      key={`${kpi}-${index}`}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]"
                      onClick={() => {
                        setKpi(kpi);
                        setKpiDropdownOpen(false);
                      }}
                    >
                      <span className="text-gray-700 truncate">{kpi}</span>
                    </label>
                  ))}
                  {filteredKpis.length === 0 && (
                    <div className="p-2 text-gray-400 text-sm">No KPIs found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Date Filter */}
        <div className="relative calendar-container">
          <button
            // onClick={() => setShowCalendar(!showCalendar)}
            className="text-[12px] bg-white px-4 py-2 text-[#70a7d8] rounded-2xl border border-[#70a7d8]"
          >
            {formatToDDMMYYYY(selectedDate)}

          </button>

          {/* {showCalendar && (
            <div className="absolute z-50 mt-2 shadow-lg border border-gray-200 rounded-lg">
              <Calendar date={selectedDate} onChange={handleSelect} />
            </div>
          )} */}
        </div>
      </div>

      {(!selectedScheme || !selectedKpi) && (
        <div className="mx-4 my-3 border border-gray-400 rounded-md p-4 text-center text-gray-700 italic">
          Please select both Scheme and KPI to see results.
        </div>
      )}
    </>
  );
};

export default Filters;
