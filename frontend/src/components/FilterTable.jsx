import React from "react";

/**
 * Renders a table view for filtered output data (National/State/District).
 * 
 * Props:
 * - filteredData: output from filterDataWithFilters
 * - schemeSectorMapping: { [scheme]: sector }
 * - schemeDepartmentMapping: { [scheme]: department }
 * - type: "national" | "state" | "district"
 */
function FilterTable({ filteredData, schemeSectorMapping = {}, schemeDepartmentMapping = {}, type = "national" }) {
  if (!filteredData || Object.keys(filteredData).length === 0) {
    return <div>No Data Available</div>;
  }

  // For simplicity, show a generic table. You can style as needed.
  return (
    <table border={1} cellPadding={4} cellSpacing={0} style={{ width: "100%", fontSize: "12px" }}>
      <thead>
        <tr>
          <th>Scheme</th>
          <th>Sector</th>
          <th>Department</th>
          <th>KPI</th>
          {type === "state" && <th>State</th>}
          {type === "district" && (
            <>
              <th>State</th>
              <th>District</th>
            </>
          )}
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(filteredData).map(([scheme, kpis]) =>
          Object.entries(kpis).map(([kpi, geoData]) => {
            if (type === "national") {
              // geoData: { "India": { ... } }
              return (
                <tr key={scheme + kpi + "national"}>
                  <td>{scheme}</td>
                  <td>{schemeSectorMapping[scheme]}</td>
                  <td>{schemeDepartmentMapping[scheme]}</td>
                  <td>{kpi}</td>
                  <td>{geoData?.India?.prayasValue ?? "NA"}</td>
                </tr>
              );
            } else if (type === "state") {
              // geoData: { [state]: { ... } }
              return Object.entries(geoData).map(([state, valueObj]) => (
                <tr key={scheme + kpi + state}>
                  <td>{scheme}</td>
                  <td>{schemeSectorMapping[scheme]}</td>
                  <td>{schemeDepartmentMapping[scheme]}</td>
                  <td>{kpi}</td>
                  <td>{state}</td>
                  <td>{valueObj?.prayasValue ?? "NA"}</td>
                </tr>
              ));
            } else if (type === "district") {
              // geoData: { [state]: { [district]: { ... } } }
              return Object.entries(geoData).flatMap(([state, districts]) =>
                Object.entries(districts).map(([district, valueObj]) => (
                  <tr key={scheme + kpi + state + district}>
                    <td>{scheme}</td>
                    <td>{schemeSectorMapping[scheme]}</td>
                    <td>{schemeDepartmentMapping[scheme]}</td>
                    <td>{kpi}</td>
                    <td>{state}</td>
                    <td>{district}</td>
                    <td>{valueObj?.prayasValue ?? "NA"}</td>
                  </tr>
                ))
              );
            }
            return null;
          })
        )}
      </tbody>
    </table>
  );
}

export default FilterTable;