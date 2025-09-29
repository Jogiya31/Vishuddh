import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFetchScrapingReportQuery } from "../api/api";
import { formatToDDMMYYYY } from "../config/config";
import { Calendar } from "react-date-range";
import Loader from "../components/loader";

const ScrapingExtraction = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [appliedDate, setAppliedDate] = useState(selectedDate);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const calendarRef = useRef(null);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;
    const sorted = [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // For Difference, sort numerically
      if (sortConfig.key === "Difference") {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else {
        // For strings, case-insensitive
        aValue = aValue?.toString().toLowerCase();
        bValue = bValue?.toString().toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  const {
    data: scrapingData,
    error: scrapingDataError,
    isLoading: isScrapingLoading,
  } = useFetchScrapingReportQuery({ selectedDate: appliedDate });

  return (
    <div className="py-3 font-small" >
      <div className="h-[45px] py-4 bg-[#4059ad] text-white flex items-center justify-center rounded-lg shadow-lg">
        <div className="flex justify-center items-center w-full px-4">
          <h1 className="text-l font-semibold w-full flex">
            Scraping Exception Report
          </h1>

          <div className="w-full flex justify-end gap-2">
            <h2
              className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer"
              onClick={() => {navigate("/current/national");
                 localStorage.setItem('refresh', 'true');
              }}
            >
              Go to Report
            </h2>
            {/* <h2
              className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer"
              onClick={() => navigate("/log-report")}
            >
              Go to Scraping Logs
            </h2>
            <h2
              className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer"
              onClick={() => navigate("/scraping/data-input")}
            >
              Go to Data Upload
            </h2> */}
          </div>
        </div>
      </div>
      {/* Date Filter */}
      <div className="p-2 w-full flex items-center justify-start">
        <div className="relative inline-block  w-full">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="min-w-[230px] flex items-center justify-center rounded-2xl bg-[#70a7d8] text-white shadow-md text-[12px] px-3 py-[0.5rem] text-center"
          >
            {formatToDDMMYYYY(selectedDate)}
          </button>

          {showCalendar && (
            <div
              ref={calendarRef}
              className="absolute z-20 bg-white shadow-lg rounded left-0 "
            >
              <Calendar
                date={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                minDate={new Date(2020, 0, 1)} // Jan 1, 2020
                maxDate={new Date()} // Jan 1, 2020
              />
              <div className="flex justify-end m-2 gap-1">
                <button
                  onClick={() => {
                    setShowCalendar(false);
                    setAppliedDate(selectedDate);
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
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded-lg shadow-sm text-[13px]">
          <thead className="bg-[#70a7d8] text-white">
            <tr>
              <th className="px-3 py-2 border">S. No.</th>
              <th
                className="px-3 py-2 border cursor-pointer"
                onClick={() => handleSort("State Name")}
              >
                State Name
                <span className="px-2">
                  {sortConfig.key === "State Name"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "⇅"}
                </span>
              </th>{" "}
              <th
                className="px-3 py-2 border cursor-pointer"
                onClick={() => handleSort("Scheme Name")}
              >
                Scheme Name
                <span className="px-2">
                  {sortConfig.key === "Scheme Name"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "⇅"}
                </span>
              </th>{" "}
              <th className="px-3 py-2 border">KPI Name</th>
              <th className="px-3 py-2 border">State Value</th>
              <th className="px-3 py-2 border">Sum Of Districts</th>
              <th
                className="px-3 py-2 border cursor-pointer"
                onClick={() => handleSort("Difference")}
              >
                Difference
                <span className="px-2">
                  {sortConfig.key === "Difference"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "⇅"}
                </span>
              </th>{" "}
              <th className="px-3 py-2 border">Status</th>
              <th className="px-3 py-2 border">Scrapped Date</th>
            </tr>
          </thead>
          <tbody>
            {isScrapingLoading ? (
              <Loader />
            ) : scrapingDataError ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-red-500">
                  Error loading data.
                </td>
              </tr>
            ) : !scrapingData ||
              !scrapingData.data ||
              scrapingData.data.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-500">
                  No Scraping Exception Report Available for{" "}
                  <strong>{formatToDDMMYYYY(appliedDate)}</strong>
                </td>
              </tr>
            ) : (
              getSortedData(scrapingData.data).map((row, idx) => (
                <tr key={idx} className="even:bg-gray-50">
                  <td className="px-3 py-2 border">{idx + 1}</td>
                  <td className="px-3 py-2 border">{row["State Name"]}</td>
                  <td className="px-3 py-2 border">{row["Scheme Name"]}</td>
                  <td className="px-3 py-2 border">{row["KPI Name"]}</td>
                  <td className="px-3 py-2 border">{row["State Value"]}</td>
                  <td className="px-3 py-2 border">
                    {row["Sum of Districts"]}
                  </td>
                  <td className="px-3 py-2 border">{row["Difference"]}</td>
                  <td
                    className={`px-3 py-2 border font-semibold text-white ${
                      row.Status === "Match"
                        ? "bg-green-500"
                        : row.Status === "Mismatch"
                        ? "bg-red-500"
                        : ""
                    }`}
                  >
                    {row.Status}
                  </td>
                  <td className="px-3 py-2 border">
                    {formatToDDMMYYYY(row["Scrapped Date"])}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScrapingExtraction;
