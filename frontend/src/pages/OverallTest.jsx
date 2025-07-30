import React, { useState, useEffect } from "react";
import MultiSelectDropdown from "../components/tableFilters.jsx";
import "jspdf-autotable";
import Header from "../components/Header";
import Loader from "../components/loader";
import Download from "../components/download";
import { toast } from "react-toastify"; // Import Toastify
import Filter from "../components/Filter";
import Legends from "../components/Legends.jsx";
import { useDispatch } from "react-redux";
import { api } from "../api/api"; // wherever your api slice is
import {
  useFetchNationalReportQuery,
  useFetchDepartmentMappingQuery,
  useFetchSectorMappingQuery,
} from "../api/api.jsx";
import "react-toastify/dist/ReactToastify.css"; // Import Toastify styles
import { InfoIcon } from "lucide-react";
import { useReportType } from "./ReportType.jsx";
import { use } from "react";

let globalIndex = 0;
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
  } = useReportType(); // Use global state

  

  const [totalCols, setTotalCols] = useState(15);
  const [departments, setDepartments] = useState([]);
  const [schemeDepartmentMapping, setSchemeDepartmentMapping] = useState({});
  const [outputdata, setoutputdata] = useState({}); // Store data here
  const [mappingData, setMappingdata] = useState({});
  const [schemeSectorMapping, setSchemeSectorMapping] = useState({});
  const [departmentMapping, setDepartmentMapping] = useState([]);
  const [error, setError] = useState(null);
  // const [outputData, setOutputData] = useState({});
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true); // To handle loading state
 const [displayMsg,setDisplayMsg] = useState("No Data Available");
 const filteredOutputData = localStorage.getItem("filteredOutputData");

  // Use RTK Query hooks
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
    if (nationalReportData && !filteredOutputData) {
      setLoading(false);
      localStorage.setItem("nationalReport", JSON.stringify(nationalReportData.nationalReportData));
      setOutputData(nationalReportData.nationalReportData || {});
      setoutputdata(nationalReportData.nationalReportData || {});
      setMappingdata(nationalReportData.mappingData || {});
      setDepartmentMapping(nationalReportData.kpiDetails || {});
    }
    if (departmentMappingData) {
      setSchemeDepartmentMapping(departmentMappingData || {});
      const filteredDepartments = Object.values(departmentMappingData);
      setDepartments(filteredDepartments);
    }
    if (sectorMappingData) {
      setSchemeSectorMapping(sectorMappingData || {});
      const filteredSectors = Object.values(sectorMappingData);
      setSectors([...new Set(filteredSectors)]);
    }
  }, [nationalReportData, departmentMappingData, sectorMappingData]);

  useEffect(() => {
    setLoading(
      isNationalReportLoading || isDepartmentLoading || isSectorLoading
    );
  }, [isNationalReportLoading, isDepartmentLoading, isSectorLoading]);

  // Callback function to update outputData
  const handleUpdateOutputData = (newData) => {
    setOutputData(newData); 
    localStorage.setItem("filteredOutputData", JSON.stringify(newData));
  };

  const onUpdateUnit = (unit) => {
    setUnit(unit);
    sessionStorage.setItem("unitType", JSON.stringify(unit));
    localStorage.removeItem("nationalReport");
    localStorage.removeItem("filteredOutputData");
    dispatch(api.util.invalidateTags(["NationalReport"]));
  };
  useEffect(() => {
    setError("");
  }, [toggleValue, unit]);

  // On mount, restore view states from selectedOptions
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
  }, []); 

  useEffect(() => {
    localStorage.setItem("selectedOptions", JSON.stringify(selectedOptions));
  }, [selectedOptions]);

  // Updated function to prevent duplicates and persist state
  const onSelectingOptions = (options) => {
    // Remove duplicates by id
    const uniqueOptions = options.filter(
      (option, index, self) =>
        index === self.findIndex((o) => o.id === option.id)
    );
    setSelectedOptions(uniqueOptions);

    let i = 3;
    let showDept = false;
    let showScheme = false;
    let showAPI = false;
    let showExcel = false;

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


useEffect(() => {
  // On mount, read filter selections from localStorage
  const storedSectors = JSON.parse(localStorage.getItem("selectedSectors")) || [];
  const storedDepartments = JSON.parse(localStorage.getItem("selectedDepartments")) || [];
  const storedStates = JSON.parse(localStorage.getItem("selectedStates")) || [];
  const storedSchemes = JSON.parse(localStorage.getItem("selectedSchemes")) || [];
  const storedKPIs = JSON.parse(localStorage.getItem("selectedKPIs")) || [];

  // When outputData is loaded, apply the filters
  if (nationalReportData && storedSectors.length > 0) {
    let filteredData = { ...nationalReportData.nationalReportData };

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
}, [nationalReportData]); // Run this effect when outputData changes

 
  return (
    <>
      <div className="flex justify-end gap-2  mb-1 ">
        <Header />
      </div>
      <div className="py-2 mt-[100px] font-small ">
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
                states={[]}
                onUpdateState={""}
                state={false}
                district={false}
                districts={[]}
                historical={false}
                setDisplayMsg={setDisplayMsg}
                displayMsg={displayMsg}
                onUpdateUnit={onUpdateUnit}
              />
            ) : (
              ""
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
          <Legends></Legends>
        </div>
        <div className="relative mt-0 bg-white border-gray-400 overflow-scroll ">
          {loading ? (
            <Loader /> // Show loading spinner while data is being fetched
          ) : outputData && Object.keys(outputData).length > 0 ? (
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
                                        ? row?.deptExcelDiffPercent
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
            <div>{displayMsg}</div> // Fallback if there's no outputData
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
