import React, { useState, useEffect, useMemo } from "react";
import MultiSelectDropdown from "../components/tableFilters.jsx";
import "jspdf-autotable";
import Header from "../components/Header";
import Loader from "../components/loader";
import Download from "../components/download";
import { toast } from "react-toastify";
import Legends from "../components/Legends.jsx";
import { useDispatch } from "react-redux";
import { api } from "../api/api";
import {
  useFetchNationalReportQuery,
  useFetchDepartmentMappingQuery,
  useFetchSectorMappingQuery,
} from "../api/api.jsx";
import "react-toastify/dist/ReactToastify.css";
import { InfoIcon } from "lucide-react";
import { useReportType } from "./ReportType.jsx";
import Filter from "../components/Filter.jsx";


const dedupe = (arr) => Array.from(new Set(arr));

const OverallSummaryReport = () => {
  const dispatch = useDispatch();

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
    setSelectedOptions,
    selectedOptions,
  } = useReportType();

  const [totalCols, setTotalCols] = useState(15);
  const [departments, setDepartments] = useState([]);
  const [schemeDepartmentMapping, setSchemeDepartmentMapping] = useState({});
  const [outputdata, setoutputdata] = useState({});
  const [mappingData, setMappingdata] = useState({});
  const [schemeSectorMapping, setSchemeSectorMapping] = useState({});
  const [departmentMapping, setDepartmentMapping] = useState([]);
  const [error, setError] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayMsg, setDisplayMsg] = useState("No Data Available");

  // Filter state
const getInitial = (key, def) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
  } catch {
    return def;
  }
};

const [selectedSectors, setSelectedSectors] = useState(() => getInitial("selectedSectors", []));
const [selectedDepartments, setSelectedDepartments] = useState(() => getInitial("selectedDepartments", []));
const [selectedSchemes, setSelectedSchemes] = useState(() => getInitial("selectedSchemes", []));
const [selectedKPIs, setSelectedKPIs] = useState(() => getInitial("selectedKPIs", []));

  // Queries
  const {
    data: nationalReportData,
    error: nationalReportError,
    isFetching: isNationalReportLoading,
  } = useFetchNationalReportQuery({ UnitType: unit, toggle: toggleValue });
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

  // ----- Initialize Data -----
  useEffect(() => {
    if (nationalReportError) {
      toast.error(
        `Error fetching National Report: ${
          nationalReportError?.message || "Unknown error"
        }`
      );
    }
    if (departmentError) {
      toast.error(
        `Error fetching Department Mapping: ${
          departmentError?.message || "Unknown error"
        }`
      );
    }
    if (sectorError) {
      toast.error(
        `Error fetching Sector Mapping: ${
          sectorError?.message || "Unknown error"
        }`
      );
    }
    if (nationalReportError || departmentError || sectorError) {
      setError(true);
      setLoading(false);
    }
  }, [nationalReportError, departmentError, sectorError]);

  useEffect(() => {
    if (nationalReportData) {
      setLoading(false);
      setOutputData(nationalReportData.nationalReportData || {});
      setoutputdata(nationalReportData.nationalReportData || {});
      setMappingdata(nationalReportData.mappingData || {});
      setDepartmentMapping(nationalReportData.kpiDetails || {});
    }
    if (departmentMappingData) {
      setSchemeDepartmentMapping(departmentMappingData || {});
      setDepartments(Array.from(new Set(Object.values(departmentMappingData))));
    }
    if (sectorMappingData) {
      setSchemeSectorMapping(sectorMappingData || {});
      setSectors(Array.from(new Set(Object.values(sectorMappingData))));
    }
  }, [nationalReportData, departmentMappingData, sectorMappingData]);

  useEffect(() => {
    setLoading(
      isNationalReportLoading || isDepartmentLoading || isSectorLoading
    );
  }, [isNationalReportLoading, isDepartmentLoading, isSectorLoading]);

  // ---- Filter Option Computed Lists ----
  const uniqueSchemes = useMemo(
    () => Object.keys(mappingData).filter(Boolean),
    [mappingData]
  );
  const uniqueKPIs = useMemo(
    () =>
      dedupe(
        uniqueSchemes.flatMap((scheme) =>
          (mappingData[scheme] || []).map((kpi) => kpi["KPI Name"] || "")
        )
      ),
    [mappingData, uniqueSchemes]
  );

  useEffect(() => {
  if (uniqueSchemes.length > 0 ) {
    // Filter selectedSchemes to those present in National
    const filteredSchemes = selectedSchemes.filter(sch => uniqueSchemes.includes(sch));
    if (filteredSchemes.length > 0) {
      setSelectedSchemes(filteredSchemes);
    } else {
      setSelectedSchemes(uniqueSchemes); // fallback: select all
    }
  }
}, [uniqueSchemes]);

useEffect(() => {
  if (uniqueKPIs.length > 0) {
    // Filter selectedKPIs to those present in National
    const filteredKPIs = selectedKPIs.filter(kpi => uniqueKPIs.includes(kpi));
    if (filteredKPIs.length > 0) {
      setSelectedKPIs(filteredKPIs);
    } else {
      setSelectedKPIs(uniqueKPIs); // fallback: select all
    }
  }
}, [uniqueKPIs]);

  // Default select all on data load for all filters
  useEffect(() => {
    if (sectors.length && selectedSectors.length === 0)
      setSelectedSectors(sectors);
    if (departments.length && selectedDepartments.length === 0)
      setSelectedDepartments(departments);
    if (uniqueSchemes.length && selectedSchemes.length === 0)
      setSelectedSchemes(uniqueSchemes);
    if (uniqueKPIs.length && selectedKPIs.length === 0)
      setSelectedKPIs(uniqueKPIs);
    // eslint-disable-next-line
  }, [sectors, departments, uniqueSchemes, uniqueKPIs]);

  // Cascade: sector/department -> scheme/kpi
  // useEffect(() => {
  //   if (selectedSectors.length === 0 || selectedDepartments.length === 0) {
  //     setSelectedSchemes([]);
  //     setSelectedKPIs([]);
  //     return;
  //   }
  //   // Filter schemes that match selected sector AND department
  //   const schemesFiltered = uniqueSchemes.filter(
  //     (scheme) =>
  //       (selectedSectors.length === 0 ||
  //         selectedSectors.includes(schemeSectorMapping[scheme])) &&
  //       (selectedDepartments.length === 0 ||
  //         selectedDepartments.includes(schemeDepartmentMapping[scheme]))
  //   );
  //   setSelectedSchemes((prev) =>
  //     prev.length === 0 || prev.some((s) => !schemesFiltered.includes(s))
  //       ? schemesFiltered
  //       : prev.filter((s) => schemesFiltered.includes(s))
  //   );

  //   // Filter KPIs for the filtered schemes
  //   const kpisFiltered = dedupe(
  //     schemesFiltered.flatMap((scheme) =>
  //       (mappingData[scheme] || [])
  //         .map((kpiObj) => kpiObj["KPI Name"])
  //         .filter(Boolean)
  //     )
  //   );
  //   setSelectedKPIs((prev) =>
  //     prev.length === 0 || prev.some((k) => !kpisFiltered.includes(k))
  //       ? kpisFiltered
  //       : prev.filter((k) => kpisFiltered.includes(k))
  //   );
  //   // eslint-disable-next-line
  // }, [
  //   selectedSectors,
  //   selectedDepartments,
  //   uniqueSchemes,
  //   mappingData,
  //   schemeSectorMapping,
  //   schemeDepartmentMapping,
  // ]);



  // Cascade: scheme -> kpi
// useEffect(() => {
//   const kpisFiltered = dedupe(
//     selectedSchemes.flatMap((scheme) =>
//       (mappingData[scheme] || [])
//         .map((kpiObj) => kpiObj["KPI Name"])
//         .filter(Boolean)
//     )
//   );
//   setSelectedKPIs((prev) => {
//     const filtered = prev.filter((k) => kpisFiltered.includes(k));
//     return filtered.length > 0 ? filtered : kpisFiltered;
//   });
//   // eslint-disable-next-line
// }, [selectedSchemes, mappingData]);

  // ---- Filter State Persistence (localStorage) ----
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

  // ---- Filter logic: Apply to outputData ----
  useEffect(() => {
    if (
      selectedSectors.length === 0 ||
      selectedDepartments.length === 0 ||
      selectedSchemes.length === 0 ||
      selectedKPIs.length === 0
    ) {
      setOutputData({});
      setDisplayMsg("No Data Available");
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

    setOutputData(filtered);
  }, [
    selectedSchemes,
    selectedKPIs,
    selectedSectors,
    selectedDepartments,
    outputdata,
    schemeSectorMapping,
    schemeDepartmentMapping,
  ]);

  // ---- Report Option Logic (View toggling) ----
  useEffect(() => {
    setError("");
  }, [toggleValue, unit]);
  useEffect(() => {
    if (selectedOptions.length > 0) {
      let i = 3;
      let showDept = false;
      let showScheme = false;
      let showAPI = false;
      let showExcel = false;

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
  useEffect(() => {
    localStorage.setItem("selectedOptions", JSON.stringify(selectedOptions));
  }, [selectedOptions]);

  const onSelectingOptions = (options) => {
    const uniqueOptions = options.filter(
      (option, index, self) =>
        index === self.findIndex((o) => o.id === option.id)
    );
    setSelectedOptions(uniqueOptions);

    let i = 3,
      showDept = false,
      showScheme = false,
      showAPI = false,
      showExcel = false;
    if (uniqueOptions.length > 0) {
      uniqueOptions.forEach((option) => {
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

  // ---- Units Dropdown handler ----
  const onUpdateUnit = (unit) => {
    setUnit(unit);
    sessionStorage.setItem("unitType", JSON.stringify(unit));
    localStorage.removeItem("nationalReport");
    localStorage.removeItem("filteredOutputData");
    dispatch(api.util.invalidateTags(["NationalReport"]));
  };

  // ---- Table rendering ----
  let globalIndex = 0;

  const handleSelectAllSectors = () => {
    if (selectedSectors.length === sectors.length) {
      setSelectedSectors([]);
      setSelectedDepartments([]);
      setSelectedSchemes([]);
      setSelectedKPIs([]);
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

  return (
    <>
      <div className="flex justify-end gap-2 mb-1">
        <Header />
      </div>
      <div className="py-2 mt-[42px] font-small">
        {/* Report Options Row */}
        <div className="flex flex-wrap w-full items-center mx-0 py-0 rounded-xl">
          <div className="flex justfy-start w-full py-1">
            {!loading && !error && (
              <Filter
                sectors={sectors}
                departments={departments}
                mappingData={mappingData}
                schemeSectorMapping={schemeSectorMapping}
                schemeDepartmentMapping={schemeDepartmentMapping}
                selectedSectors={selectedSectors}
                setSelectedSectors={setSelectedSectors}
                selectedDepartments={selectedDepartments}
                setSelectedDepartments={setSelectedDepartments}
                selectedSchemes={selectedSchemes}
                setSelectedSchemes={setSelectedSchemes}
                selectedKPIs={selectedKPIs}
                setSelectedKPIs={setSelectedKPIs}
                displayMsg={displayMsg}
                setDisplayMsg={setDisplayMsg}
                state={false}
                district={false}
                states={[]}
                districts={[]}
                handleSelectAllSectors={handleSelectAllSectors}
                handleSelectAllDepartments={handleSelectAllDepartments}
                handleSelectAllSchemes={handleSelectAllSchemes}
                handleSelectAllKPIs={handleSelectAllKPIs}
                toggleSector={toggleSector}
                toggleDepartment={toggleDepartment}
                toggleScheme={toggleScheme}
                toggleKPI={toggleKPI}
              />
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex items-center justify-between w-full px- my-2 ">
          <MultiSelectDropdown
            selectedUnit={unit}
            onUpdateUnit={onUpdateUnit}
            onSelectingOptions={onSelectingOptions}
            Description={"Prayas Match"}
          />
          <h2 className="font-bold text-lg text-center flex-1 text-gray-600">
            National Level Report
          </h2>
          <Legends />
        </div>
        <div className="relative mt-0 bg-white border-gray-400 overflow-scroll ">
          {loading ? (
            <Loader />
          ) : outputData && Object.keys(outputData).length > 0 ? (
            // ... your table rendering code here ...
            <table className="relative w-full text-[14px] border border-gray-400 ">
              <thead className="bg-[#e3eefb]  text-black border-1 border-gray-400">
                {/* First row with merged header */}
                <tr>
                  {Object.keys(outputData).map((schemeKey) =>
                    Object.keys(outputData[schemeKey]).map((kpiKey, index) => {
                      const currentIndex = globalIndex;
                      globalIndex++; // increment global index
                      return (
                        <th
                          key={`${schemeKey}-${kpiKey}-${index}`} // Adding a unique key
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
                          className="border  border-gray-400 px-4 py-2  text-gray-600"
                          title="Value from PRAYAS Critical Report"
                        >
                          PRAYAS Value
                          <div className=" text-gray-600 text-[9px]">(A)</div>
                          <div className=" text-gray-600 text-[9px]">
                            {
                              outputData[schemeKey][kpiKey]?.["India"][
                                "prayas_date_of_data"
                              ]
                            }
                          </div>
                        </th>
                        {showDepartmentView ? (
                          <th
                            colSpan="3"
                            className="border  border-gray-400 px-4 py-2 text-gray-600"
                            title="Value from Native Dashboard"
                          >
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline hover:text-blue-800 cursor-pointer"
                              href={
                                mappingData[schemeKey]?.[0]?.["National_URL"]
                              }
                              title={
                                mappingData[schemeKey]?.[0]?.["National_URL"]
                              }
                            >
                              Department Dashboard
                            </a>
                            <div>(via Web Scraping)</div>
                            <div className=" text-gray-600 text-[9px]">
                              {
                                outputData[schemeKey]?.[kpiKey]?.["India"]?.[
                                  "date_of_data"
                                ]
                              }
                            </div>
                          </th>
                        ) : (
                          ""
                        )}
                        {showScemeView ? (
                          <th
                            colSpan="3"
                            className="border  border-gray-400 px-4 py-2 text-gray-600"
                            title="Value from PRAYAS Scheme View"
                          >
                            PRAYAS Scheme Dashboard Views
                            <div className=" text-gray-600 text-[9px]">
                              {
                                outputData[schemeKey]?.[kpiKey]?.["India"]?.[
                                  "scheme_date_of_data"
                                ]
                              }
                            </div>
                          </th>
                        ) : (
                          ""
                        )}
                        {showDeptExcel ? (
                          <th
                            colSpan="3"
                            className="border  border-gray-400 px-4 py-2 text-gray-600"
                          >
                            Department Value
                            <div>(via Excel)</div>
                            <div className=" text-gray-600 text-[9px]">
                              {
                                outputData[schemeKey]?.[kpiKey]?.["India"][
                                  "deptExcelDate"
                                ]
                              }
                            </div>
                          </th>
                        ) : (
                          ""
                        )}
                        {showDeptAPI ? (
                          <th
                            colSpan="3"
                            className="border  border-gray-400 px-4 py-2 text-gray-600"
                          >
                            Department Value
                            <div>(via API)</div>
                            <div className=" text-gray-600 text-[9px]">
                              {
                                outputData[schemeKey]?.[kpiKey]?.["India"][
                                  "date_of_data"
                                ]
                              }
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
                              Value
                              <div className=" text-gray-600 text-[9px]">
                                (B)
                              </div>
                            </th>
                            <th
                              key={`diff-${schemeKey}-${kpiKey}-${index}`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                              title="Difference between Native Dashboard Value and PRAYAS Value"
                            >
                              Difference
                              <div className=" text-gray-600 text-[9px]">
                                (B-A)
                              </div>
                            </th>
                            <th
                              key={`diffPercent-${schemeKey}-${kpiKey}-${index}`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              Difference%{" "}
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
                              Value{" "}
                              <div className=" text-gray-600 text-[9px]">
                                (C)
                              </div>
                            </th>
                            <th
                              key={`diff-${schemeKey}-${kpiKey}-${index}-2`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                              title="Difference between Value from PRAYAS Scheme View and PRAYAS Value"
                            >
                              Difference{" "}
                              <div className=" text-gray-600 text-[9px]">
                                (C-A)
                              </div>
                            </th>
                            <th
                              key={`diffPercent-${schemeKey}-${kpiKey}-${index}-2`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              Difference%
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
                              Value
                              <div className=" text-gray-600 text-[9px]">
                                (D)
                              </div>
                            </th>
                            <th
                              key={`diff-${schemeKey}-${kpiKey}-${index}-3`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              Difference
                              <div className=" text-gray-600 text-[9px]">
                                (D-A)
                              </div>
                            </th>
                            <th
                              key={`diffPercent-${schemeKey}-${kpiKey}-${index}-3`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              Difference%
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
                              Value
                              <div className=" text-gray-600 text-[9px]">
                                (E)
                              </div>
                            </th>
                            <th
                              key={`diff-${schemeKey}-${kpiKey}-${index}-4`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              Difference
                              <div className=" text-gray-600 text-[9px]">
                                ( E-A)
                              </div>
                            </th>
                            <th
                              key={`diffPercent-${schemeKey}-${kpiKey}-${index}-4`}
                              className="border border-gray-400 px-4 py-1 text-gray-600"
                            >
                              Difference%
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
                <tr className="text-center text-[12px]">
                  {/* Loop through the schemes */}
                  {Object.keys(outputData).map((schemeKey) => {
                    return Object.keys(outputData[schemeKey]).length > 0
                      ? Object.keys(outputData[schemeKey]).map(
                          (keyRow, index) => {
                            const row = outputData[schemeKey][keyRow]["India"]; // Assuming the 'India' key exists
                            return (
                              <React.Fragment key={index}>
                                <td className="border border-gray-400 px-4 py-2">
                                  {schemeSectorMapping[schemeKey]}
                                </td>
                                <td className="border border-gray-400 px-4 py-2">
                                  {schemeDepartmentMapping[schemeKey]}
                                </td>
                                <td className="border border-gray-400 px-2 py-2">
                                  {row?.prayasValue ? row?.prayasValue : "NA"}
                                </td>
                                {showDepartmentView ? (
                                  <>
                                    <td className="border border-gray-400 px-2 py-2">
                                      {row?.nativeDashValue
                                        ? row?.nativeDashValue
                                        : "NA"}
                                    </td>
                                    <td
                                      className={`border border-gray-400 px-4 py-2 ${
                                        row?.nativeDashDiff &&
                                        row?.nativeDashDiff != "NA"
                                          ? row?.nativeDashDiff == 0
                                            ? "bg-[#78f3d1]"
                                            : row?.nativeDashDiffPercent < 3 &&
                                              row?.nativeDashDiffPercent > 0
                                            ? "bg-[#f2e092]"
                                            : row?.nativeDashDiffPercent < 0 ||
                                              row?.nativeDashDiff < 0
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
                                      className={`border border-gray-400 px-4 py-2 ${
                                        row?.nativeDashDiff &&
                                        row?.nativeDashDiff != "NA"
                                          ? row?.nativeDashDiff == 0
                                            ? "bg-[#78f3d1]"
                                            : row?.nativeDashDiffPercent < 3 &&
                                              row?.nativeDashDiffPercent > 0
                                            ? "bg-[#f2e092]"
                                            : row?.nativeDashDiffPercent < 0 ||
                                              row?.nativeDashDiff < 0
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
                                    <td className="border border-gray-400 px-2 py-2">
                                      {row?.schemeDashValue
                                        ? row?.schemeDashValue
                                        : "NA"}
                                    </td>
                                    <td
                                      className={`border border-gray-400 px-4 py-2 ${
                                        row?.schemeDashDiff &&
                                        row?.schemeDashDiff != "NA"
                                          ? row?.schemeDashDiff == 0
                                            ? "bg-[#78f3d1]"
                                            : row?.schemeDashDiffPercent < 3 &&
                                              row?.schemeDashDiffPercent > 0
                                            ? "bg-[#f2e092]"
                                            : row?.schemeDashDiffPercent < 0 ||
                                              row?.schemeDashDiff < 0
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
                                      className={`border border-gray-400 px-4 py-2 ${
                                        row?.schemeDashDiff &&
                                        row?.schemeDashDiff != "NA"
                                          ? row?.schemeDashDiff == 0
                                            ? "bg-[#78f3d1]"
                                            : row?.schemeDashDiffPercent < 3 &&
                                              row?.schemeDashDiffPercent > 0
                                            ? "bg-[#f2e092]"
                                            : row?.schemeDashDiffPercent < 0 ||
                                              row?.schemeDashDiff < 0
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
                                    <td className="border border-gray-400 px-2 py-2 ">
                                      {row?.deptExcelValue
                                        ? row?.deptExcelValue
                                        : "NA"}
                                    </td>
                                    <td
                                      className={`border border-gray-400 px-4 py-2 ${
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
                                      className={`border border-gray-400 px-4 py-2 ${
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
                                        ? row?.deptExcelDiffPercent == "NA" ? row?.deptExcelDiffPercent : `${row?.deptExcelDiffPercent}%`
                                        : "NA"}
                                    </td>
                                  </>
                                ) : (
                                  ""
                                )}
                                {showDeptAPI ? (
                                  <>
                                    <td className="border border-black px-2 py-2">
                                      {row?.deptApiValue
                                        ? row?.deptApiValue
                                        : "NA"}
                                    </td>
                                    <td
                                      className={`border border-gray-400 px-4 py-2 ${
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
                                      {row?.deptApiDiff || row?.deptApiDiff == 0
                                        ? row?.deptApiDiff
                                        : "NA"}
                                    </td>
                                    <td
                                      className={`border border-gray-400 px-4 py-2 ${
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
                          }
                        )
                      : null; // Return null if there are no rows
                  })}
                </tr>
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
        schemeSectorMapping={schemeSectorMapping}
        schemeDepartmentMapping={schemeDepartmentMapping}
        showDepartmentView={showDepartmentView}
        showScemeView={showScemeView}
        showDeptExcel={showDeptExcel}
        showDeptAPI={showDeptAPI}
        selectedOptions={selectedOptions}
        reportName={"National Summary Report"}
      />
    </>
  );
};

export default OverallSummaryReport;
