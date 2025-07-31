import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFromLocalStorage } from "../api/api";
import { capitalizeFirst, formatToDDMMYYYY } from "../config/config";
import Loader from "../components/loader";
import { Calendar } from "react-date-range";
import { ToastContainer } from "react-toastify";
const LogReport = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState();
  const [selectedDate, setSelectedDate] = useState(new Date()); // YYYY-MM-DD
  const [showCalendar, setShowCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appliedDate, setAppliedDate] = useState(selectedDate);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const calendarRef = useRef(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/get_scraping_logs`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getFromLocalStorage("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filter_date: formatToDDMMYYYY(appliedDate) }),
        }
      );
      if (response.status === 401) {
        localStorage.clear();
        navigate("/");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchLogs();
  }, [appliedDate]);

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

      // For numbers, sort numerically
      if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
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

  const tableHeaders =
    logs && logs.data && logs.data.length > 0 ? Object.keys(logs.data[0]) : [];

  return (
    <>
      <div className="py-4 font-small">
        {/* <div className="py-8 mt-[23px] font-small" style={{paddingBottom:'100px'}}> */}
        <div className="h-[45px] py-4 bg-[#4059ad] text-white flex items-center justify-center rounded-lg shadow-lg">
          <div className="flex justify-center items-center w-full px-4">
            <h1 className="text-l font-semibold w-full flex">
              Scraping Log Report
            </h1>
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
              {/* <h2
                className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer"
                onClick={() => navigate("/scraping/exception-report")}
              >
                Go to Scraping Exception Report
              </h2>
              <h2
                className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer"
                onClick={() => navigate("/scraping/data-input")}
              >
                Go to Upload Excel
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
                className="absolute z-50 bg-white shadow-lg rounded left-0 "
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
          {isLoading ? (
            <Loader />
          ) : !logs || !logs.data || logs.data.length === 0 ? (
            <div className="py-4 text-gray-500">
              {" "}
              No Scraping Logs Available for{" "}
              <strong>{formatToDDMMYYYY(selectedDate)}</strong>
            </div>
          ) : (
            <table className="min-w-full border border-gray-300 rounded-lg shadow-sm text-[13px]">
              <thead className="bg-[#70a7d8] text-white">
                <tr>
                  <th className="px-3 py-2 border">S. No.</th>
                  {tableHeaders
                    .filter((header) => header !== "KPI_ID")
                    .map((header) => (
                      <th
                        key={header}
                        className={`px-3 py-2 border ${
                          header === "KPI_Name" || header === "Scheme_Name"
                            ? "cursor-pointer"
                            : ""
                        }`}
                        onClick={
                          header === "KPI_Name" || header === "Scheme_Name"
                            ? () => handleSort(header)
                            : undefined
                        }
                      >
                        {header}
                        <span className="pl-[10px]">
                          {header === "KPI_Name" || header === "Scheme_Name"
                            ? sortConfig.key === header
                              ? sortConfig.direction === "asc"
                                ? "▲"
                                : "▼"
                              : "⇅"
                            : ""}
                        </span>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {getSortedData(logs.data).map((row, idx) => (
                  <tr key={idx} className="even:bg-gray-50">
                    <td className="px-3 py-2 border">{idx + 1}</td>
                    {tableHeaders
                      .filter((header) => header !== "KPI_ID")
                      .map((header) => {
                        let cellBg = "";
                        if (
                          [
                            "National_Status",
                            "State_Status",
                            "District_Status",
                          ].includes(header)
                        ) {
                          if (row[header] === "success")
                            cellBg = "bg-green-200 text-green-800";
                          else if (row[header] === "fail")
                            cellBg = "bg-red-200 text-red-800";
                          else if (row[header] === "NA")
                            cellBg = "bg-gray-200 text-gray-700";
                        }
                        return (
                          <td
                            key={header}
                            className={`px-3 py-2 border ${cellBg} ${
                              header === "Status"
                                ? `font-semibold text-white ${
                                    row[header] === "success"
                                      ? "bg-green-500"
                                      : row[header] === "fail"
                                      ? "bg-red-500"
                                      : row[header] === "partial success"
                                      ? "bg-yellow-500"
                                      : ""
                                  }`
                                : ""
                            }`}
                          >
                            {header === "Log_Date"
                              ? formatToDDMMYYYY(row[header])
                              : capitalizeFirst(row[header])}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <ToastContainer />
    </>
  );
};

export default LogReport;
