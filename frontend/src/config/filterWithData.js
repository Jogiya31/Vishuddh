/**
 * Deep filter the output data based on selected filters, including scheme-sector and scheme-department mappings.
 * 
 * @param {Object} outputData - { [scheme]: { [kpi]: ... } }
 * @param {Object} filters - The selected filters from the filter component
 * @param {Object} options - { type: "national" | "state" | "district", schemeSectorMapping, schemeDepartmentMapping }
 * @returns {Object} filtered outputData
 */
export function filterDataWithFilters(outputData, filters, options = {}) {
  if (!outputData || typeof outputData !== "object" || Object.keys(outputData).length === 0) return {};

  const {
    selectedSectors = [],
    selectedDepartments = [],
    selectedSchemes = [],
    selectedKPIs = [],
    selectedStates = [],
    selectedDistricts = [],
  } = filters || {};

  const {
    type = "national", // "national" | "state" | "district"
    schemeSectorMapping = {},
    schemeDepartmentMapping = {},
  } = options;

  function shouldInclude(val, selectedArr) {
    return selectedArr.length === 0 || selectedArr.includes(val);
  }

  let filteredData = {};
  for (const schemeKey of Object.keys(outputData)) {
    // Filter by scheme name
    if (!shouldInclude(schemeKey, selectedSchemes)) continue;

    // Filter by sector mapping
    const schemeSector = schemeSectorMapping[schemeKey];
    if (schemeSector && !shouldInclude(schemeSector, selectedSectors)) continue;

    // Filter by department mapping
    const schemeDepartment = schemeDepartmentMapping[schemeKey];
    if (schemeDepartment && !shouldInclude(schemeDepartment, selectedDepartments)) continue;

    filteredData[schemeKey] = {};

    for (const kpiKey of Object.keys(outputData[schemeKey])) {
      if (!shouldInclude(kpiKey, selectedKPIs)) continue;

      // NATIONAL LEVEL
      if (type === "national") {
        filteredData[schemeKey][kpiKey] = outputData[schemeKey][kpiKey];
      }
      // STATE LEVEL
      else if (type === "state") {
        filteredData[schemeKey][kpiKey] = {};
        for (const stateKey of Object.keys(outputData[schemeKey][kpiKey])) {
          if (!shouldInclude(stateKey, selectedStates.map(s => s.state_name))) continue;
          filteredData[schemeKey][kpiKey][stateKey] = outputData[schemeKey][kpiKey][stateKey];
        }
        if (Object.keys(filteredData[schemeKey][kpiKey]).length === 0) delete filteredData[schemeKey][kpiKey];
      }
      // DISTRICT LEVEL
      else if (type === "district") {
        filteredData[schemeKey][kpiKey] = {};
        for (const stateKey of Object.keys(outputData[schemeKey][kpiKey])) {
          if (!shouldInclude(stateKey, selectedStates.map(s => s.state_name))) continue;
          filteredData[schemeKey][kpiKey][stateKey] = {};
          for (const districtKey of Object.keys(outputData[schemeKey][kpiKey][stateKey])) {
            if (!shouldInclude(districtKey, selectedDistricts.map(d => d.district_name))) continue;
            filteredData[schemeKey][kpiKey][stateKey][districtKey] = outputData[schemeKey][kpiKey][stateKey][districtKey];
          }
          if (Object.keys(filteredData[schemeKey][kpiKey][stateKey]).length === 0) delete filteredData[schemeKey][kpiKey][stateKey];
        }
        if (Object.keys(filteredData[schemeKey][kpiKey]).length === 0) delete filteredData[schemeKey][kpiKey];
      }
      // fallback: just copy
      else {
        filteredData[schemeKey][kpiKey] = outputData[schemeKey][kpiKey];
      }
    }
    if (Object.keys(filteredData[schemeKey]).length === 0) delete filteredData[schemeKey];
  }
  return filteredData;
}