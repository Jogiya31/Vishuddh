import { useEffect, useMemo, useRef, useState } from "react";
import { formatToDDMMYYYY } from "../config/config";
import { Calendar } from "react-date-range";

// Helper functions for dedupe and cascade
const dedupe = (arr) => Array.from(new Set(arr));

const Filter = ({
  sectors = [],
  departments = [],
  mappingData = {},
  schemeSectorMapping = {},
  schemeDepartmentMapping = {},
  selectedSectors,
  setSelectedSectors,
  selectedDepartments,
  setSelectedDepartments,
  selectedSchemes,
  setSelectedSchemes,
  selectedKPIs,
  setSelectedKPIs,
  selectedStates,
  selectedDistricts,
  setSelectedStates,
  displayMsg,
  setDisplayMsg,
  state,
  district,
  states,
  districts,
  handleSelectAllSectors,
  handleSelectAllDepartments,
  handleSelectAllSchemes,
  handleSelectAllKPIs,
  handleSelectAllStates,
  handleSelectAllDistricts,
  toggleSector,
  toggleDepartment,
  toggleScheme,
  toggleKPI,
  toggleState,
  toggleDistrict,
  onDateChange,
  historicalDate,
  historical,
  kpis,
  schemes,
}) => {
  // Unique options
  const uniqueSectors = useMemo(() => dedupe(sectors), [sectors]);
  const uniqueDepartments = useMemo(() => dedupe(departments), [departments]);
  const uniqueSchemes = useMemo(() => {
    if (district && schemes) {
      return schemes;
    }
    return dedupe(Object.keys(mappingData).filter(Boolean));
  }, [mappingData]);
  const uniqueKPIs = useMemo(() => {
    if (district) {
      return kpis;
    }
    return dedupe(
      uniqueSchemes.flatMap((scheme) =>
        (mappingData[scheme] || []).map((kpi) => kpi["KPI Name"] || "")
      )
    );
  }, [district, kpis, mappingData, uniqueSchemes]);

  const uniqueStates = Array.from(new Set(states));
  const uniqueDistricts = Array.from(new Set(districts));

  // For search inside dropdowns
  const [sectorSearch, setSectorSearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [schemeSearch, setSchemeSearch] = useState("");
  const [kpiSearch, setKpiSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [date, setDate] = useState(historicalDate || "");
  // Dropdown open states
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
  const [kpiDropdownOpen, setKpiDropdownOpen] = useState(false);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Refs for dropdowns
  const sectorDropdownRef = useRef(null);
  const departmentDropdownRef = useRef(null);
  const schemeDropdownRef = useRef(null);
  const kpiDropdownRef = useRef(null);
  const stateDropdownRef = useRef(null);
  const districtDropdownRef = useRef(null);
  // const calendarRef = useRef(null);
  // Filtered options for search
  const filteredSectors = useMemo(
    () =>
      uniqueSectors.filter((sector) =>
        sector.toLowerCase().includes(sectorSearch.toLowerCase())
      ),
    [uniqueSectors, sectorSearch]
  );
  const filteredDepartments = useMemo(
    () =>
      uniqueDepartments.filter((department) =>
        department.toLowerCase().includes(departmentSearch.toLowerCase())
      ),
    [uniqueDepartments, departmentSearch]
  );
  const filteredSchemes = useMemo(
    () =>
      uniqueSchemes.filter((scheme) =>
        scheme.toLowerCase().includes(schemeSearch.toLowerCase())
      ),
    [uniqueSchemes, schemeSearch]
  );
  const filteredKPIs = useMemo(
    () =>
      uniqueKPIs.filter((kpi) =>
        kpi.toLowerCase().includes(kpiSearch.toLowerCase())
      ),
    [uniqueKPIs, kpiSearch]
  );

  const filteredStates = useMemo(
    () =>
      state
        ? uniqueStates.filter((item) =>
            item.state_name.toLowerCase().includes(stateSearch.toLowerCase())
          )
        : [],
    [uniqueStates, stateSearch, state]
  );

  const filteredDistricts = useMemo(
    () =>
      district
        ? uniqueDistricts.filter((district) =>
            district["district_name"]
              .toLowerCase()
              .includes(districtSearch.toLowerCase())
          )
        : [],
    [uniqueStates, stateSearch, state]
  );

  useEffect(() => {
    function handleClickOutside(event) {
      // Gather all the dropdown refs into an array, only including those that exist
      const dropdownRefs = [
        sectorDropdownRef,
        departmentDropdownRef,
        schemeDropdownRef,
        kpiDropdownRef,
        stateDropdownRef,
        districtDropdownRef,
      ].filter(Boolean); // filter out undefined/null

      // If ANY ref exists and the click is inside ANY dropdown, do nothing
      if (
        dropdownRefs.some(
          (ref) => ref.current && ref.current.contains(event.target)
        )
      ) {
        return;
      }

      // Otherwise, close all dropdowns
      setSectorDropdownOpen(false);
      setDepartmentDropdownOpen(false);
      setSchemeDropdownOpen(false);
      setKpiDropdownOpen(false);
      setStateDropdownOpen(false);
      setDistrictDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    sectorDropdownRef,
    departmentDropdownRef,
    schemeDropdownRef,
    kpiDropdownRef,
    stateDropdownRef,
    districtDropdownRef,
  ]);

  const handleChange = (newDate) => {
    const localDate = new Date(newDate);
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, "0"); // months are 0-indexed
    const dd = String(localDate.getDate()).padStart(2, "0");

    setDate(`${yyyy}-${mm}-${dd}`);
  };

  // Example for sector dropdown (other dropdowns similar, just update onChange handler):
  return (
    <div className="flex w-full bg-[#f8f9f9] mt-1 py-1 rounded-lg">
      <div className="w-full flex gap-2">
        {/* Sector Filter */}
        <div className="w-full p-2">
          <div className="relative" ref={sectorDropdownRef}>
            <button
              onClick={() => setSectorDropdownOpen((open) => !open)}
              className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
            >
              {selectedSectors.length > 0
                ? `${selectedSectors.length} sector${
                    selectedSectors.length > 1 ? "s" : ""
                  } selected`
                : "Select Sector"}
            </button>
            {sectorDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <input
                  type="text"
                  placeholder="Search sectors..."
                  value={sectorSearch}
                  onChange={(e) => setSectorSearch(e.target.value)}
                  className="w-full text-[12px] p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        uniqueSectors.length > 0 &&
                        uniqueSectors.every((sec) =>
                          selectedSectors.includes(sec)
                        )
                      }
                      onChange={handleSelectAllSectors}
                      className="w-3 h-3"
                    />
                    <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                      Select All
                    </span>
                  </label>
                  {filteredSectors.map((sector, index) => (
                    <label
                      key={`${sector}-${index}`}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSectors.includes(sector)}
                        onChange={() => toggleSector(sector)}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                        {sector}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Department Filter */}
        <div className="w-full p-2">
          <div className="relative" ref={departmentDropdownRef}>
            <button
              onClick={() => setDepartmentDropdownOpen((open) => !open)}
              className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
            >
              {selectedDepartments.length > 0
                ? `${selectedDepartments.length} department${
                    selectedDepartments.length > 1 ? "s" : ""
                  } selected`
                : "Select Department"}
            </button>
            {departmentDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                  className="w-full text-[12px] p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        uniqueDepartments.length > 0 &&
                        uniqueDepartments.every((dep) =>
                          selectedDepartments.includes(dep)
                        )
                      }
                      onChange={handleSelectAllDepartments}
                      className="w-3 h-3"
                    />
                    <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                      Select All
                    </span>
                  </label>
                  {filteredDepartments.map((department, index) => (
                    <label
                      key={`${department}-${index}`}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDepartments.includes(department)}
                        onChange={() => toggleDepartment(department)}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                        {department}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {state && (
          <div className="w-full p-2">
            <div className="relative" ref={stateDropdownRef}>
              <button
                onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
                className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
              >
                {selectedStates.length > 0
                  ? selectedStates.length +
                    (selectedStates.length > 1 ? " States" : " State") +
                    " selected"
                  : "Select State"}
              </button>

              {stateDropdownOpen && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-10">
                  <input
                    type="text"
                    placeholder="Search States..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="text-[12px] w-full p-2 border-b border-gray-300 focus:outline-none"
                  />
                  <div className="max-h-40 overflow-y-auto">
                    <label className="flex items-center space-x-2 p-1 hover:bg-gray-100 cursor-pointer text-[12px] font-semibold">
                      <input
                        type="checkbox"
                        checked={
                          filteredStates.length > 0 &&
                          filteredStates.every((st) =>
                            selectedStates.some(
                              (s) => s.state_id === st.state_id
                            )
                          )
                        }
                        onChange={handleSelectAllStates}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                        Select All
                      </span>
                    </label>
                    {filteredStates.map((state) => (
                      <label
                        key={state.state_id}
                        className="flex items-center space-x-2 p-1 hover:bg-gray-100 cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStates.some(
                            (s) => s.state_id === state.state_id
                          )}
                          onChange={() => toggleState(state)}
                          className="w-3 h-3"
                        />
                        <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                          {state["state_name"]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* District Filter */}
        {district && (
          <div className="w-full p-2">
            <div className="relative" ref={districtDropdownRef}>
              <button
                onClick={() => setDistrictDropdownOpen(!districtDropdownOpen)}
                className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
              >
                {selectedDistricts.length > 0
                  ? selectedDistricts.length +
                    (selectedDistricts.length > 1
                      ? " Districts"
                      : " District") +
                    " selected"
                  : "Select District"}
              </button>

              {districtDropdownOpen && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-10">
                  <input
                    type="text"
                    placeholder="Search Districts..."
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    className="text-[12px] w-full p-2 border-b border-gray-300 focus:outline-none"
                  />
                  <div className="max-h-40 overflow-y-auto">
                    <label className="flex items-center space-x-2 p-1 hover:bg-gray-100 cursor-pointer text-[12px] font-semibold">
                      <input
                        type="checkbox"
                        checked={
                          filteredDistricts.length > 0 &&
                          filteredDistricts.every((dt) =>
                            selectedDistricts.some(
                              (d) => d.district_id === dt.district_id
                            )
                          )
                        }
                        onChange={handleSelectAllDistricts}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                        Select All
                      </span>
                    </label>
                    {filteredDistricts.map((district) => (
                      <label
                        key={district.district_id}
                        className="flex items-center space-x-2 p-1 hover:bg-gray-100 cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDistricts.some(
                            (d) => d.district_id === district.district_id
                          )}
                          onChange={() => toggleDistrict(district)}
                          className="w-3 h-3"
                        />
                        <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                          {district.district_name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Scheme Filter */}
        <div className="w-full p-2">
          <div className="relative" ref={schemeDropdownRef}>
            <button
              onClick={() => setSchemeDropdownOpen((open) => !open)}
              className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
            >
              {selectedSchemes.length > 0
                ? `${selectedSchemes.length} scheme${
                    selectedSchemes.length > 1 ? "s" : ""
                  } selected`
                : "Select Scheme"}
            </button>
            {schemeDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <input
                  type="text"
                  placeholder="Search schemes..."
                  value={schemeSearch}
                  onChange={(e) => setSchemeSearch(e.target.value)}
                  className="w-full text-[12px] p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        uniqueSchemes.length > 0 &&
                        uniqueSchemes.every((scheme) =>
                          selectedSchemes.includes(scheme)
                        )
                      }
                      onChange={handleSelectAllSchemes}
                      className="w-3 h-3"
                    />
                    <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                      Select All
                    </span>
                  </label>
                  {filteredSchemes.map((scheme, index) => (
                    <label
                      key={`${scheme}-${index}`}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSchemes.includes(scheme)}
                        onChange={() => toggleScheme(scheme)}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                        {scheme}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* KPI Filter */}
        <div className="w-full p-2">
          <div className="relative" ref={kpiDropdownRef}>
            <button
              onClick={() => setKpiDropdownOpen((open) => !open)}
              className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
            >
              {selectedKPIs.length > 0
                ? `${selectedKPIs.length} KPI${
                    selectedKPIs.length > 1 ? "s" : ""
                  } selected`
                : "Select KPI"}
            </button>
            {kpiDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <input
                  type="text"
                  placeholder="Search KPIs..."
                  value={kpiSearch}
                  onChange={(e) => setKpiSearch(e.target.value)}
                  className="w-full text-[12px] p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        uniqueKPIs.length > 0 &&
                        uniqueKPIs.every((kpi) => selectedKPIs.includes(kpi))
                      }
                      onChange={handleSelectAllKPIs}
                      className="w-3 h-3"
                    />
                    <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                      Select All
                    </span>
                  </label>
                  {filteredKPIs.map((kpi, index) => (
                    <label
                      key={`${kpi}-${index}`}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedKPIs.includes(kpi)}
                        onChange={() => toggleKPI(kpi)}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                        {kpi}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {historical && (
          <div className="p-2 w-full flex items-center justify-start">
            <div className="relative inline-block  w-full">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className=" w-full flex items-center justify-center rounded-2xl bg-[#70a7d8] text-white shadow-md text-[12px] px-3 py-[0.5rem] text-center"
              >
                {formatToDDMMYYYY(date)}
              </button>

              {showCalendar && (
                <div className="absolute z-40 bg-white shadow-lg rounded right-0 ">
                  <Calendar
                    date={date}
                    onChange={(date) => handleChange(date)}
                    minDate={new Date(2020, 0, 1)} // Jan 1, 2020
                    maxDate={new Date()} // Jan 1, 2020
                  />
                  <div className="flex justify-end m-2 gap-1">
                    <button
                      onClick={() => {
                        setShowCalendar(false);
                        localStorage.setItem("selectedDate", date); // Persist on Apply
                        onDateChange(date); // Notify parent
                      }}
                      className="bg-blue-500 text-white px-1 text-[12px] py-1 rounded hover:bg-blue-700 "
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        setShowCalendar(false);
                      }}
                      className="bg-blue-500 text-white px-1 text-[12px] py-1 rounded hover:bg-blue-700 "
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Filter;
