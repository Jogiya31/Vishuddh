import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReportType } from "../pages/ReportType";
// import Refresh from "../assets/refresh_white.svg";
// import Home from "../assets/Home_white.svg";
import { Home, RefreshCcw, ChevronDown, Brain, FileText, Clipboard, Upload, Settings } from "lucide-react";
import { set } from "date-fns";
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const {
    reportType,
    setReportType,
    granularityType,
    setGranularityType,
    dateType,
    setDateType,
    setToggleValue,
    setShowDepartmentView,
    setShowSchemeView,
    setShowDeptExcel,
    setShowDeptAPI,
    setUnit,
    setSelectedOptions,
  } = useReportType(); // Use global state
  const reportTypeRef = useRef();
  const dataTypeRef = useRef();
  const dateTypeRef = useRef();

  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        reportTypeRef.current &&
        !reportTypeRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
      if (dataTypeRef.current && !dataTypeRef.current.contains(event.target)) {
        setIsDataOpen(false);
      }
      if (dateTypeRef.current && !dateTypeRef.current.contains(event.target)) {
        setIsDateOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const handleApply = () => {
    const isHistorical = reportType === "Historical";
    const newToggleValue = isHistorical
      ? dateType === "Latest Match"
      : dateType !== "Latest Match";

    setToggleValue(newToggleValue);

    navigate(
      `/${
        isHistorical ? "historical" : "current"
      }/${granularityType.toLowerCase()}`
    );
  };

  const handleRefresh = () => {
    // Clear localStorage and sessionStorage

    navigate("/current/national");

    setReportType("Current");
    setGranularityType("National");
    setDateType("Latest Match");
    setToggleValue(false);
    setShowDepartmentView(true);
    setShowSchemeView(true);
    setShowDeptExcel(true);
    setShowDeptAPI(true);
    setUnit("In Absolute");
    setSelectedOptions([]);

    // Reset global state
    sessionStorage.setItem("reportType", JSON.stringify("Current"));
    sessionStorage.setItem("granularityType", JSON.stringify("National"));
    sessionStorage.setItem("dateType", JSON.stringify("Latest Match"));
    sessionStorage.removeItem("options");
    localStorage.setItem('refresh',true);
    localStorage.removeItem("filteredSchemes");
    localStorage.removeItem("filteredDepartments");
    localStorage.removeItem("filteredOutputData");
    localStorage.removeItem("filteredSectors");
    localStorage.removeItem("filteredStates");
    localStorage.removeItem("filteredDistricts");
    localStorage.removeItem("filteredKPIs");
    localStorage.removeItem("showDepartmentView");
    localStorage.removeItem("showSchemeView");
    localStorage.removeItem("showDeptExcel");
    localStorage.removeItem("showDeptAPI");
    localStorage.removeItem("unitType");
    sessionStorage.removeItem("ai_scheme");
    sessionStorage.removeItem("ai_kpi");
    localStorage.removeItem("filteredOutputData");
    localStorage.removeItem("nationalReport");
    localStorage.removeItem("selectedStates");
        localStorage.removeItem("selectedDistricts");
    localStorage.removeItem("selectedSectors");
    localStorage.removeItem("selectedDepartments");
    localStorage.removeItem("selectedSchemes");
    localStorage.removeItem("selectedKPIs");

window.location.reload();
  };

  return (
    <div className="bg-gray w-full left-0 right-0 rounded  items-center">
      <div className="flex w-full justify-end items-center text-white gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/home")}
              className="p-2 bg-[#4f67b7] rounded-full hover:bg-gray-700 transition"
            >
              <Home size={15} className="text-white" />
            </button>
            <button
              onClick={() => handleRefresh()}
              title="Refresh"
              className="p-2 bg-[#4f67b7] rounded-full hover:bg-gray-700 transition"
            >
              <RefreshCcw size={15} className="text-white" />
            </button>
            <button
              title="Go to AI Report"
              onClick={() => navigate("/aireport")}
              className="p-2 bg-[#4f67b7] rounded-full hover:bg-gray-700 transition"
            >
              <Brain size={15} className="text-white" />
            </button>
             <button
              title="Go to Scraping Exception Report"
              onClick={() => navigate("/scraping/exception-report")}
              className="p-2 bg-[#4f67b7] rounded-full hover:bg-gray-700 transition"
            >
              <FileText size={15} className="text-white" />
            </button>
                         <button
              title="Go to Scraping Log Report"
              onClick={() => navigate("/log-report")}
              className="p-2 bg-[#4f67b7] rounded-full hover:bg-gray-700 transition"
            >
              <Clipboard size={15} className="text-white" />
            </button>
                <button
              title="Go to Data Upload Via Excel"
              onClick={() => navigate("/scraping/data-input")}
              className="p-2 bg-[#4f67b7] rounded-full hover:bg-gray-700 transition"
            >
              <Upload size={15} className="text-white" />
            </button>
             <button
              title="Go to Manual Scraping"
              onClick={() => navigate("/manual-scraping")}
              className="p-2 bg-[#4f67b7] rounded-full hover:bg-gray-700 transition"
            >
              <Settings size={15} className="text-white" />
            </button>
          </div>
          <div className="flex gap-2 border border-[#a39b9ba6] p-[2px] rounded-[10px]">
            {/* Report Type Button */}
          <div className="relative" ref={reportTypeRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 text-white  bg-[#4f67b7] px-3 py-2 rounded-lg text-[12px] hover:bg-gray-700 transition"
            >
              {reportType} <ChevronDown size={16} />
            </button>
            {isOpen && (
              <ul className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <button
                  onClick={() => {
                    setReportType("Current");
                    // navigate("/current/national");
                    setIsOpen(!isOpen);
                  }}
                  className="w-full space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] rounded-t-lg"
                >
                  <div className="text-gray-700 text-left overflow-hidden whitespace-nowrap truncate">
                    Current
                  </div>
                </button>
                <button
                  onClick={() => {
                    setReportType("Historical");
                    // navigate("/historical/national");
                    setIsOpen(!isOpen);
                  }}
                  className="w-full space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] rounded-b-lg"
                >
                  <div className="text-gray-700 text-left overflow-hidden whitespace-nowrap truncate">
                    Historical
                  </div>
                </button>
              </ul>
            )}
          </div>

          {/* Data Type Button */}
          <div className="relative" ref={dataTypeRef}>
            <button
              onClick={() => setIsDataOpen(!isDataOpen)}
              className="flex items-center gap-2 text-white  bg-[#4f67b7] px-3 py-2 rounded-lg text-[12px] hover:bg-gray-700 transition"
            >
              {granularityType} <ChevronDown size={16} />
            </button>
            {isDataOpen && (
              <ul className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <button
                  onClick={() => {
                    setGranularityType("National");
                    // navigate(
                    //   reportType === "Current"
                    //     ? "/current/national"
                    //     : "/historical/national"
                    // );
                    setIsDataOpen(!isDataOpen);
                  }}
                  className="w-full space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] rounded-t-lg"
                >
                  <div className="text-gray-700 text-left overflow-hidden whitespace-nowrap truncate">
                    National
                  </div>{" "}
                </button>
                <button
                  onClick={() => {
                    setGranularityType("State");
                    setIsDataOpen(!isDataOpen);

                    // navigate(
                    //   reportType === "Current"
                    //     ? "/current/state"
                    //     : "/historical/state"
                    // );
                  }}
                  className="w-full space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]"
                >
                  <div className="text-gray-700 text-left overflow-hidden whitespace-nowrap truncate">
                    State
                  </div>
                </button>
                <button
                  onClick={() => {
                    setGranularityType("District");
                    setIsDataOpen(!isDataOpen);

                    // navigate(
                    //   reportType === "Current"
                    //     ? "/current/district"
                    //     : "/historical/district"
                    // );
                  }}
                  className="w-full space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] rounded-b-lg"
                >
                  <div className="text-gray-700 text-left overflow-hidden whitespace-nowrap truncate">
                    District
                  </div>{" "}
                </button>
              </ul>
            )}
          </div>

          {/* Date button */}
          <div className="relative" ref={dateTypeRef}>
            <button
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="flex items-center gap-2 text-white  bg-[#4f67b7] px-3 py-2 rounded-lg text-[12px] hover:bg-gray-700 transition"
            >
              {dateType} <ChevronDown size={16} />
            </button>
            {isDateOpen && (
              <ul className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <button
                  onClick={() => {
                    setDateType("Latest Match");
                    setIsDateOpen(!isDateOpen);
                  }}
                  className="w-full space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] rounded-t-lg"
                >
                  <div className="text-gray-700 text-left overflow-hidden whitespace-nowrap truncate">
                    Latest Match
                  </div>
                </button>
                <button
                  onClick={() => {
                    setDateType("Date Match");
                    setIsDateOpen(!isDateOpen);
                  }}
                  className="w-full space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px] rounded-b-lg"
                >
                  <div className="text-gray-700 text-left overflow-hidden whitespace-nowrap truncate">
                    Date Match
                  </div>
                </button>
              </ul>
            )}
          </div>

          <button
            className="flex items-center gap-2 text-white  px-3 py-2 rounded-lg text-[12px] bg-gray-700 transition hover:bg-white hover:text-[#2884c4]"
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
