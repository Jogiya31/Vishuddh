import React, { useState, useEffect } from "react";
import "jspdf-autotable";
import Header from "../components/Header";
import Download from "../components/download";
import Filter from "../components/Filter";
import Loader from "../components/loader";
import { stateArray } from "../assets/output.js";
import Legends from "../components/Legends.jsx";
import MultiSelectDropdown from "../components/tableFilters.jsx";
import {
  useFetchStateReportQuery,
  useFetchDepartmentMappingQuery,
  useFetchSectorMappingQuery,
} from "../api/api.jsx";
import { useDispatch } from "react-redux";
import { api } from "../api/api"; // wherever your api slice is
import { toast } from "react-toastify";
import "./style.css";
import { InfoIcon } from "lucide-react";
import { useReportType } from "./ReportType.jsx";
const StateSummaryReport = () => {
  const dispatch = useDispatch();
  const [totalCols, setTotalCols] = useState(15);

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
  } = useReportType(); // Use global state
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
    let i = 3; // Start with base value

    if (options.length > 0) {
      // Reset all views first

      // Temporary flags to track selected options
      let showDept = false;
      let showScheme = false;
      let showAPI = false;
      let showExcel = false;

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

      // Update state *after* loop completes
      setShowDepartmentView(showDept);
      setShowSchemeView(showScheme);
      setShowDeptAPI(showAPI);
      setShowDeptExcel(showExcel);
      setTotalCols(i);
    } else {
      // If no option is selected, show all by default
      setShowDepartmentView(true);
      setShowSchemeView(true);
      setShowDeptAPI(true);
      setShowDeptExcel(true);
      setTotalCols(15); // Default total columns
    }
  };
  // Use RTK Query hooks
  const {
    data: stateReportData,
    error: stateReportError,
    isFetching: isStateReportLoading,
  } = useFetchStateReportQuery({ UnitType: unit, toggle: toggleValue });
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

  const [displayMsg,setDisplayMsg] = useState("No Data Available");
  const [departments, setDepartments] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [outputdata, setoutputdata] = useState(null); // Store data here
  const [loading, setLoading] = useState(true); // To handle loading state
  const [error, setError] = useState(null); // To handle errors
  const [mappingData, setMappingdata] = useState();
  const [departmentMapping, setDepartmentMapping] = useState([]);
  const [schemeSectorMapping, setSchemeSectorMapping] = useState([]);
  const [schemeDepartmentMapping, setSchemeDepartmentMapping] = useState({});
  const [filteredStates, setFilteredStates] = useState(stateArray);
  const [stateName, setStateName] = useState("Assam");
  const [ascending, setAscending] = useState(false);
  const [dataAscending, setDataAscending] = useState(true);
  const onUpdateState = (states) => {
    setFilteredStates(states);
    localStorage.setItem("filteredStates", JSON.stringify(states));
    setStateName(states[0]?.["state_name"]);
  };
  //Function to sort states
  const sortStates = () => {
    const sortedStates = [...filteredStates].sort((a, b) =>
      ascending
        ? a.state_name.localeCompare(b.state_name)
        : b.state_name.localeCompare(a.state_name)
    );
    setFilteredStates(sortedStates);
    setAscending(!ascending);
  };
  //Function to sort data on the basis of key value
  const sortData = (key, schemeKey, kpiKey) => {
    // Deep Copy of outputData to avoid mutation errors
    const sortedData = JSON.parse(JSON.stringify(outputData));

    const states = outputData[schemeKey][kpiKey];

    // Sort states inside outputData
    const sortedStates = Object.entries(states)
      .sort(([stateA, dataA], [stateB, dataB]) => {
        const getValue = (data) => {
          let val = data?.[key] || "NA"; // Use optional chaining to prevent errors

          // Handle missing values
          if (val == "NA" || val == null || val === "") return null;

          // Ensure val is a string before calling `.replace()`
          return Number(String(val).replace(/,/g, "") || "0");
        };

        const valueA = dataA ? getValue(dataA) : null;
        const valueB = dataB ? getValue(dataB) : null;

        // Push missing values to the end
        if (valueA === null && valueB !== null) return 1;
        if (valueA !== null && valueB === null) return -1;
        if (valueA === null && valueB === null) return 0;

        // Sort numerically
        return dataAscending ? valueA - valueB : valueB - valueA;
      })
      .reduce((acc, [state, data]) => {
        acc[state] = data;
        return acc;
      }, {});

    sortedData[schemeKey][kpiKey] = sortedStates;

    // Extract sorted state names from sortedData
    const sortedStateNames = Object.keys(
      Object.values(sortedData)?.[0]?.[
      Object.keys(Object.values(sortedData)?.[0] || {})?.[0]
      ] || {}
    );

    // Sort filterStatesArray to match sorted state names
    const sortedFilterStates = [...stateArray].sort((a, b) => {
      return (
        sortedStateNames.indexOf(a.state_name) -
        sortedStateNames.indexOf(b.state_name)
      );
    });

    setFilteredStates(sortedFilterStates);
    setDataAscending(!dataAscending);
  };

  //function to update Unit
  const onUpdateUnit = (unit) => {
    setUnit(unit);
    sessionStorage.setItem("unitType", JSON.stringify(unit));
    localStorage.removeItem("stateReport");
    dispatch(api.util.invalidateTags(["StateReport"]));
  };
  // Callback function to update outputData
  const handleUpdateOutputData = (newData) => {
    setOutputData(newData); // Update the state in parent
  };
  // Set loading state based on the queries
  useEffect(() => {
    setLoading(isStateReportLoading || isDepartmentLoading || isSectorLoading);
  }, [isStateReportLoading, isDepartmentLoading, isSectorLoading]);

  useEffect(() => {
    if (stateReportError) {
      toast.error(
        `Error fetching State Report: ${stateReportError.message || "Unknown error"
        }`,
        {
          position: "top-right",
        }
      );
    }
    if (departmentError) {
      toast.error(
        `Error fetching Department Mapping: ${departmentError.message || "Unknown error"
        }`,
        { position: "top-right" }
      );
    }
    if (sectorError) {
      toast.error(
        `Error fetching Sector Mapping: ${sectorError.message || "Unknown error"
        }`,
        {
          position: "top-right",
        }
      );
    }
    if (stateReportError || departmentError || sectorError) setError(true);
  }, [stateReportError, departmentError, sectorError]);
  // Filter the departments and sectors based on the search input

  useEffect(() => {
    if (stateReportData) {
      // toast.success(`Data Recieved Successfully!`, {
      //   position: "top-right",
      // });

      setoutputdata(stateReportData.stateReportData);
      setOutputData(stateReportData.stateReportData);
      setMappingdata(stateReportData.mappingData);
      setDepartmentMapping(stateReportData.kpiDetails);

    }
    if (departmentMappingData) {
      setSchemeDepartmentMapping(departmentMappingData);
      const filteredDepartments1 = [];
      Object.keys(departmentMappingData).map((scheme) => {
        filteredDepartments1.push(departmentMappingData[scheme]);
      });

      //   setFilteredDepartments(filteredDepartments1);
      setDepartments(filteredDepartments1);
    }
    if (sectorMappingData) {
      setSchemeSectorMapping(sectorMappingData);
      const filteredSectors = [];
      Object.keys(sectorMappingData).map((scheme) => {
        filteredSectors.push(sectorMappingData[scheme]);
      });
      setSectors(Array.from(new Set(filteredSectors)));
    }
  }, [stateReportData, departmentMappingData, sectorMappingData]);
  // const handleToggleChange = (isRightPrayas) => {
  //   localStorage.removeItem("stateReport");
  //   setToggleValue((prev) => !prev);
  //   dispatch(api.util.invalidateTags(["StateReport"]));
  // };
  useEffect(() => {
    localStorage.removeItem("stateReport");
    dispatch(api.util.invalidateTags(["StateReport"]));
  }, [toggleValue]);

  useEffect(() => {
    const storedStates = JSON.parse(localStorage.getItem("selectedStates"));
  if(storedStates){
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
  }
  }, [stateReportData]);

  useEffect(() => {
  // On mount, read filter selections from localStorage
  const storedSectors = JSON.parse(localStorage.getItem("selectedSectors")) || [];
  const storedDepartments = JSON.parse(localStorage.getItem("selectedDepartments")) || [];
  const storedStates = JSON.parse(localStorage.getItem("selectedStates")) || [];
  const storedSchemes = JSON.parse(localStorage.getItem("selectedSchemes")) || [];
  const storedKPIs = JSON.parse(localStorage.getItem("selectedKPIs")) || [];

  // When outputData is loaded, apply the filters
  if (outputData) {
    let filteredData = { ...outputData };

    // Filter by schemes
    if (storedSchemes.length > 0) {
      filteredData = Object.keys(filteredData)
        .filter(scheme => storedSchemes.includes(scheme))
        .reduce((obj, key) => { obj[key] = filteredData[key]; return obj; }, {});
    }

    // Filter by KPIs
    Object.keys(filteredData).forEach(scheme => {
      filteredData[scheme] = Object.keys(filteredData[scheme])
        .filter(kpi => storedKPIs.includes(kpi))
        .reduce((obj, key) => { obj[key] = filteredData[scheme][key]; return obj; }, {});
    });

    // [Repeat similar logic for states, sectors, departments as needed]

    setOutputData(filteredData);
  }
}, [outputData]);


  let globalIndex = 0;
  return (
    <>
      <div className="flex justify-end gap-2  mb-1 ">
        <Header />
      </div>
      <div className="py-1 mt-[100px] font-small ">
        {/* Report Options Row */}
        <div className="flex flex-wrap w-full items-center mx-0  py-0  rounded-xl">
          <div className="flex justfy-start  w-full  py-1">
            {/*Filters Section */}
            {!loading && !error ? (
              <Filter
                departments={departments}
                departmentMapping={departmentMapping}
                sectors={sectors}
                outputdata={outputdata}
                schemeDepartmentMapping={schemeDepartmentMapping}
                schemeSectorMapping={schemeSectorMapping}
                mappingData={mappingData}
                onUpdatedOutputData={handleUpdateOutputData}
                states={stateArray}
                onUpdateState={onUpdateState}
                state={true}
                district={false}
                onUpdateUnit={onUpdateUnit}
                historical={false}
                setDisplayMsg={setDisplayMsg}
                displayMsg={displayMsg}
              />
            ) : (
              ""
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex items-center justify-between w-full px-1 my-2">
          <MultiSelectDropdown
            onUpdateUnit={onUpdateUnit}
            onSelectingOptions={onSelectingOptions}
            Description={"Prayas Match"}
            selectedUnit={unit}
          />
          <h2 className="font-bold text-lg text-center flex-1 text-gray-600">
            State Level Report
          </h2>
          <Legends></Legends>
        </div>
        <div
          className="relative mt-0 bg-white border-gray-400 overflow-auto min-h-[220px]
  max-h-[55vh]"
        >
          {loading ? (
            <Loader /> // Show loading spinner while data is being fetched
          ) : outputData && Object.keys(outputData).length > 0 ? (
            <table
              id="stateTable"
              className="relative w-full text-[14px] border border-gray-400  "
            >
              <thead className="bg-[#e3eefb]  text-black border border-gray-800">
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
                          className={`border border-gray-400 px-2 py-1 text-gray-600 ${currentIndex % 2 === 0
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
                              key={`${schemeKey}-${kpiKey}-Prayas Value`}
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
                            {outputData[schemeKey][kpiKey][stateName]?.[
                              "prayas_date_of_data"
                            ] || ""}
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
                            <div>(via Web Scraping)</div>
                            <div className=" text-gray-600 text-[9px]">
                              {outputData[schemeKey][kpiKey][stateName]?.[
                                "date_of_data"
                              ] || ""}
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
                                {outputData[schemeKey][kpiKey][stateName]?.[
                                  "scheme_date_of_data"
                                ] || ""}
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
                            <div> (via Excel)</div>
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
                            <div>(via API)</div>
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
                                  key={`${schemeKey}-${kpiKey}-Value`}
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
                                  key={`${schemeKey}-${kpiKey}-nativeDashDiff`}
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
                                  key={`${schemeKey}-${kpiKey}-nativeDashDiffPercent`}
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
                                  key={`${schemeKey}-${kpiKey}-schemeDashValue`}
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
                                  key={`${schemeKey}-${kpiKey}-schemeDashDiff`}
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
                                  key={`${schemeKey}-${kpiKey}-schemeDashDiffPercent`}
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
                                (E-A)
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
                                      className={`boxStyle ${row?.nativeDashDiff &&
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
                                      className={`boxStyle ${row?.nativeDashDiff &&
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
                                      className={`boxStyle ${row?.schemeDashDiff &&
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
                                      className={`boxStyle ${row?.schemeDashDiff &&
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
                                      className={`boxStyle ${row?.deptExcelDiff &&
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
                                      className={`boxStyle ${row?.deptExcelDiff &&
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
                                        ? row?.deptExcelDiffPercent
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
                                      className={`boxStyle ${row?.deptApiDiff &&
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
                                      className={`boxStyle ${row?.deptApiDiff &&
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
            <div>{displayMsg}</div> // Fallback if there's no outputData
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
        reportName={"State Summary Report"}
      ></Download>
    </>
  );
};

export default StateSummaryReport;
