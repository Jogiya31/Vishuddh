import React, { useState, useMemo, useEffect } from "react";
import "jspdf-autotable";
import Header from "../components/Header";
import Download from "../components/download";
import Loader from "../components/loader";
import Filter from "../components/Filter";
import Legends from "../components/Legends.jsx";
import MultiSelectDropdown from "../components/tableFilters.jsx";
import { toast } from "react-toastify";
import "./districtStyle.css";
import { useDispatch } from "react-redux";
import {
  stateDistrictArray,
  stateArray,
  districtArray,
} from "../assets/output";
import {
  useFetchHistoricalDistrictReportQuery,
  useFetchDepartmentMappingQuery,
  useFetchSectorMappingQuery,
} from "../api/api.jsx";
import { InfoIcon } from "lucide-react";
import { useReportType } from "./ReportType.jsx";
import { getYesterdayDate } from "../config/config.js";

const parseDate = (rawDate) => {
  // Converts DD-MM-YYYY to YYYY-MM-DD
  const parts = rawDate.split("-");
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(rawDate); // fallback
};
const getInitial = (key, def) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
  } catch {
    return def;
  }
};

const HistoricalDistrictReport = () => {
  const dispatch = useDispatch();
  const [totalCols, setTotalCols] = useState(15);
  const [displayMsg, setDisplayMsg] = useState("No Data Available");

  // Filter state
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
    if (item && item.length > 0) return JSON.parse(item);
    return stateArray;
  });
  const [selectedDistricts, setSelectedDistricts] = useState(() => {
    const item = localStorage.getItem("selectedDistricts");
    if (item && item.length > 0) return JSON.parse(item);
    return districtArray;
  });

  // Table sorting
  const [ascending, setAscending] = useState(true);

  // Data
  const [stateName, setStateName] = useState(
    selectedStates[0]?.state_name || stateArray[0]?.state_name || ""
  );
  const [districtName, setDistrictName] = useState(
    selectedDistricts[0]?.district_name || districtArray[0]?.district_name || ""
  );
  const [departments, setDepartments] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [departmentMapping, setDepartmentMapping] = useState([]);
  const [schemeSectorMapping, setSchemeSectorMapping] = useState({});
  const [schemeDepartmentMapping, setSchemeDepartmentMapping] = useState({});
  const [mappingData, setMappingdata] = useState([]);
  const [outputdata, setoutputdata] = useState(null);
  const [outputData, setOutputData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const persistedDate = localStorage.getItem("selectedDate");

  const [rawDate, setRawDate] = useState(
    persistedDate ? persistedDate : getYesterdayDate()
  );
  const formattedDate = useMemo(() => {
    const [year, month, day] = rawDate.split("-");
    return `${day}-${month}-${year}`;
  }, [rawDate]);

  // Used for table rendering (state/district keys and order)
  const [filteredArray, setFilteredArray] = useState(stateDistrictArray);

  // View options
  const {
    toggleValue,
    unit,
    setUnit,
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

  // Fetch hooks
  const {
    data: districtReportData,
    error: districtReportError,
    isFetching: isDistrictReportLoading,
  } = useFetchHistoricalDistrictReportQuery({
    unit: unit,
    date: formattedDate,
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

  // Show/hide table columns
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
  }, [
    selectedOptions,
    setShowDepartmentView,
    setShowSchemeView,
    setShowDeptAPI,
    setShowDeptExcel,
  ]);

  // Data loading
  useEffect(() => {
    setLoading(
      isDistrictReportLoading || isDepartmentLoading || isSectorLoading
    );
  }, [isDistrictReportLoading, isDepartmentLoading, isSectorLoading]);

  useEffect(() => {
    if (districtReportError) {
      toast.error(
        `Error fetching District Report: ${
          districtReportError.message || "Unknown error"
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
    if (districtReportError || departmentError || sectorError) setError(true);
  }, [districtReportError, departmentError, sectorError]);

  useEffect(() => {
    if (districtReportData) {
      setoutputdata(districtReportData.districtReportData);
      setMappingdata(districtReportData.mappingData);
      setDepartmentMapping(districtReportData.kpiDetails);
    }
    if (departmentMappingData) {
      setSchemeDepartmentMapping(departmentMappingData);
      setDepartments(Array.from(new Set(Object.values(departmentMappingData))));
    }
    if (sectorMappingData) {
      setSchemeSectorMapping(sectorMappingData);
      setSectors(Array.from(new Set(Object.values(sectorMappingData))));
    }
  }, [districtReportData, departmentMappingData, sectorMappingData]);

  // Sync Districts to States (on mount or states change)
  useEffect(() => {
    if (selectedStates && selectedStates.length > 0) {
      // Find all districts for these states
      let districtsInSelectedStates = [];
      const selectedStateNames = selectedStates.map((s) => s.state_name);
      selectedStateNames.forEach((stateName) => {
        const stateObj = stateDistrictArray[stateName];
        if (stateObj && Array.isArray(stateObj.districts)) {
          districtsInSelectedStates.push(...stateObj.districts);
        }
      });
      // Deduplicate
      const districtNames = districtsInSelectedStates.map(
        (d) => d.district_name
      );
      const uniqueDistricts = districtsInSelectedStates.filter(
        (d, i) => districtNames.indexOf(d.district_name) === i
      );
      // Only update if not already synced

      if (selectedDistricts.length === 0) {
        // Only auto-select districts when none are selected
        setSelectedDistricts(uniqueDistricts);
        localStorage.setItem(
          "selectedDistricts",
          JSON.stringify(uniqueDistricts)
        );
      } else {
        // Ensure selected districts are valid for the selected states
        const validDistricts = selectedDistricts.filter((d) =>
          uniqueDistricts.some((u) => u.district_id === d.district_id)
        );
        if (validDistricts.length !== selectedDistricts.length) {
          setSelectedDistricts(validDistricts);
          localStorage.setItem(
            "selectedDistricts",
            JSON.stringify(validDistricts)
          );
        }
      }
    } else {
      // If no state is selected, clear districts too
      if (selectedDistricts.length > 0) {
        setSelectedDistricts([]);
        localStorage.setItem("selectedDistricts", JSON.stringify([]));
      }
    }
    // eslint-disable-next-line
  }, [selectedStates, stateDistrictArray]);

  // Controlled state persistence
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
  useEffect(() => {
    localStorage.setItem(
      "selectedDistricts",
      JSON.stringify(selectedDistricts)
    );
  }, [selectedDistricts]);

  // Compute unique schemes/KPIs from mappingData
  const uniqueSchemes = useMemo(
    () =>
      Object.keys(districtReportData?.districtReportData || {}).filter(Boolean),
    [districtReportData]
  );

  const uniqueKPIs = useMemo(() => {
    if (!districtReportData?.districtReportData) return [];
    return Object.values(districtReportData.districtReportData)
      .map((obj) => Object.keys(obj)[0])
      .filter(Boolean);
  }, [districtReportData]);

  const availableKPIs = useMemo(() => {
    if (!outputdata || !selectedSchemes.length || !uniqueKPIs.length) return [];
    // Collect all KPIs from outputdata for selected schemes
    const kpisInSchemes = selectedSchemes.flatMap((scheme) =>
      outputdata[scheme] ? Object.keys(outputdata[scheme]) : []
    );
    // Only keep those that are also in uniqueKPIs
    return Array.from(
      new Set(kpisInSchemes.filter((kpi) => uniqueKPIs.includes(kpi)))
    ).filter(Boolean);
  }, [outputdata, selectedSchemes, uniqueKPIs]);

  // 2. Keep selectedKPIs only those available
  useEffect(() => {
    // Only update if selection includes unavailable KPIs or is empty
    if (
      selectedKPIs.length === 0 ||
      selectedKPIs.some((kpi) => !availableKPIs.includes(kpi))
    ) {
      setSelectedKPIs(availableKPIs);
      // Optionally update localStorage if you persist it
      localStorage.setItem("selectedKPIs", JSON.stringify(availableKPIs));
    }
    // eslint-disable-next-line
  }, [availableKPIs]);

  // const availableSchemes = useMemo(() => {
  //   if (!outputdata || !uniqueKPIs.length) return [];
  //   // Only keep schemes that have at least one Kpi in uniqueKPIs
  //   return Object.keys(outputdata).filter(scheme => {
  //     const schemeKPIs = Object.keys(outputdata[scheme] || {});
  //     return schemeKPIs.some(kpi => uniqueKPIs.includes(kpi));
  //   });
  // }, [outputdata, uniqueKPIs]);

  // useEffect(() => {
  //   // Filter only the schemes that are available
  //   const validSchemes = selectedSchemes.filter(scheme =>
  //     availableSchemes.includes(scheme)
  //   );
  // console.log(validSchemes);

  //   // If any valid schemes found, set them. Otherwise, clear the selection.
  //   if (validSchemes.length > 0) {
  //     console.log('hi');

  //     setSelectedSchemes(validSchemes);
  //     localStorage.setItem("selectedSchemes", JSON.stringify(validSchemes));
  //   } else {
  //     setSelectedSchemes([]);
  //     localStorage.setItem("selectedSchemes", JSON.stringify([]));
  //     console.log('by');

  //   }

  // }, [availableSchemes]);

  const availableSectors = useMemo(() => {
    if (!mappingData || !uniqueKPIs.length) return [];
    // For all schemes in mappingData, check if any of their KPIs is in uniqueKPIs
    const sectorsSet = new Set();
    Object.keys(mappingData).forEach((scheme) => {
      const kpiArr = mappingData[scheme] || [];
      if (kpiArr.some((kpiObj) => uniqueKPIs.includes(kpiObj["KPI Name"]))) {
        if (schemeSectorMapping[scheme]) {
          sectorsSet.add(schemeSectorMapping[scheme]);
        }
      }
    });
    return Array.from(sectorsSet).filter(Boolean);
  }, [mappingData, schemeSectorMapping, uniqueKPIs]);

  const availableDepartments = useMemo(() => {
    if (!mappingData || !uniqueKPIs.length) return [];
    const departmentsSet = new Set();
    Object.keys(mappingData).forEach((scheme) => {
      const kpiArr = mappingData[scheme] || [];
      if (kpiArr.some((kpiObj) => uniqueKPIs.includes(kpiObj["KPI Name"]))) {
        if (schemeDepartmentMapping[scheme]) {
          departmentsSet.add(schemeDepartmentMapping[scheme]);
        }
      }
    });
    return Array.from(departmentsSet).filter(Boolean);
  }, [mappingData, schemeDepartmentMapping, uniqueKPIs]);

  useEffect(() => {
    // Remove any selected sectors that are not available
    if (
      selectedSectors.length === 0 ||
      selectedSectors.some((sector) => !availableSectors.includes(sector))
    ) {
      setSelectedSectors(availableSectors);
      localStorage.setItem("selectedSectors", JSON.stringify(availableSectors));
    }
    // eslint-disable-next-line
  }, [availableSectors]);

  useEffect(() => {
    // Remove any selected departments that are not available
    if (
      selectedDepartments.length === 0 ||
      selectedDepartments.some((dept) => !availableDepartments.includes(dept))
    ) {
      setSelectedDepartments(availableDepartments);
      localStorage.setItem(
        "selectedDepartments",
        JSON.stringify(availableDepartments)
      );
    }
    // eslint-disable-next-line
  }, [availableDepartments]);

  // Filtering logic (parent controls)
  useEffect(() => {
    if (
      selectedSectors.length === 0 ||
      selectedDepartments.length === 0 ||
      selectedSchemes.length === 0 ||
      selectedKPIs.length === 0 ||
      selectedStates.length === 0 ||
      selectedDistricts.length === 0
    ) {
      setOutputData({});
      setDisplayMsg("No Data Available");
      setFilteredArray({});
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
    // Filter by States and Districts for table rendering (filteredArray)
    const filteredStateNames = selectedStates.map((s) => s.state_name);
    const filteredDistrictNames = selectedDistricts.map((d) => d.district_name);
    let filteredStateDistrictArray = {};
    Object.entries(stateDistrictArray).forEach(([stateKey, stateObj]) => {
      if (filteredStateNames.includes(stateKey)) {
        const districts = stateObj.districts.filter((d) =>
          filteredDistrictNames.includes(d.district_name)
        );
        if (districts.length > 0) {
          filteredStateDistrictArray[stateKey] = {
            ...stateObj,
            districts,
          };
        }
      }
    });
    setFilteredArray(filteredStateDistrictArray);

    setOutputData(filtered);
    setDisplayMsg(
      Object.keys(filtered).length === 0 ? "No Data Available" : ""
    );
  }, [
    selectedSchemes,
    selectedKPIs,
    selectedSectors,
    selectedDepartments,
    selectedStates,
    selectedDistricts,
    outputdata,
    schemeSectorMapping,
    schemeDepartmentMapping,
  ]);

  // Table render
  let globalIndex = 0;

  const onUpdateState = (states) => {
    let filterDistrictObject = {};
    const stateNames = states.map((item) => item.state_name);

    if (stateNames.length > 0) {
      Object.keys(stateDistrictArray).forEach((state) => {
        if (stateNames.includes(state)) {
          filterDistrictObject[state] = stateDistrictArray[state];
        }
      });
    } else {
      filterDistrictObject = { ...stateDistrictArray };
    }

    const stateKeys = Object.keys(filterDistrictObject);

    if (stateKeys.length > 0) {
      setStateName(stateKeys[0]); // Fix: Set the first state name
      const firstState = stateKeys[0];
      const firstDistrict =
        filterDistrictObject[firstState]?.districts?.[0]?.district_name || "";
      setDistrictName(firstDistrict);
    }

    setFilteredArray(filterDistrictObject); // Fix: Set the correct filtered object
    return filterDistrictObject;
  };

  const onUpdateDistrict = (districts, states) => {
    const filterDistrictArray = [];
    const returndArray = onUpdateState(states);
    const districtNames = districts.map((item) => item.district_name);
    if (districtNames.length > 0) {
      Object.keys(returndArray).filter((state) => {
        returndArray[state]["districts"].map((district) => {
          if (districtNames.includes(district["district_name"])) {
            if (filterDistrictArray[state]) {
              filterDistrictArray[state]["districts"] = [
                ...filterDistrictArray[state]["districts"],
                district,
              ];
            } else {
              filterDistrictArray[state] = {};
              filterDistrictArray[state] = {
                state_id: stateDistrictArray[state]["state_id"],
                districts: [district],
              };
            }
          }
        });
      });

      setDistrictName(
        filterDistrictArray[stateName]?.["districts"][0]["district_name"]
      );
    } else {
      filterDistrictArray.push({ ...stateDistrictArray });
    }
    setFilteredArray(filterDistrictArray);
  };

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

  const handleSelectAllStates = () => {
    if (selectedStates.length === stateArray.length) {
      setSelectedStates([]);
      localStorage.setItem("selectedStates", JSON.stringify([]));
      setSelectedDistricts([]);
      localStorage.setItem("selectedDistricts", JSON.stringify([]));
    } else {
      setSelectedStates(stateArray);
      localStorage.setItem("selectedStates", JSON.stringify(stateArray));
      onUpdateState(stateArray);
      setSelectedDistricts(districtArray);
      localStorage.setItem("selectedDistricts", JSON.stringify(districtArray));
    }
  };
  const handleSelectAllDistricts = () => {
    if (selectedDistricts.length === districtArray.length) {
      setSelectedDistricts([]);
      localStorage.setItem("selectedDistricts", JSON.stringify([]));
    } else {
      setSelectedDistricts(districtArray);
      localStorage.setItem("selectedDistricts", JSON.stringify(districtArray));
      onUpdateDistrict(districtArray);
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
    let updatedDepartments;
    if (selectedDepartments.includes(department)) {
      updatedDepartments = selectedDepartments.filter((d) => d !== department);
    } else {
      updatedDepartments = [...selectedDepartments, department];
    }
    setSelectedDepartments(updatedDepartments);
    localStorage.setItem(
      "selectedDepartments",
      JSON.stringify(updatedDepartments)
    );

    // Update schemes based on departments
    const schemesToKeep = Object.keys(schemeDepartmentMapping).filter(
      (scheme) => updatedDepartments.includes(schemeDepartmentMapping[scheme])
    );
    setSelectedSchemes(schemesToKeep);
    localStorage.setItem("selectedSchemes", JSON.stringify(schemesToKeep));

    // Update sectors based on schemes
    const updatedSectors = Array.from(
      new Set(
        schemesToKeep
          .map((scheme) => schemeSectorMapping[scheme])
          .filter(Boolean)
      )
    );
    setSelectedSectors(updatedSectors);
    localStorage.setItem("selectedSectors", JSON.stringify(updatedSectors));

    // Update KPIs based on schemes
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
    localStorage.setItem("selectedSchemes", JSON.stringify(updatedSchemes));

    // Update sectors based on schemes
    const updatedSectors = Array.from(
      new Set(
        updatedSchemes
          .map((scheme) => schemeSectorMapping[scheme])
          .filter(Boolean)
      )
    );
    setSelectedSectors(updatedSectors);
    localStorage.setItem("selectedSectors", JSON.stringify(updatedSectors));

    // Update departments based on schemes
    const updatedDepartments = Array.from(
      new Set(
        updatedSchemes
          .map((scheme) => schemeDepartmentMapping[scheme])
          .filter(Boolean)
      )
    );
    setSelectedDepartments(updatedDepartments);
    localStorage.setItem(
      "selectedDepartments",
      JSON.stringify(updatedDepartments)
    );

    // Update KPIs based on schemes
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
  };

  const toggleKPI = (kpi) => {
    let updatedKPIs;
    if (selectedKPIs.includes(kpi)) {
      updatedKPIs = selectedKPIs.filter((d) => d !== kpi);
    } else {
      updatedKPIs = [...selectedKPIs, kpi];
    }
    setSelectedKPIs(updatedKPIs);
    localStorage.setItem("selectedKPIs", JSON.stringify(updatedKPIs));

    // Update schemes based on KPIs
    const schemesToKeep = Object.keys(mappingData).filter((scheme) =>
      (mappingData[scheme] || []).some((kpiObj) =>
        updatedKPIs.includes(kpiObj["KPI Name"])
      )
    );
    setSelectedSchemes(schemesToKeep);
    localStorage.setItem("selectedSchemes", JSON.stringify(schemesToKeep));

    // Update sectors based on schemes
    const updatedSectors = Array.from(
      new Set(
        schemesToKeep
          .map((scheme) => schemeSectorMapping[scheme])
          .filter(Boolean)
      )
    );
    setSelectedSectors(updatedSectors);
    localStorage.setItem("selectedSectors", JSON.stringify(updatedSectors));

    // Update departments based on schemes
    const updatedDepartments = Array.from(
      new Set(
        schemesToKeep
          .map((scheme) => schemeDepartmentMapping[scheme])
          .filter(Boolean)
      )
    );
    setSelectedDepartments(updatedDepartments);
    localStorage.setItem(
      "selectedDepartments",
      JSON.stringify(updatedDepartments)
    );
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

    // Update districts based on selected states
    // Find all districts belonging to selected states
    const selectedStateNames = updatedStates.map((s) => s.state_name);
    // If stateDistrictArray uses state_name as key:
    let districtsInSelectedStates = [];
    selectedStateNames.forEach((stateName) => {
      const stateObj = stateDistrictArray[stateName];
      if (stateObj && Array.isArray(stateObj.districts)) {
        districtsInSelectedStates.push(...stateObj.districts);
      }
    });
    // Optionally dedupe districts if needed
    const districtNames = districtsInSelectedStates.map((d) => d.district_name);
    const uniqueDistricts = districtsInSelectedStates.filter(
      (d, i) => districtNames.indexOf(d.district_name) === i
    );
    setSelectedDistricts(uniqueDistricts);
    localStorage.setItem("selectedDistricts", JSON.stringify(uniqueDistricts));
  };

  const toggleDistrict = (districtObj) => {
    let updatedDistricts;
    if (
      selectedDistricts.some((d) => d.district_id === districtObj.district_id)
    ) {
      updatedDistricts = selectedDistricts.filter(
        (d) => d.district_id !== districtObj.district_id
      );
    } else {
      updatedDistricts = [...selectedDistricts, districtObj];
    }
    setSelectedDistricts(updatedDistricts);
    localStorage.setItem("selectedDistricts", JSON.stringify(updatedDistricts));

    // Find all states for the currently selected districts
    const stateIdToState = {};
    Object.entries(stateDistrictArray).forEach(([stateName, stateObj]) => {
      stateObj.districts.forEach((dist) => {
        stateIdToState[dist.district_id] = {
          state_id: stateObj.state_id,
          state_name: stateName,
        };
      });
    });

    // Collect unique states from the updated districts
    const statesInSelectedDistricts = [];
    const seenStateIds = new Set();
    updatedDistricts.forEach((dist) => {
      const state = stateIdToState[dist.district_id];
      if (state && !seenStateIds.has(state.state_id)) {
        statesInSelectedDistricts.push(state);
        seenStateIds.add(state.state_id);
      }
    });

    setSelectedStates(statesInSelectedDistricts);
    localStorage.setItem(
      "selectedStates",
      JSON.stringify(statesInSelectedDistricts)
    );
  };
  const onDateChange = (date) => {
    setRawDate(date); // triggers useEffect
  };

  // Sorting State and District Name columns
  const sortByStateName = () => {
    // Create a new sorted object for filteredArray with sorted state keys
    const sortedKeys = Object.keys(filteredArray).sort((a, b) => {
      const nameA = a.replace(/\d+/g, "").toLowerCase();
      const nameB = b.replace(/\d+/g, "").toLowerCase();
      if (ascending) {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
    const sortedObj = {};
    sortedKeys.forEach((key) => {
      sortedObj[key] = filteredArray[key];
    });
    setFilteredArray(sortedObj);
    setAscending(!ascending);
  };

  const sortByDistrictName = () => {
    // Sort districts within each state in filteredArray
    const newFilteredArray = { ...filteredArray };
    Object.keys(newFilteredArray).forEach((stateKey) => {
      newFilteredArray[stateKey] = {
        ...newFilteredArray[stateKey],
        districts: [...newFilteredArray[stateKey].districts].sort((a, b) => {
          if (ascending) {
            return a.district_name.localeCompare(b.district_name);
          } else {
            return b.district_name.localeCompare(a.district_name);
          }
        }),
      };
    });
    setFilteredArray(newFilteredArray);
    setAscending(!ascending);
  };
  const sortData = (key, schemeKey, kpiKey) => {
    // key: string, e.g., 'prayasValue', 'nativeDashValue'
    // schemeKey, kpiKey: the current scheme/kpi being sorted
    // This will sort districts inside each state in filteredArray

    const newFilteredArray = { ...filteredArray };

    Object.keys(newFilteredArray).forEach((stateKey) => {
      newFilteredArray[stateKey] = {
        ...newFilteredArray[stateKey],
        districts: [...newFilteredArray[stateKey].districts].sort((a, b) => {
          // Extract values for each district from outputData
          const stateName = stateKey.replace(/\d+/g, "");
          const aValRaw =
            outputData?.[schemeKey]?.[kpiKey]?.[stateName]?.[a.district_name]?.[
              key
            ];
          const bValRaw =
            outputData?.[schemeKey]?.[kpiKey]?.[stateName]?.[b.district_name]?.[
              key
            ];

          // Treat "NA", undefined, null as special
          const isANa =
            aValRaw === "NA" ||
            aValRaw === undefined ||
            aValRaw === null ||
            aValRaw === "";
          const isBNa =
            bValRaw === "NA" ||
            bValRaw === undefined ||
            bValRaw === null ||
            bValRaw === "";

          if (isANa && isBNa) return 0;
          if (isANa) return ascending ? 1 : -1; // Put NA at the end if ascending, start if descending
          if (isBNa) return ascending ? -1 : 1;

          // Try number comparison first
          const aNum = Number(aValRaw);
          const bNum = Number(bValRaw);
          const aIsNum = !isNaN(aNum);
          const bIsNum = !isNaN(bNum);

          if (aIsNum && bIsNum) {
            return ascending ? aNum - bNum : bNum - aNum;
          } else {
            // Fallback to string comparison
            if (ascending) {
              return String(aValRaw).localeCompare(String(bValRaw));
            } else {
              return String(bValRaw).localeCompare(String(aValRaw));
            }
          }
        }),
      };
    });
    setFilteredArray(newFilteredArray);
    setAscending(!ascending);
  };
  return (
    <>
      <div className="font-small ">
        <div className="flex flex-wrap w-full items-center mx-0  py-0  rounded-xl">
          <div className="flex justfy-start  w-full  py-1">
            <div className="flex justfy-start  w-full  py-1">
              {!loading ? (
                <Filter
                  sectors={availableSectors}
                  departments={availableDepartments}
                  mappingData={mappingData}
                  kpis={uniqueKPIs}
                  // schemes={availableSchemes}
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
                  selectedStates={selectedStates}
                  setSelectedStates={setSelectedStates}
                  selectedDistricts={selectedDistricts}
                  setSelectedDistricts={setSelectedDistricts}
                  displayMsg={displayMsg}
                  setDisplayMsg={setDisplayMsg}
                  state={true}
                  district={true}
                  states={stateArray}
                  districts={districtArray}
                  historical={true}
                  handleSelectAllSectors={handleSelectAllSectors}
                  handleSelectAllDepartments={handleSelectAllDepartments}
                  handleSelectAllSchemes={handleSelectAllSchemes}
                  handleSelectAllKPIs={handleSelectAllKPIs}
                  handleSelectAllStates={handleSelectAllStates}
                  handleSelectAllDistricts={handleSelectAllDistricts}
                  toggleSector={toggleSector}
                  toggleDepartment={toggleDepartment}
                  toggleScheme={toggleScheme}
                  toggleKPI={toggleKPI}
                  toggleState={toggleState}
                  toggleDistrict={toggleDistrict}
                  historicalDate={rawDate}
                  onDateChange={onDateChange}
                />
              ) : (
                ""
              )}
            </div>
          </div>
        </div>
        <div className="inline-flex  items-center my-2  w-[98%] ">
          <div className="flex justify-start w-[30%]">
            <MultiSelectDropdown
              onUpdateUnit={setUnit}
              onSelectingOptions={() => {}}
              Description={"Latest Prayas"}
              selectedUnit={unit}
            />
          </div>
          <div className="flex justify-center w-[40%]">
            <h2 className="font-bold text-lg text-center flex-1 text-gray-600">
              Historical District Level Report
            </h2>
          </div>
          <div className="flex justify-end w-[30%]">
            <Legends />
          </div>{" "}
        </div>
        <div
          className="relative mt-0 bg-white border-gray-400 overflow-auto min-h-[220px]
  max-h-[54vh]"
        >
          {loading ? (
            <Loader />
          ) : error ? (
            <div className="error-message">
              Error: {error.message || "Something went wrong!"}
            </div>
          ) : outputData && Object.keys(outputData).length > 0 ? (
            <table
              id="districtTable"
              className="relative w-full text-[12px] border border-gray-400 "
            >
              <thead className="bg-[#e3eefb]  text-black border-1 border-gray-400">
                {/* First row with merged header */}
                <tr>
                  <th colSpan="4"></th>
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
                              {mappingData[schemeKey][0]["Frequency"]
                                .charAt(0)
                                .toUpperCase() +
                                mappingData[schemeKey][0]["Frequency"].slice(1)}
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
                    className="border  border-gray-400 px-4 py-2 text-gray-600"
                  >
                    State{" "}
                    <button
                      className="p-1 border rounded-md hover:bg-white"
                      onClick={() => sortByStateName()}
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
                    className="border  border-gray-400 px-4 py-2 text-gray-600"
                  >
                    State Code
                    <br />
                  </th>
                  <th
                    rowSpan="4"
                    colSpan="1"
                    className="border  border-gray-400 px-4 py-2 text-gray-600"
                  >
                    District
                    <button
                      className="p-1 border rounded-md hover:bg-white"
                      onClick={() => sortByDistrictName()}
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
                    className="border  border-gray-400 px-4 py-2 text-gray-600"
                  >
                    District Code
                    <br />
                  </th>

                  {Object.keys(outputData).map((schemeKey) =>
                    Object.keys(outputData[schemeKey]).map((kpiKey) => (
                      <React.Fragment key={`${schemeKey}-${kpiKey}`}>
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
                          className="border  border-gray-400 px-4 py-2 text-gray-600"
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
                          <div className=" text-gray-600 text-[9px]">(A)</div>
                          <div className=" text-gray-600 text-[9px]">
                            {
                              outputData[schemeKey][kpiKey][stateName]?.[
                                [districtName]
                              ]?.["prayas_date_of_data"]
                            }
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
                              href={mappingData[schemeKey][0]["State_URL"]}
                              title={mappingData[schemeKey][0]["National_URL"]}
                            >
                              Department Dashboard
                            </a>
                            <div> (via Web Scraping)</div>
                            <div className=" text-gray-600 text-[9px]">
                              {(() => {
                                const frequency =
                                  mappingData[schemeKey]?.[0]?.["Frequency"] ||
                                  "";
                                const formattedFreq =
                                  frequency.charAt(0).toUpperCase() +
                                  frequency.slice(1);
                                const rawDate =
                                  outputData[schemeKey][kpiKey][stateName]?.[
                                    [districtName]
                                  ]?.["date_of_data"];

                                if (!rawDate) return "";

                                const date = new Date(parseDate(rawDate));
                                if (isNaN(date.getTime())) return "";
                                return formattedFreq === "Daily"
                                  ? rawDate
                                  : rawDate;
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
                              <div className=" text-gray-600 text-[9px]">
                                {(() => {
                                  const frequency =
                                    mappingData[schemeKey]?.[0]?.[
                                      "Frequency"
                                    ] || "";
                                  const formattedFreq =
                                    frequency.charAt(0).toUpperCase() +
                                    frequency.slice(1);
                                  const rawDate =
                                    outputData[schemeKey][kpiKey][stateName]?.[
                                      [districtName]
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
                                [districtName]
                              ]?.["deptExcelDate"] || ""}
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
                            <div>(via API)</div>
                            <div className=" text-gray-600 text-[9px]">
                              {outputData[schemeKey][kpiKey][stateName]?.[
                                [districtName]
                              ]?.["date_of_data"] || ""}
                            </div>
                          </th>
                        ) : (
                          ""
                        )}
                      </React.Fragment>
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
                {Object.keys(filteredArray).map((state1, stateIndex) => {
                  return filteredArray[state1]["districts"].map(
                    (district, districtIndex) => {
                      const state = state1.replace(/\d+/g, "");
                      return (
                        <tr
                          key={`${stateIndex - districtIndex}`}
                          className="text-center text-[12px]"
                        >
                          {/* State name column */}
                          <td className="boxStyle">{state} </td>
                          {/* State index column */}
                          <td className="boxStyle">
                            {filteredArray[state1]["state_id"]}
                          </td>
                          <td className="boxStyle">
                            {district["district_name"]}
                          </td>

                          <td className="boxStyle">
                            {district["district_id"]}
                          </td>
                          {/* State index column */}

                          {/* Loop through each scheme */}
                          {Object.keys(outputData).map((schemeKey) => {
                            const schemeData = outputData[schemeKey];

                            // Check if there are rows in the scheme
                            return Object.keys(schemeData).length > 0
                              ? Object.keys(schemeData).map((keyRow, index) => {
                                  // Access data for the specific state
                                  const row = schemeData[keyRow][state]?.[
                                    district["district_name"]
                                  ]
                                    ? schemeData[keyRow][state]?.[
                                        district["district_name"]
                                      ]
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
                                        {row?.prayasValue
                                          ? row?.prayasValue
                                          : "NA"}
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
                                                    row?.nativeDashDiffPercent >
                                                      0
                                                  ? "bg-[#f2e092]"
                                                  : row?.nativeDashDiffPercent <
                                                    0
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
                                                    row?.nativeDashDiffPercent >
                                                      0
                                                  ? "bg-[#f2e092]"
                                                  : row?.nativeDashDiffPercent <
                                                    0
                                                  ? "bg-[#f37a78]"
                                                  : "bg-[#FFC107]"
                                                : ""
                                            }`}
                                          >
                                            {(row?.nativeDashDiffPercent &&
                                              row?.nativeDashDiffPercent !=
                                                "NA") ||
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
                                                    row?.schemeDashDiffPercent >
                                                      0
                                                  ? "bg-[#f2e092]"
                                                  : row?.schemeDashDiffPercent <
                                                    0
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
                                                    row?.schemeDashDiffPercent >
                                                      0
                                                  ? "bg-[#f2e092]"
                                                  : row?.schemeDashDiffPercent <
                                                    0
                                                  ? "bg-[#f37a78]"
                                                  : "bg-[#FFC107]"
                                                : ""
                                            }`}
                                          >
                                            {(row?.schemeDashDiffPercent &&
                                              row?.schemeDashDiffPercent !=
                                                "NA") ||
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
                                                  : row?.deptExcelDiffPercent >
                                                      0 &&
                                                    row?.deptExcelDiffPercent <
                                                      3
                                                  ? "bg-[#f2e092]"
                                                  : row?.deptExcelDiffPercent <
                                                    0
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
                                                  : row?.deptExcelDiffPercent >
                                                      0 &&
                                                    row?.deptExcelDiffPercent <
                                                      3
                                                  ? "bg-[#f2e092]"
                                                  : row?.deptExcelDiffPercent <
                                                    0
                                                  ? "bg-[#f37a78]"
                                                  : "bg-[#FFC107]"
                                                : ""
                                            }`}
                                          >
                                            {row?.deptExcelDiff ||
                                            row?.deptExcelDiff === 0
                                              ? row?.deptExcelDiffPercent ==
                                                "NA"
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
                    }
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
        stateDistrictMapping={filteredArray}
        mappingData={mappingData}
        schemeDepartmentMapping={schemeDepartmentMapping}
        schemeSectorMapping={schemeSectorMapping}
        district={true}
        state={false}
        stateName={stateName}
        districtName={districtName}
        showDepartmentView={showDepartmentView}
        showScemeView={showScemeView}
        showDeptExcel={showDeptExcel}
        showDeptAPI={showDeptAPI}
        reportName={`Historical District Report`}
      />
    </>
  );
};

export default HistoricalDistrictReport;
