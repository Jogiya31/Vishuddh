import { useEffect, useState } from "react";
import { capitalizeFirst, formatToDDMMYYYY } from "../config/config.js";
const TableComponent = ({ rows }) => {
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortedRows, setSortedRows] = useState(rows);
  // const [stateNameSortOrder, setStateNameSortOrder] = useState("asc");
  const hasRows = Array.isArray(rows) && rows.length > 0;
  const fixedHeaders = ["KPI Name", "Scheme Name"];
  const columns = hasRows
    ? ["s_no", ...Object.keys(rows[0]).filter(
      (col) => col.toLowerCase() !== "kpi_id" && col.toLowerCase() !== "state_id"
    )]
    : ["S. No.", ...fixedHeaders];

  useEffect(() => {
    setSortedRows(rows);
  }, [rows]);

  const handleSortAbsDiff = () => {
    if (!hasRows) return;
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    const sorted = [...rows].sort((a, b) => {
      const aVal = Number(a["abs_diff"]);
      const bVal = Number(b["abs_diff"]);
      if (isNaN(aVal) || isNaN(bVal)) return 0;
      return newOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    setSortedRows(sorted);
    setSortOrder(newOrder);
  };

const handleSortStateName = () => {
  if (!hasRows) return;
  const newOrder = sortOrder === "desc" ? "asc" : "desc";
  const sorted = [...rows].sort((a, b) => {
    const aVal = a["state_name"] ? a["state_name"].toLowerCase() : "";
    const bVal = b["state_name"] ? b["state_name"].toLowerCase() : "";
    if (aVal < bVal) return newOrder === "desc" ? -1 : 1;
    if (aVal > bVal) return newOrder === "desc" ? 1 : -1;
    return 0;
  });
  setSortedRows(sorted);
  setSortOrder(newOrder);
};
  return (
    <div className="px-4 py-3">
      <div className="min-w-full overflow-x-auto rounded-xl border border-[#dee0e3] bg-white">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="min-w-full text-sm text-[#131416]">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-center font-medium">
                {columns.map((col, index) => (
                  <th key={index} className="px-4 py-3 min-w-[50px] max-w-[500px]capitalize">
                    {col === "s_no" || col === "S. No."
                      ? "S. No."
                      : hasRows
                        ? (
                          <>
                            {capitalizeFirst(col.replace(/_/g, " "))}
                            {col === "abs_diff" && (
                              <button
                                className="ml-2 text-xs text-blue-600 border border-blue-600 rounded px-1 py-0.5"
                                onClick={handleSortAbsDiff}
                              >
                                ⇅
                              </button>
                            )}
                              {col === "state_name" && (
                              <button
                                className="ml-2 text-xs text-blue-600 border border-green-600 rounded px-1 py-0.5"
                                onClick={handleSortStateName}
                              >
                                ⇅
                              </button>
                              )}
                          </>
                        )
                        : capitalizeFirst(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasRows ? (
                (sortedRows || []).map((row, idx) => (
                  <tr key={idx} className="text-center border-t border-[#dee0e3]">
                    {columns.map((col) => {
                      if (col === "s_no" || col === "S. No.") {
                        return (
                          <td key={col} className="px-4 py-2 min-w-[50px] max-w-[500px]">
                            {idx + 1}
                          </td>
                        );
                      }
                      const value = row[col];
                      let displayValue = value;
                      if (
                        typeof value === "string" &&
                        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)
                      ) {
                        displayValue = formatToDDMMYYYY(value);
                      }
                      return (
                        <td key={col} className="px-4 py-2 min-w-[50px] max-w-[500px]">
                          {capitalizeFirst(displayValue)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center text-[#6b7580] text-base py-6"
                  >
                    No anomalies detected in the data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TableComponent;
