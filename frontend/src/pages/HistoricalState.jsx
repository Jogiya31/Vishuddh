import React, { useState, useEffect, useMemo } from "react";
import "jspdf-autotable";
import Header from "../components/Header";
import Download from "../components/download";
import Filter from "../components/Filter";
import Loader from "../components/loader";
import { stateArray } from "../assets/output.js";
import Legends from "../components/Legends.jsx";
import MultiSelectDropdown from "../components/tableFilters.jsx";
import {
  useFetchHistoricalStateReportQuery,
  useFetchDepartmentMappingQuery,
  useFetchSectorMappingQuery,
} from "../api/api.jsx";
import { toast } from "react-toastify";
import "./style.css";
import { InfoIcon } from "lucide-react";
import { useReportType } from "./ReportType.jsx";
import { getYesterdayDate } from "../config/config.js";

const getInitial = (key, def) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
  } catch {
    return def;
  }
};
const persistedDate = localStorage.getItem("selectedDate");

const StateSummaryReport = () => {
  const [totalCols, setTotalCols] = useState(15);
  const [rawDate, setRawDate] = useState(
    persistedDate ? persistedDate : getYesterdayDate()
  );
  const [displayMsg, setDisplayMsg] = useState("No Data Available");

  const {
    toggleValue,
    unit,
    setUnit,
    outputData,
    setOutputData,
    showDepartmentView,
    setShowDepartmentView,
    showScemeView,
    setShowSchemeView,
    showDeptAPI,
    setShowDeptAPI,
    showDeptExcel,
    setShowDeptExcel,
    selectedOptions,
  } = useReportType();

  // Filter state (like State.jsx)
  const [selectedSectors, setSelectedSectors] = useState(() =>
    getInitial("selectedSectors", [])
  );
  const [selectedDepartments, setSelectedDepartments] = useState(() =>
    getInitial("selectedDepartments", [])
  );
  const [selectedSchemes, setSelectedSchemes] = useState(() =>
    getInitial("selectedSchemes", [])
  );
  const [selectedKPIs, setSelectedKPIs] = useState(() =>
    getInitial("selectedKPIs", [])
  );
  const [selectedStates, setSelectedStates] = useState(() => {
    const item = localStorage.getItem("selectedStates");
    if (item && item.length > 0) {
      return JSON.parse(item);
    }
    return stateArray; // all states selected by default
  });
  const [filteredStates, setFilteredStates] = useState(stateArray);

  const [stateName, setStateName] = useState("Assam");
  const [ascending, setAscending] = useState(false);
  const [dataAscending, setDataAscending] = useState(true);

  const [departments, setDepartments] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [outputdata, setoutputdata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mappingData, setMappingdata] = useState();
  const [departmentMapping, setDepartmentMapping] = useState([]);
  const [schemeSectorMapping, setSchemeSectorMapping] = useState([]);
  const [schemeDepartmentMapping, setSchemeDepartmentMapping] = useState({});
  const parseDate = (rawDate) => {
    // Converts DD-MM-YYYY to YYYY-MM-DD
    const parts = rawDate.split("-");
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(rawDate); // fallback
  };
  const {
    data: stateReportData,
    error: stateReportError,
    isFetching: isStateReportLoading,
  } = useFetchHistoricalStateReportQuery({
    unit: unit,
    date: useMemo(() => {
      const [year, month, day] = rawDate.split("-");
      return `${day}-${month}-${year}`;
    }, [rawDate]),
    toggle: toggleValue,
  });
  const {
    data: departmentMappingData,
    error: departmentError,
    isLoading: isDepartmentLoading,
  } = useFetchDepartmentMappingQuery();
  const {
    data: sectorMappingData,
    error: sectorError,
    isLoading: isSectorLoading,
  } = useFetchSectorMappingQuery();

  useEffect(() => {
    let i = 3;
    let showDept = false;
    let showScheme = false;
    let showAPI = false;
    let showExcel = false;

    if (selectedOptions && selectedOptions.length > 0) {
      selectedOptions.forEach((option) => {
        if (option.id === 1) {
          showDept = true;
          i += 3;
        }
        if (option.id === 2) {
          showScheme = true;
          i += 3;
        }
        if (option.id === 3) {
          showExcel = true;
          i += 3;
        }
        if (option.id === 4) {
          showAPI = true;
          i += 3;
        }
      });

      setShowDepartmentView(showDept);
      setShowSchemeView(showScheme);
      setShowDeptAPI(showAPI);
      setShowDeptExcel(showExcel);
      setTotalCols(i);
    } else {
      setShowDepartmentView(true);
      setShowSchemeView(true);
      setShowDeptAPI(true);
      setShowDeptExcel(true);
      setTotalCols(15);
    }
  }, [selectedOptions]);
  const onSelectingOptions = (options) => {
    let i = 3;
    let showDept = false,
      showScheme = false,
      showAPI = false,
      showExcel = false;
    if (options.length > 0) {
      options.forEach((option) => {
        if (option.id === 1) {
          showDept = true;
          i += 3;
        }
        if (option.id === 2) {
          showScheme = true;
          i += 3;
        }
        if (option.id === 3) {
          showExcel = true;
          i += 3;
        }
        if (option.id === 4) {
          showAPI = true;
          i += 3;
        }
      });
      setShowDepartmentView(showDept);
      setShowSchemeView(showScheme);
      setShowDeptAPI(showAPI);
      setShowDeptExcel(showExcel);
      setTotalCols(i);
    } else {
      setShowDepartmentView(true);
      setShowSchemeView(true);
      setShowDeptAPI(true);
      setShowDeptExcel(true);
      setTotalCols(15);
    }
  };

  useEffect(() => {
    setLoading(isStateReportLoading || isDepartmentLoading || isSectorLoading);
  }, [isStateReportLoading, isDepartmentLoading, isSectorLoading]);

  useEffect(() => {
    if (stateReportError) {
      toast.error(
        `Error fetching State Report: ${
          stateReportError.message || "Unknown error"
        }`,
        { position: "top-right" }
      );
    }
    if (departmentError) {
      toast.error(
        `Error fetching Department Mapping: ${
          departmentError.message || "Unknown error"
        }`,
        { position: "top-right" }
      );
    }
    if (sectorError) {
      toast.error(
        `Error fetching Sector Mapping: ${
          sectorError.message || "Unknown error"
        }`,
        { position: "top-right" }
      );
    }
    if (stateReportError || departmentError || sectorError) setError(true);
  }, [stateReportError, departmentError, sectorError]);

  useEffect(() => {
    if (stateReportData) {
      setoutputdata(stateReportData.stateReportData);
      setOutputData(stateReportData.stateReportData);
      setMappingdata(stateReportData.mappingData);
      setDepartmentMapping(stateReportData.kpiDetails);
    }
    if (departmentMappingData) {
      setSchemeDepartmentMapping(departmentMappingData);
      setDepartments(Array.from(new Set(Object.values(departmentMappingData))));
    }
    if (sectorMappingData) {
      setSchemeSectorMapping(sectorMappingData);
      setSectors(Array.from(new Set(Object.values(sectorMappingData))));
    }
  }, [stateReportData, departmentMappingData, sectorMappingData]);

  // Controlled state persistence: update localStorage ON CHANGE
  useEffect(() => {
    localStorage.setItem("selectedSectors", JSON.stringify(selectedSectors));
  }, [selectedSectors]);
  useEffect(() => {
    localStorage.setItem(
      "selectedDepartments",
      JSON.stringify(selectedDepartments)
    );
  }, [selectedDepartments]);
  useEffect(() => {
    localStorage.setItem("selectedSchemes", JSON.stringify(selectedSchemes));
  }, [selectedSchemes]);
  useEffect(() => {
    localStorage.setItem("selectedKPIs", JSON.stringify(selectedKPIs));
  }, [selectedKPIs]);
  useEffect(() => {
    localStorage.setItem("selectedStates", JSON.stringify(selectedStates));
  }, [selectedStates]);

  // Compute unique schemes/KPIs from mappingData
  const uniqueSchemes = useMemo(
    () => Object.keys(mappingData || {}).filter(Boolean),
    [mappingData]
  );
  const uniqueKPIs = useMemo(
    () =>
      Array.from(
        new Set(
          uniqueSchemes.flatMap((scheme) =>
            (mappingData?.[scheme] || []).map((kpi) => kpi["KPI Name"] || "")
          )
        )
      ),
    [mappingData, uniqueSchemes]
  );

  // Filtering logic (parent controls)
  useEffect(() => {
    if (
      selectedSectors.length === 0 ||
      selectedDepartments.length === 0 ||
      selectedSchemes.length === 0 ||
      selectedKPIs.length === 0 ||
      selectedStates.length === 0
    ) {
      setOutputData({});
      setDisplayMsg("No Data Available");
      setFilteredStates([]);
      return;
    }
    if (!outputdata || Object.keys(outputdata).length === 0) return;
    let filtered = { ...outputdata };
    // Filter by Schemes
    if (selectedSchemes.length > 0) {
      filtered = Object.keys(filtered)
        .filter((scheme) => selectedSchemes.includes(scheme))
        .reduce((obj, key) => ({ ...obj, [key]: filtered[key] }), {});
    }
    // Filter by KPIs
    if (selectedKPIs.length > 0) {
      Object.keys(filtered).forEach((scheme) => {
        filtered[scheme] = Object.keys(filtered[scheme])
          .filter((kpi) => selectedKPIs.includes(kpi))
          .reduce((obj, key) => ({ ...obj, [key]: filtered[scheme][key] }), {});
      });
    }
    // Filter by Sectors
    if (selectedSectors.length > 0) {
      filtered = Object.keys(filtered)
        .filter((scheme) =>
          selectedSectors.includes(schemeSectorMapping[scheme])
        )
        .reduce((obj, key) => ({ ...obj, [key]: filtered[key] }), {});
    }
    // Filter by Departments
    if (selectedDepartments.length > 0) {
      filtered = Object.keys(filtered)
        .filter((scheme) =>
          selectedDepartments.includes(schemeDepartmentMapping[scheme])
        )
        .reduce((obj, key) => ({ ...obj, [key]: filtered[key] }), {});
    }
    // Filter by States (for table display)
    if (selectedStates.length > 0) {
      setFilteredStates(selectedStates);
      if (filtered) {
        Object.keys(filtered).forEach((schemeKey) => {
          Object.keys(filtered[schemeKey]).forEach((kpiKey) => {
            const filteredObj = {};
            selectedStates.forEach((state) => {
              if (filtered[schemeKey][kpiKey][state.state_name]) {
                filteredObj[state.state_name] =
                  filtered[schemeKey][kpiKey][state.state_name];
              }
            });
            filtered[schemeKey][kpiKey] = filteredObj;
          });
        });
      }
    } else {
      setFilteredStates(stateArray);
    }
    setOutputData(filtered);
  }, [
    selectedSchemes,
    selectedKPIs,
    selectedSectors,
    selectedDepartments,
    selectedStates,
    outputdata,
    schemeSectorMapping,
    schemeDepartmentMapping,
  ]);

  // Sorting logic for states (table order)
  const sortStates = () => {
    const sorted = [...filteredStates].sort((a, b) =>
      ascending
        ? a.state_name.localeCompare(b.state_name)
        : b.state_name.localeCompare(a.state_name)
    );
    setFilteredStates(sorted);
    setAscending(!ascending);
  };

  // Sorting the data inside outputData (table data ordering)
  const sortData = (key, schemeKey, kpiKey) => {
    // Defensive: deep copy to avoid mutating state
    const sortedData = JSON.parse(JSON.stringify(outputData));
    const states = outputData[schemeKey][kpiKey];

    // Sort state entries
    const sortedStates = Object.entries(states)
      .sort(([stateA, dataA], [stateB, dataB]) => {
        // Extract/normalize values
        const getValue = (data) => {
          let val = data?.[key];
          if (val === undefined || val === null || val === "" || val === "NA")
            return null;
          // Try numeric
          const numVal = Number(String(val).replace(/,/g, ""));
          if (!isNaN(numVal)) return numVal;
          return val;
        };
        const valueA = getValue(dataA);
        const valueB = getValue(dataB);

        // "NA"/null always sorts last
        if (valueA === null && valueB !== null) return 1;
        if (valueA !== null && valueB === null) return -1;
        if (valueA === null && valueB === null) return 0;

        // Numeric sort if both numbers
        if (typeof valueA === "number" && typeof valueB === "number") {
          return dataAscending ? valueA - valueB : valueB - valueA;
        }
        // Fallback string sort
        if (dataAscending) {
          return String(valueA).localeCompare(String(valueB));
        } else {
          return String(valueB).localeCompare(String(valueA));
        }
      })
      .reduce((acc, [state, data]) => {
        acc[state] = data;
        return acc;
      }, {});

    sortedData[schemeKey][kpiKey] = sortedStates;

    // Update filteredStates order to match sorted states
    const sortedStateNames = Object.keys(sortedStates);
    const sortedFilterStates = stateArray
      .filter((s) => sortedStateNames.includes(s.state_name))
      .sort(
        (a, b) =>
          sortedStateNames.indexOf(a.state_name) -
          sortedStateNames.indexOf(b.state_name)
      );
    setFilteredStates(sortedFilterStates);
    setOutputData(sortedData); // Optional: update outputData if you want to re-sort for future sorts
    setDataAscending(!dataAscending);
  };

  // Unit Change Handler
  const onUpdateUnit = (unit) => {
    setUnit(unit);
    sessionStorage.setItem("unitType", JSON.stringify(unit));
  };

  // When user changes state filter (from Filter component)
  const onUpdateState = (states) => {
    setSelectedStates(states);
    setFilteredStates(states);
    setStateName(states[0]?.["state_name"]);
  };

  let globalIndex = 0;

  const handleSelectAllSectors = () => {
    if (selectedSectors.length === sectors.length) {
      setSelectedSectors([]);
      setSelectedDepartments([]);
      setSelectedSchemes([]);
      setSelectedKPIs([]);
      setFilteredStates([]);
      localStorage.setItem("selectedSectors", JSON.stringify([]));
      localStorage.setItem("selectedDepartments", JSON.stringify([]));
      localStorage.setItem("selectedSchemes", JSON.stringify([]));
      localStorage.setItem("selectedKPIs", JSON.stringify([]));
    } else {
      setSelectedSectors(sectors);
      setSelectedDepartments(departments);
      setSelectedSchemes(uniqueSchemes);
      setSelectedKPIs(uniqueKPIs);
      localStorage.setItem("selectedSectors", JSON.stringify(sectors));
      localStorage.setItem("selectedDepartments", JSON.stringify(departments));
      localStorage.setItem("selectedSchemes", JSON.stringify(uniqueSchemes));
      localStorage.setItem("selectedKPIs", JSON.stringify(uniqueKPIs));
    }
  };

  const handleSelectAllDepartments = () => {
    if (selectedDepartments.length === departments.length) {
      setSelectedDepartments([]);
      setSelectedSectors([]);
      setSelectedSchemes([]);
      setSelectedKPIs([]);
      localStorage.setItem("selectedDepartments", JSON.stringify([]));
      localStorage.setItem("selectedSectors", JSON.stringify([]));
      localStorage.setItem("selectedSchemes", JSON.stringify([]));
      localStorage.setItem("selectedKPIs", JSON.stringify([]));
    } else {
      setSelectedDepartments(departments);
      setSelectedSectors(sectors);
      setSelectedSchemes(uniqueSchemes);
      setSelectedKPIs(uniqueKPIs);
      localStorage.setItem("selectedDepartments", JSON.stringify(departments));
      localStorage.setItem("selectedSectors", JSON.stringify(sectors));
      localStorage.setItem("selectedSchemes", JSON.stringify(uniqueSchemes));
      localStorage.setItem("selectedKPIs", JSON.stringify(uniqueKPIs));
    }
  };

  const handleSelectAllSchemes = () => {
    if (selectedSchemes.length === uniqueSchemes.length) {
      setSelectedSchemes([]);
      setSelectedSectors([]);
      setSelectedDepartments([]);
      setSelectedKPIs([]);
      localStorage.setItem("selectedSchemes", JSON.stringify([]));
      localStorage.setItem("selectedSectors", JSON.stringify([]));
      localStorage.setItem("selectedDepartments", JSON.stringify([]));
      localStorage.setItem("selectedKPIs", JSON.stringify([]));
    } else {
      setSelectedSchemes(uniqueSchemes);
      setSelectedSectors(sectors);
      setSelectedDepartments(departments);
      setSelectedKPIs(uniqueKPIs);
      localStorage.setItem("selectedSchemes", JSON.stringify(uniqueSchemes));
      localStorage.setItem("selectedSectors", JSON.stringify(sectors));
      localStorage.setItem("selectedDepartments", JSON.stringify(departments));
      localStorage.setItem("selectedKPIs", JSON.stringify(uniqueKPIs));
    }
  };

  const handleSelectAllKPIs = () => {
    if (selectedKPIs.length === uniqueKPIs.length) {
      setSelectedKPIs([]);
      setSelectedSectors([]);
      setSelectedDepartments([]);
      setSelectedSchemes([]);
      localStorage.setItem("selectedKPIs", JSON.stringify([]));
      localStorage.setItem("selectedSectors", JSON.stringify([]));
      localStorage.setItem("selectedDepartments", JSON.stringify([]));
      localStorage.setItem("selectedSchemes", JSON.stringify([]));
    } else {
      setSelectedKPIs(uniqueKPIs);
      setSelectedSectors(sectors);
      setSelectedDepartments(departments);
      setSelectedSchemes(uniqueSchemes);
      localStorage.setItem("selectedKPIs", JSON.stringify(uniqueKPIs));
      localStorage.setItem("selectedSectors", JSON.stringify(sectors));
      localStorage.setItem("selectedDepartments", JSON.stringify(departments));
      localStorage.setItem("selectedSchemes", JSON.stringify(uniqueSchemes));
    }
  };

  const handleSelectAllStates = () => {
    if (selectedStates.length === stateArray.length) {
      setSelectedStates([]);
      localStorage.setItem("selectedStates", JSON.stringify([]));
    } else {
      setSelectedStates(stateArray);
      localStorage.setItem("selectedStates", JSON.stringify(stateArray));
      onUpdateState(stateArray);
    }
  };

  // Toggle for filters
  const toggleSector = (sector) => {
    let updatedSectors;
    if (selectedSectors.includes(sector)) {
      updatedSectors = selectedSectors.filter((s) => s !== sector);
    } else {
      updatedSectors = [...selectedSectors, sector];
    }
    setSelectedSectors(updatedSectors);
    localStorage.setItem("selectedSectors", JSON.stringify(updatedSectors));

    const schemesToKeep = Object.keys(schemeSectorMapping).filter((scheme) =>
      updatedSectors.includes(schemeSectorMapping[scheme])
    );

    const updatedDepartment = Array.from(
      new Set(
        schemesToKeep
          .map((scheme) => schemeDepartmentMapping[scheme])
          .filter(Boolean)
      )
    );

    const updatedKPIs = Array.from(
      new Set(
        schemesToKeep.flatMap((scheme) =>
          (mappingData[scheme] || [])
            .map((kpi) => kpi["KPI Name"])
            .filter(Boolean)
        )
      )
    );

    setSelectedDepartments(updatedDepartment);
    localStorage.setItem("selectedDepartments", updatedDepartment);

    setSelectedSchemes(schemesToKeep);
    localStorage.setItem("selectedSchemes", JSON.stringify(schemesToKeep));

    setSelectedKPIs(updatedKPIs);
    localStorage.setItem("selectedKPIs", JSON.stringify(updatedKPIs));
  };

  const toggleDepartment = (department) => {
    let updatedDepartment;
    if (selectedDepartments.includes(department)) {
      updatedDepartment = selectedDepartments.filter((d) => d !== department);
    } else {
      updatedDepartment = [...selectedDepartments, department];
    }
    setSelectedDepartments(updatedDepartment);
    localStorage.setItem("selectedDepartments", updatedDepartment);

    const schemesToKeep = Object.keys(schemeDepartmentMapping).filter(
      (scheme) => updatedDepartment.includes(schemeDepartmentMapping[scheme])
    );

    setSelectedSchemes(schemesToKeep);
    localStorage.setItem("selectedSchemes", JSON.stringify(schemesToKeep));

    const updatedSectors = Array.from(
      new Set(
        schemesToKeep
          .map((scheme) => schemeSectorMapping[scheme])
          .filter(Boolean)
      )
    );
    setSelectedSectors(updatedSectors);
    localStorage.setItem("selectedSectors", JSON.stringify(updatedSectors));

    const updatedKPIs = Array.from(
      new Set(
        schemesToKeep.flatMap((scheme) =>
          (mappingData[scheme] || [])
            .map((kpi) => kpi["KPI Name"])
            .filter(Boolean)
        )
      )
    );

    setSelectedKPIs(updatedKPIs);
    localStorage.setItem("selectedKPIs", JSON.stringify(updatedKPIs));
  };

  const toggleScheme = (scheme) => {
    let updatedSchemes;
    if (selectedSchemes.includes(scheme)) {
      updatedSchemes = selectedSchemes.filter((d) => d !== scheme);
    } else {
      updatedSchemes = [...selectedSchemes, scheme];
    }
    setSelectedSchemes(updatedSchemes);
    localStorage.setItem("selectedSchemes", updatedSchemes);

    const updatedKPIs = Array.from(
      new Set(
        updatedSchemes.flatMap((scheme) =>
          (mappingData[scheme] || [])
            .map((kpi) => kpi["KPI Name"])
            .filter(Boolean)
        )
      )
    );

    setSelectedKPIs(updatedKPIs);
    localStorage.setItem("selectedKPIs", JSON.stringify(updatedKPIs));

    const updatedSectors = Array.from(
      new Set(
        updatedSchemes
          .map((scheme) => schemeSectorMapping[scheme])
          .filter(Boolean)
      )
    );
    setSelectedSectors(updatedSectors);
    localStorage.setItem("selectedSectors", JSON.stringify(updatedSectors));

    const updatedDepartment = Array.from(
      new Set(
        updatedSchemes
          .map((scheme) => schemeDepartmentMapping[scheme])
          .filter(Boolean)
      )
    );

    setSelectedDepartments(updatedDepartment);
    localStorage.setItem("selectedDepartments", updatedDepartment);
  };

  const toggleKPI = (kpi) => {
    let updatedKPIs;
    if (selectedKPIs.includes(kpi)) {
      updatedKPIs = selectedKPIs.filter((d) => d !== kpi);
    } else {
      updatedKPIs = [...selectedKPIs, kpi];
    }
    setSelectedKPIs(updatedKPIs);
    localStorage.setItem("selectedKPIs", updatedKPIs);

    const schemesToKeep = Object.keys(mappingData).filter((scheme) =>
      (mappingData[scheme] || []).some((kpiObj) =>
        updatedKPIs.includes(kpiObj["KPI Name"])
      )
    );
    setSelectedSchemes(schemesToKeep);
    localStorage.setItem("selectedSchemes", JSON.stringify(schemesToKeep));

    const updatedDepartment = Array.from(
      new Set(
        schemesToKeep
          .map((scheme) => schemeDepartmentMapping[scheme])
          .filter(Boolean)
      )
    );

    setSelectedDepartments(updatedDepartment);
    localStorage.setItem("selectedDepartments", updatedDepartment);

    const updatedSectors = Array.from(
      new Set(
        schemesToKeep
          .map((scheme) => schemeSectorMapping[scheme])
          .filter(Boolean)
      )
    );
    setSelectedSectors(updatedSectors);
    localStorage.setItem("selectedSectors", JSON.stringify(updatedSectors));
  };

  const toggleState = (stateObj) => {
    let updatedStates;
    if (selectedStates.some((s) => s.state_id === stateObj.state_id)) {
      updatedStates = selectedStates.filter(
        (s) => s.state_id !== stateObj.state_id
      );
    } else {
      updatedStates = [...selectedStates, stateObj];
    }
    setSelectedStates(updatedStates);
    localStorage.setItem("selectedStates", JSON.stringify(updatedStates));
    onUpdateState(updatedStates);
  };

  // Preserving state filter from localStorage on data load (like State.jsx)
  useEffect(() => {
    const storedStates =
      JSON.parse(localStorage.getItem("selectedStates")) || [];
    if (storedStates.length > 0 && stateReportData?.stateReportData) {
      setFilteredStates(storedStates);
      setStateName(storedStates[0]?.["state_name"]);
      setOutputData((prevData) => {
        const newData = JSON.parse(
          JSON.stringify(stateReportData.stateReportData)
        );
        Object.keys(newData).forEach((schemeKey) => {
          Object.keys(newData[schemeKey]).forEach((kpiKey) => {
            const filtered = {};
            storedStates.forEach((state) => {
              if (newData[schemeKey][kpiKey][state.state_name]) {
                filtered[state.state_name] =
                  newData[schemeKey][kpiKey][state.state_name];
              }
            });
            newData[schemeKey][kpiKey] = filtered;
          });
        });
        return newData;
      });
    }
  }, [stateReportData]);

  return (
    <>
      <div id="state" className="font-small w-full ">
        {/* Report Options Row */}
        <div className="flex flex-wrap w-full items-center mx-0  py-0 w-full rounded-xl">
          <div className="flex justfy-start  w-full  py-1">
            {!loading && !error ? (
              <Filter
                departments={departments}
                departmentMapping={departmentMapping}
                sectors={sectors}
                outputdata={outputdata}
                schemeDepartmentMapping={schemeDepartmentMapping}
                schemeSectorMapping={schemeSectorMapping}
                mappingData={mappingData}
                selectedSectors={selectedSectors}
                setSelectedSectors={setSelectedSectors}
                selectedDepartments={selectedDepartments}
                setSelectedDepartments={setSelectedDepartments}
                selectedSchemes={selectedSchemes}
                setSelectedSchemes={setSelectedSchemes}
                selectedKPIs={selectedKPIs}
                setSelectedKPIs={setSelectedKPIs}
                selectedStates={selectedStates}
                setSelectedStates={setSelectedStates}
                handleSelectAllSectors={handleSelectAllSectors}
                handleSelectAllDepartments={handleSelectAllDepartments}
                handleSelectAllSchemes={handleSelectAllSchemes}
                handleSelectAllKPIs={handleSelectAllKPIs}
                handleSelectAllStates={handleSelectAllStates}
                toggleSector={toggleSector}
                toggleDepartment={toggleDepartment}
                toggleScheme={toggleScheme}
                toggleKPI={toggleKPI}
                toggleState={toggleState}
                onUpdatedOutputData={setOutputData}
                states={stateArray}
                onUpdateState={onUpdateState}
                state={true}
                district={false}
                onUpdateUnit={onUpdateUnit}
                historical={true}
                onDateChange={setRawDate}
                historicalDate={rawDate}
                setDisplayMsg={setDisplayMsg}
                displayMsg={displayMsg}
              />
            ) : (
              ""
            )}
          </div>
        </div>

        {/* Table */}
        <div className="inline-flex  items-center my-2  w-[98%] ">
          <div className="flex justify-start w-[30%]">
            <MultiSelectDropdown
              onUpdateUnit={onUpdateUnit}
              onSelectingOptions={onSelectingOptions}
              Description={"Latest Prayas"}
              selectedUnit={unit}
            />
          </div>
          <div className="flex justify-center w-[40%]">
            <h2 className="font-bold text-lg text-center flex-1 text-gray-600">
              Historical State Report
            </h2>
          </div>
          <div className="flex justify-end w-[30%]">
            <Legends />
          </div>{" "}
        </div>
        <div
          className="relative mt-0 bg-white border-gray-400  w-full overflow-auto  min-h-[220px]
  max-h-[55vh]"
        >
          {loading ? (
            <Loader />
          ) : outputData && Object.keys(outputData).length > 0 ? (
            <table
              id="stateTable"
              className="relative w-full text-[14px] border border-gray-400 "
            >
              <thead className="bg-[#e3eefb]  text-black border-1 border-gray-400">
                {/* First row with merged header */}
                <tr>
                  <th colSpan="2"></th>

                  {Object.keys(outputData).map((schemeKey) =>
                    Object.keys(outputData[schemeKey]).map((kpiKey) => {
                      const currentIndex = globalIndex;
                      globalIndex++; // increment global index

                      return (
                        <th
                          key={`${schemeKey}-${kpiKey}-${currentIndex}`} // Adding a unique key
                          colSpan={totalCols}
                          className={`border border-gray-400 px-2 py-1 text-gray-600 ${
                            currentIndex % 2 === 0
                              ? "bg-[#E3D8F1]"
                              : "bg-[#DABECA]"
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            {schemeKey} | {kpiKey}{" "}
                            <span className="border  text-[9px] border-gray-400 px-2 bg-[#FF9800] text-white">
                              {mappingData[schemeKey]?.[0]?.["Frequency"]
                                .charAt(0)
                                .toUpperCase() +
                                mappingData[schemeKey]?.[0]?.[
                                  "Frequency"
                                ].slice(1)}
                            </span>
                            {schemeKey == "MGNREGA" && (
                              <div className="flex items-center justify-center pl-4">
                                <InfoIcon
                                  sx={{ color: "#2196f3", fontSize: 16 }}
                                />
                                <span className="pl-1">
                                  Value Round Off Due to Value Present in Units
                                </span>
                              </div>
                            )}
                          </div>
                        </th>
                      );
                    })
                  )}
                </tr>

                {/* Second row with Native Dash, Scheme Dash, Deptts. Value (via Excel), Deptts. Value (via API) */}
                <tr>
                  <th
                    rowSpan="4"
                    colSpan="1"
                    className="border  border-gray-400 px-4 py-1 text-gray-600"
                  >
                    State{" "}
                    <button
                      className="p-1 border rounded-md hover:bg-white"
                      onClick={() => sortStates()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3 h-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                        />
                      </svg>
                    </button>
                    <br />
                  </th>
                  <th
                    rowSpan="4"
                    colSpan="1"
                    className="border  border-gray-400 px-4 py-1 text-gray-600"
                  >
                    State Code
                    <br />
                  </th>

                  {Object.keys(outputData).map((schemeKey) =>
                    Object.keys(outputData[schemeKey]).map((kpiKey) => (
                      <>
                        <th
                          rowSpan="4"
                          colSpan="1"
                          className="border  border-gray-400 px-4 py-2 text-gray-600"
                        >
                          Sector Name
                          <br />
                        </th>
                        <th
                          rowSpan="4"
                          colSpan="1"
                          className="border  border-gray-400 px-4 py-2 text-gray-600"
                        >
                          Department Name
                          <br />
                        </th>
                        <th
                          rowSpan="4"
                          colSpan="1"
                          className=" border  border-gray-400 px-4 py-1 text-gray-600 "
                          title="Value from PRAYAS Critical Report"
                        >
                          <div className="flex flex-row items-center justify-center">
                            Prayas Value{" "}
                            <button
                              className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                              onClick={() =>
                                sortData("prayasValue", schemeKey, kpiKey)
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-3 h-3"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                />
                              </svg>
                            </button>
                          </div>
                          <div className=" text-gray-600 text-[9px]">
                            <div className=" text-gray-600 text-[9px]">(A)</div>
                            {(() => {
                              const frequency =
                                mappingData[schemeKey]?.[0]?.["Frequency"] ||
                                "";
                              const formattedFreq =
                                frequency.charAt(0).toUpperCase() +
                                frequency.slice(1);
                              const rawDate =
                                outputData[schemeKey]?.[kpiKey]?.[stateName]?.[
                                  "prayas_date_of_data"
                                ];

                              if (!rawDate) return "";

                              const date = new Date(parseDate(rawDate));
                              if (isNaN(date.getTime())) return "";
                              return formattedFreq === "Daily"
                                ? rawDate
                                : rawDate;
                            })()}
                          </div>
                        </th>
                        {showDepartmentView ? (
                          <th
                            colSpan="3"
                            className="border  border-gray-400 px-4 py-1 text-gray-600"
                            title="Value from Native Dashboard"
                          >
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline hover:text-blue-800 cursor-pointer"
                              href={mappingData[schemeKey]?.[0]?.["State_URL"]}
                              title={mappingData[schemeKey]?.[0]?.["State_URL"]}
                            >
                              Department Dashboard
                            </a>
                            (via Web Scraping)
                            <div className="text-gray-600 text-[9px]">
                              {(() => {
                                const frequency =
                                  mappingData[schemeKey]?.[0]?.["Frequency"] ||
                                  "";
                                const formattedFreq =
                                  frequency.charAt(0).toUpperCase() +
                                  frequency.slice(1);
                                const rawDate =
                                  outputData[schemeKey]?.[kpiKey]?.[
                                    stateName
                                  ]?.["date_of_data"];

                                if (!rawDate) return "";

                                const date = new Date(parseDate(rawDate));
                                if (isNaN(date.getTime())) return "";
                                return formattedFreq === "Daily"
                                  ? rawDate
                                  : // : `${date.toLocaleString("default", {
                                    //     month: "long",
                                    //   })},${date.getFullYear()}(${rawDate})`;
                                    rawDate;
                              })()}
                            </div>
                          </th>
                        ) : (
                          ""
                        )}
                        {showScemeView ? (
                          <th
                            colSpan="3"
                            className="border  border-gray-400 px-4 py-1 text-gray-600"
                            title="Value from PRAYAS Scheme View"
                          >
                            Prayas Scheme Dashboard Views
                            <div className=" text-gray-600 text-[9px]">
                              <div className="text-gray-600 text-[9px]">
                                {(() => {
                                  const frequency =
                                    mappingData[schemeKey]?.[0]?.[
                                      "Frequency"
                                    ] || "";
                                  const formattedFreq =
                                    frequency.charAt(0).toUpperCase() +
                                    frequency.slice(1);
                                  const rawDate =
                                    outputData[schemeKey]?.[kpiKey]?.[
                                      stateName
                                    ]?.["scheme_date_of_data"];

                                  if (!rawDate) return "";

                                  const date = new Date(parseDate(rawDate));
                                  if (isNaN(date.getTime())) return "";
                                  return formattedFreq === "Daily"
                                    ? rawDate
                                    : rawDate;
                                })()}
                              </div>
                            </div>
                          </th>
                        ) : (
                          ""
                        )}
                        {showDeptExcel ? (
                          <th
                            colSpan="3"
                            className="border  border-gray-400 px-4 py-1 text-gray-600"
                          >
                            Department Value
                            <div>(via Excel)</div>
                            <div className=" text-gray-600 text-[9px]">
                              {outputData[schemeKey][kpiKey][stateName]?.[
                                "deptExcelDate"
                              ] || ""}
                            </div>
                          </th>
                        ) : (
                          ""
                        )}
                        {showDeptAPI ? (
                          <th
                            colSpan="3"
                            className="border  border-gray-400 px-4 py-1 text-gray-600"
                          >
                            Department Value
                            <div> (via API)</div>
                            <div className=" text-gray-600 text-[9px]">
                              {outputData[schemeKey][kpiKey][stateName]?.[
                                "date_of_data"
                              ] || ""}
                            </div>
                          </th>
                        ) : (
                          ""
                        )}
                      </>
                    ))
                  )}
                </tr>

                {/* Third row with Value, Diff, Diff% */}
                <tr>
                  {Object.keys(outputData).map((schemeKey) =>
                    Object.keys(outputData[schemeKey]).map((kpiKey, index) => (
                      <>
                        {showDepartmentView ? (
                          <>
                            <th
                              key={`value-${schemeKey}-${kpiKey}-${index}`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                              title="Value from Native Dashboard"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Value{" "}
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData(
                                      "nativeDashValue",
                                      schemeKey,
                                      kpiKey
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className=" text-gray-600 text-[9px]">
                                (B)
                              </div>
                            </th>
                            <th
                              key={`diff-${schemeKey}-${kpiKey}-${index}`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                              title="Difference between Native Dashboard Value and PRAYAS Value"
                            >
                              {" "}
                              <div className="flex flex-row items-center justify-center">
                                Difference
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData(
                                      "nativeDashDiff",
                                      schemeKey,
                                      kpiKey
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className=" text-gray-600 text-[9px]">
                                (B-A)
                              </div>
                            </th>
                            <th
                              key={`diffPercent-${schemeKey}-${kpiKey}-${index}`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Difference%{" "}
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData(
                                      "nativeDashDiffPercent",
                                      schemeKey,
                                      kpiKey
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="text-gray-600 text-[9px] whitespace-nowrap">
                                ((B-A)/A)*100%
                              </div>
                            </th>
                          </>
                        ) : (
                          ""
                        )}
                        {showScemeView ? (
                          <>
                            <th
                              key={`value-${schemeKey}-${kpiKey}-${index}-2`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                              title="Value from PRAYAS Scheme View"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Value{" "}
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData(
                                      "schemeDashValue",
                                      schemeKey,
                                      kpiKey
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className=" text-gray-600 text-[9px]">
                                (C)
                              </div>
                            </th>
                            <th
                              key={`diff-${schemeKey}-${kpiKey}-${index}-2`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                              title="Difference between Value from PRAYAS Scheme View and PRAYAS Value"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Difference
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData(
                                      "schemeDashDiff",
                                      schemeKey,
                                      kpiKey
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className=" text-gray-600 text-[9px]">
                                (C-A)
                              </div>
                            </th>
                            <th
                              key={`diffPercent-${schemeKey}-${kpiKey}-${index}-2`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Difference%{" "}
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData(
                                      "schemeDashDiffPercent",
                                      schemeKey,
                                      kpiKey
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="text-gray-600 text-[9px] whitespace-nowrap">
                                ((C-A)/A)*100%
                              </div>
                            </th>
                          </>
                        ) : (
                          ""
                        )}
                        {showDeptExcel ? (
                          <>
                            <th
                              key={`value-${schemeKey}-${kpiKey}-${index}-3`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Value{" "}
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData(
                                      "schemeDashValue",
                                      schemeKey,
                                      kpiKey
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className=" text-gray-600 text-[9px]">
                                (D)
                              </div>
                            </th>
                            <th
                              key={`diff-${schemeKey}-${kpiKey}-${index}-3`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Difference
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData("deptExcelDiff", schemeKey, kpiKey)
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>{" "}
                              <div className=" text-gray-600 text-[9px]">
                                (D-A)
                              </div>
                            </th>
                            <th
                              key={`diffPercent-${schemeKey}-${kpiKey}-${index}-3`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Difference%{" "}
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData(
                                      "deptExcelDiffPercent",
                                      schemeKey,
                                      kpiKey
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="text-gray-600 text-[9px] whitespace-nowrap">
                                ((D-A)/A)*100%
                              </div>
                            </th>
                          </>
                        ) : (
                          ""
                        )}
                        {showDeptAPI ? (
                          <>
                            <th
                              key={`value-${schemeKey}-${kpiKey}-${index}-4`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Value{" "}
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData("deptApiValue", schemeKey, kpiKey)
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className=" text-gray-600 text-[9px]">
                                (E)
                              </div>
                            </th>
                            <th
                              key={`diff-${schemeKey}-${kpiKey}-${index}-4`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Difference
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData("deptApiDiff", schemeKey, kpiKey)
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>{" "}
                              <div className=" text-gray-600 text-[9px]">
                                ( E-A)
                              </div>
                            </th>
                            <th
                              key={`diffPercent-${schemeKey}-${kpiKey}-${index}-4`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              <div className="flex flex-row items-center justify-center">
                                Difference%{" "}
                                <button
                                  className="flex items-center  p-1 w-5 h-5 border rounded-md hover:bg-white"
                                  onClick={() =>
                                    sortData(
                                      "deptApiDiffPercent",
                                      schemeKey,
                                      kpiKey
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 9l6-6 6 6M18 15l-6 6-6-6"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="text-gray-600 text-[9px] whitespace-nowrap">
                                ((E-A)/A)*100%
                              </div>
                            </th>
                          </>
                        ) : (
                          ""
                        )}
                      </>
                    ))
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredStates.map((state, stateIndex) => {
                  return (
                    <tr
                      key={`${stateIndex}`}
                      className="text-center text-[12px]"
                    >
                      {/* State name column */}
                      <td className="boxStyle">{state["state_name"]}</td>
                      {/* State index column */}
                      <td className="boxStyle">{state["state_id"]}</td>

                      {/* Loop through each scheme */}
                      {Object.keys(outputData).map((schemeKey) => {
                        const schemeData = outputData[schemeKey];

                        // Check if there are rows in the scheme
                        return Object.keys(schemeData).length > 0
                          ? Object.keys(schemeData).map((keyRow, index) => {
                              // Access data for the specific state
                              const row = schemeData[keyRow][
                                state["state_name"]
                              ]
                                ? schemeData[keyRow][state["state_name"]]
                                : {};

                              return (
                                <React.Fragment key={index}>
                                  <td className="boxStyle">
                                    {schemeSectorMapping[schemeKey]}
                                  </td>
                                  <td className="boxStyle">
                                    {schemeDepartmentMapping[schemeKey]}
                                  </td>
                                  <td className="boxStyle">
                                    {row?.prayasValue ? row?.prayasValue : "NA"}
                                  </td>
                                  {showDepartmentView ? (
                                    <>
                                      <td className="boxStyle">
                                        {row?.nativeDashValue
                                          ? row?.nativeDashValue
                                          : "NA"}
                                      </td>
                                      <td
                                        className={`boxStyle ${
                                          row?.nativeDashDiff &&
                                          row?.nativeDashDiff != "NA"
                                            ? row?.nativeDashDiff == 0
                                              ? "bg-[#78f3d1]"
                                              : row?.nativeDashDiffPercent <
                                                  3 &&
                                                row?.nativeDashDiffPercent > 0
                                              ? "bg-[#f2e092]"
                                              : row?.nativeDashDiffPercent < 0
                                              ? "bg-[#f37a78]"
                                              : "bg-[#FFC107]"
                                            : ""
                                        }`}
                                      >
                                        {row?.nativeDashDiff ||
                                        row?.nativeDashDiff == 0
                                          ? row?.nativeDashDiff
                                          : "NA"}
                                      </td>
                                      <td
                                        className={`boxStyle ${
                                          row?.nativeDashDiff &&
                                          row?.nativeDashDiff != "NA"
                                            ? row?.nativeDashDiff == 0
                                              ? "bg-[#78f3d1]"
                                              : row?.nativeDashDiffPercent <
                                                  3 &&
                                                row?.nativeDashDiffPercent > 0
                                              ? "bg-[#f2e092]"
                                              : row?.nativeDashDiffPercent < 0
                                              ? "bg-[#f37a78]"
                                              : "bg-[#FFC107]"
                                            : ""
                                        }`}
                                      >
                                        {(row?.nativeDashDiffPercent &&
                                          row?.nativeDashDiffPercent != "NA") ||
                                        row?.nativeDashDiffPercent === 0
                                          ? `${row?.nativeDashDiffPercent}%`
                                          : "NA"}
                                      </td>
                                    </>
                                  ) : (
                                    ""
                                  )}
                                  {showScemeView ? (
                                    <>
                                      <td className="boxStyle">
                                        {row?.schemeDashValue
                                          ? row?.schemeDashValue
                                          : "NA"}
                                      </td>
                                      <td
                                        className={`boxStyle ${
                                          row?.schemeDashDiff &&
                                          row?.schemeDashDiff != "NA"
                                            ? row?.schemeDashDiff == 0
                                              ? "bg-[#78f3d1]"
                                              : row?.schemeDashDiffPercent <
                                                  3 &&
                                                row?.schemeDashDiffPercent > 0
                                              ? "bg-[#f2e092]"
                                              : row?.schemeDashDiffPercent < 0
                                              ? "bg-[#f37a78]"
                                              : "bg-[#FFC107]"
                                            : ""
                                        }`}
                                      >
                                        {row?.schemeDashDiff ||
                                        row?.schemeDashDiff == 0
                                          ? row?.schemeDashDiff
                                          : "NA"}
                                      </td>
                                      <td
                                        className={`boxStyle ${
                                          row?.schemeDashDiff &&
                                          row?.schemeDashDiff != "NA"
                                            ? row?.schemeDashDiff == 0
                                              ? "bg-[#78f3d1]"
                                              : row?.schemeDashDiffPercent <
                                                  3 &&
                                                row?.schemeDashDiffPercent > 0
                                              ? "bg-[#f2e092]"
                                              : row?.schemeDashDiffPercent < 0
                                              ? "bg-[#f37a78]"
                                              : "bg-[#FFC107]"
                                            : ""
                                        }`}
                                      >
                                        {(row?.schemeDashDiffPercent &&
                                          row?.schemeDashDiffPercent != "NA") ||
                                        row?.schemeDashDiffPercent === 0
                                          ? `${row?.schemeDashDiffPercent}%`
                                          : "NA"}
                                      </td>
                                    </>
                                  ) : (
                                    ""
                                  )}
                                  {showDeptExcel ? (
                                    <>
                                      <td className="boxStyle ">
                                        {row?.deptExcelValue
                                          ? row?.deptExcelValue
                                          : "NA"}
                                      </td>
                                      <td
                                        className={`boxStyle ${
                                          row?.deptExcelDiff &&
                                          row?.deptExcelDiff !== "NA"
                                            ? row?.deptExcelDiff === 0
                                              ? "bg-[#78f3d1]"
                                              : row?.deptExcelDiffPercent > 0 &&
                                                row?.deptExcelDiffPercent < 3
                                              ? "bg-[#f2e092]"
                                              : row?.deptExcelDiffPercent < 0
                                              ? "bg-[#f37a78]"
                                              : "bg-[#FFC107]"
                                            : ""
                                        }`}
                                      >
                                        {row?.deptExcelDiff ||
                                        row?.deptExcelDiff == 0
                                          ? row?.deptExcelDiff
                                          : "NA"}
                                      </td>
                                      <td
                                        className={`boxStyle ${
                                          row?.deptExcelDiff &&
                                          row?.deptExcelDiff !== "NA"
                                            ? row?.deptExcelDiff === 0
                                              ? "bg-[#78f3d1]"
                                              : row?.deptExcelDiffPercent > 0 &&
                                                row?.deptExcelDiffPercent < 3
                                              ? "bg-[#f2e092]"
                                              : row?.deptExcelDiffPercent < 0
                                              ? "bg-[#f37a78]"
                                              : "bg-[#FFC107]"
                                            : ""
                                        }`}
                                      >
                                        {row?.deptExcelDiff ||
                                        row?.deptExcelDiff === 0
                                          ? row?.deptExcelDiffPercent == "NA"
                                            ? row?.deptExcelDiffPercent
                                            : `${row?.deptExcelDiffPercent}%`
                                          : "NA"}
                                      </td>
                                    </>
                                  ) : (
                                    ""
                                  )}
                                  {showDeptAPI ? (
                                    <>
                                      <td className="border border-black px-4 py-2">
                                        {row?.deptApiValue
                                          ? row?.deptApiValue
                                          : "NA"}
                                      </td>
                                      <td
                                        className={`boxStyle ${
                                          row?.deptApiDiff &&
                                          row?.deptApiDiff !== "NA"
                                            ? row?.deptApiDiff === 0
                                              ? "bg-[#78f3d1]"
                                              : row?.deptApiDiff > 0 &&
                                                row?.deptApiDiff < 3
                                              ? "bg-[#f2e092]"
                                              : row?.deptApiDiff < 0
                                              ? "bg-[#f37a78]"
                                              : "bg-[#FFC107]"
                                            : ""
                                        }`}
                                      >
                                        {row?.deptApiDiff ||
                                        row?.deptApiDiff == 0
                                          ? row?.deptApiDiff
                                          : "NA"}
                                      </td>
                                      <td
                                        className={`boxStyle ${
                                          row?.deptApiDiff &&
                                          row?.deptApiDiff !== "NA"
                                            ? row?.deptApiDiff === 0
                                              ? "bg-[#78f3d1]"
                                              : row?.deptApiDiff > 0 &&
                                                row?.deptApiDiff < 3
                                              ? "bg-[#f2e092]"
                                              : row?.deptApiDiff < 0
                                              ? "bg-[#f37a78]"
                                              : "bg-[#FFC107]"
                                            : ""
                                        }`}
                                      >
                                        {row?.deptApiDiff ||
                                        row?.deptApiDiff === 0
                                          ? row?.deptApiDiffPercent
                                          : "NA"}
                                      </td>
                                    </>
                                  ) : (
                                    ""
                                  )}
                                </React.Fragment>
                              );
                            })
                          : null; // Return null if there are no rows in scheme
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div>{displayMsg}</div>
          )}
        </div>
      </div>
      <Download
        tableData={outputData}
        mappingData={mappingData}
        schemeDepartmentMapping={schemeDepartmentMapping}
        schemeSectorMapping={schemeSectorMapping}
        states={filteredStates}
        state={true}
        district={false}
        stateName={stateName}
        showDepartmentView={showDepartmentView}
        showScemeView={showScemeView}
        showDeptExcel={showDeptExcel}
        showDeptAPI={showDeptAPI}
        reportName={"Historical State Summary Report"}
      />
    </>
  );
};

export default StateSummaryReport;
