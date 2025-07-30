import { useEffect, useRef, useState } from "react";
import mappingJSON from "../data/sorted_scheme_kpi_granularity_mapping.json";
import { capitalizeFirst } from "../config/config";
// import { getFromLocalStorage } from "../api/api"; // <-- if you need auth like LogReport
import { useNavigate } from "react-router-dom";
import { getFromLocalStorage } from "../api/api";
import { toast } from "react-toastify";
import Loader from "../components/loader";
import LogStreamer from "./logStream";

const ManualScraping = () => {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL;

  const schemeDropdownRef = useRef(null);
  const kpiDropdownRef = useRef(null);
  const levelDropdownRef = useRef(null);

  const [schemes, setSchemes] = useState([]);
  const [filteredSchemes, setFilteredSchemes] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [filteredKpis, setFilteredKpis] = useState([]);
  const [levels, setLevels] = useState([]);
  const [showLogStream, setShowLogStream] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);

  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
  const [kpiDropdownOpen, setKpiDropdownOpen] = useState(false);
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);

  const [schemeSearch, setSchemeSearch] = useState("");
  const [kpiSearch, setKpiSearch] = useState("");

  // run-scraper states
  const [isRunning, setIsRunning] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  // Load schemes from JSON
  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/get-scheme-scrap-mapping`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getFromLocalStorage("token")}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch schemes");
        }

        const data = await response.json();

        // Convert object keys to array
        const schemeNames = Array.isArray(data) ? data : Object.keys(data);

        setSchemes(schemeNames);
        setFilteredSchemes(schemeNames);
      } catch (err) {
        console.error("Error fetching schemes:", err);
      }
    };

    fetchSchemes();
  }, []);

  // Filter Schemes on search
  useEffect(() => {
    setFilteredSchemes(
      schemeSearch
        ? schemes.filter((s) =>
            s.toLowerCase().includes(schemeSearch.toLowerCase())
          )
        : schemes
    );
  }, [schemeSearch, schemes]);

  // Filter KPIs on search
  useEffect(() => {
    setFilteredKpis(
      kpiSearch
        ? kpis.filter((k) => k.toLowerCase().includes(kpiSearch.toLowerCase()))
        : kpis
    );
  }, [kpiSearch, kpis]);

  // Handle Scheme selection
  const handleSchemeSelect = (scheme) => {
    setSelectedScheme(scheme);
    const schemeKpis = Object.keys(mappingJSON[scheme] || {});
    setKpis(schemeKpis);
    setFilteredKpis(schemeKpis);
    setSelectedKpi(null);
    setLevels([]);
    setSelectedLevel(null);
    setSchemeDropdownOpen(false);
  };

  // Handle KPI selection
  const handleKpiSelect = (kpi) => {
    setSelectedKpi(kpi);
    const granularityLevels = Object.keys(
      mappingJSON[selectedScheme][kpi] || {}
    );
    setLevels(granularityLevels);
    setSelectedLevel(null);
    setKpiDropdownOpen(false);
  };

  // Handle Level selection
  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    setLevelDropdownOpen(false);
  };

  // Button logic: enabled if all selected, disabled if running/streaming
  const canRun =
    !!selectedScheme && !!selectedKpi && !!selectedLevel && !isDisabled;

  const runScraper = async () => {
    try {
      setIsRunning(true);
      setIsDisabled(true); // Disable button when starting stream
      const filename =
        mappingJSON[selectedScheme]?.[selectedKpi]?.[selectedLevel];

      if (!filename) {
        toast.error("Filename not found for this selection.");
        setIsRunning(false);
        setIsDisabled(false);
        return;
      }

      const response = await fetch(`${API_BASE}/run-scraper`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getFromLocalStorage("token")}`,
        },
        body: JSON.stringify(filename),
      });

      if (!response.ok) {
        const text = await response.text();
        toast.error(text || "Request failed");
        setIsRunning(false);
        setIsDisabled(false);
        return;
      }

      const resJson = await response.json();
      setShowLogStream(true);

      if (resJson?.message) toast.success(resJson.message);
    } catch (e) {
      toast.error(e.message || "Unknown error");
    } finally {
      setIsRunning(false);
      // Don't setIsDisabled(false) here: LogStreamer will handle it when stream ends
    }
  };

  const downloadLogs = async () => {
    const filename =
      mappingJSON[selectedScheme]?.[selectedKpi]?.[selectedLevel];

    if (!filename) {
      toast.error("Filename not found for this selection.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/download-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getFromLocalStorage("token")}`,
        },
        body: JSON.stringify(filename), // Send as object
      });

      if (!response.ok) {
        const text = await response.text();
        toast.error(text || "Failed to download log");
        return;
      }

      // Get response as a blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename.file_name}.log`; // Force .log extension
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Log file downloaded successfully.");
    } catch (e) {
      toast.error(e.message || "Unknown error during log download.");
    }
  };

  return (
    <div
      className="py-8 mt-[25px] font-small"
      style={{ paddingBottom: "70px" }}
    >
      <div className="h-[45px] py-4 bg-[#4059ad] text-white flex items-center justify-center rounded-lg shadow-lg">
        <div className="flex justify-center items-center w-full px-4">
          <h1 className="text-l font-semibold w-full flex">Manual Scraping</h1>

          <div className="w-full flex justify-end gap-2">
            <h2
              className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer"
              onClick={() => {
                navigate("/current/national");
                localStorage.setItem("refresh", "true");
              }}
            >
              Go to Report
            </h2>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap px-4 py-3 gap-4 items-center justify-between">
        <div className="flex flex-wrap py-3 gap-4 items-center w-full justify-between">
          <div className="flex flex-wrap py-3 gap-4 items-center">
            {/* Scheme Dropdown */}

            <div className="relative" ref={schemeDropdownRef}>
              <button
                onClick={() => setSchemeDropdownOpen(!schemeDropdownOpen)}
                className="text-[12px] px-4 py-2 rounded-2xl w-60 bg-[#70a7d8] text-white"
              >
                {selectedScheme || "Select Scheme"}
              </button>
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
                        onClick={() => handleSchemeSelect(scheme)}
                      >
                        <span className="text-gray-700 truncate">{scheme}</span>
                      </label>
                    ))}
                    {filteredSchemes.length === 0 && (
                      <div className="p-2 text-gray-400 text-sm">
                        No schemes found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* KPI Dropdown */}
            <div className="relative" ref={kpiDropdownRef}>
              <button
                onClick={() =>
                  selectedScheme && setKpiDropdownOpen(!kpiDropdownOpen)
                }
                className={`text-[12px] px-4 py-2 rounded-2xl w-60 ${
                  selectedScheme
                    ? "bg-[#70a7d8] text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                disabled={!selectedScheme}
              >
                {selectedKpi || "Select KPI"}
              </button>
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
                        onClick={() => handleKpiSelect(kpi)}
                      >
                        <span className="text-gray-700 truncate">{kpi}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Level Dropdown */}
            <div className="relative" ref={levelDropdownRef}>
              <button
                onClick={() =>
                  selectedKpi && setLevelDropdownOpen(!levelDropdownOpen)
                }
                className={`text-[12px] px-4 py-2 rounded-2xl w-40 min-w-40 ${
                  selectedKpi
                    ? "bg-[#70a7d8] text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                disabled={!selectedKpi}
              >
                {selectedLevel || "Select Granularity"}
              </button>
              {levelDropdownOpen && selectedKpi && (
                <div className="absolute mt-1 w-full min-w-40 bg-white border border-gray-300 rounded-lg shadow-md z-50">
                  {levels.map((level) => (
                    <div
                      key={level}
                      className={`p-2 hover:bg-gray-100 cursor-pointer text-[12px] ${
                        selectedLevel === level
                          ? "font-bold text-[#70a7d8]"
                          : "text-gray-700"
                      }`}
                      onClick={() => handleLevelSelect(level)}
                    >
                      {capitalizeFirst(level)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run Scraper Button */}
            <button
              onClick={runScraper}
              disabled={!canRun}
              className={`text-[12px] px-4 py-2 rounded-2xl min-w-32 ${
                canRun
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isRunning || isDisabled ? "Running..." : "Run Scraper"}
            </button>
          </div>
          <button
            onClick={downloadLogs}
            disabled={!selectedScheme && !selectedKpi && !selectedLevel}
            className={`text-[12px] px-4 py-2 rounded-2xl min-w-32 ${
              !!selectedScheme && !!selectedKpi && !!selectedLevel
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Download Logs
          </button>
        </div>
      </div>
      {isRunning && <Loader />}
      {showLogStream && !isRunning && (
          <LogStreamer
            logFile={
              mappingJSON[selectedScheme]?.[selectedKpi]?.[selectedLevel]
            }
            setIsDisabled={setIsDisabled}
          />
      )}
    </div>
  );
};

export default ManualScraping;