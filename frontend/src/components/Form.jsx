import React, { useState, useEffect, useMemo, useRef } from "react";
const Form = ({
  departments,
  departmentMapping,
  sectors,
  outputdata,
  mappingData,
  schemeDepartmentMapping,
  states,
  schemeSectorMapping,
  onUpdateState,
  onUpdatedOutputData,
  state,
  onUpdateDistrict,
  district,
  districts,
  stateDistrictArray,
  onUpdateUnit
}) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sectorDropdownRef.current &&
        !sectorDropdownRef.current.contains(event.target) &&
        departmentDropdownRef.current &&
        !departmentDropdownRef.current.contains(event.target) &&
        schemeDropdownRef.current &&
        !schemeDropdownRef.current.contains(event.target) &&
        kpiDropdownRef.current &&
        !kpiDropdownRef.current.contains(event.target)
      ) {
        setSectorDropdownOpen(false);
        setDepartmentDropdownOpen(false);
        setSchemeDropdownOpen(false);
        setKpiDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const sectorDropdownRef = useRef(null);
  const districtDropdownRef = useRef(null);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  const [filteredDepartments, setFilteredDepartments] = useState(departments);
  const [filteredSectors, setFilteredSectors] = useState(departments);
  const departmentDropdownRef = useRef(null);
  const schemeDropdownRef = useRef(null);
  const kpiDropdownRef = useRef(null);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [selectedStates, setSelectedStates] = useState([]);
  const [sectorSearch, setSectorSearch] = useState("");
  const [selectedSchemes, setSelectedSchemes] = useState([]);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const stateDropdownRef = useRef(null);
  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
  const [kpiDropdownOpen, setKpiDropdownOpen] = useState(false);
  const [selectedKPIs, setSelectedKPIs] = useState([]);
  const [schemeSearch, setSchemeSearch] = useState("");
  const [kpiSearch, setKpiSearch] = useState("");
  const [filteredSchemes, setFilteredSchemes] = useState();
  const [filteredDistricts, setFilteredDistricts] = useState(districts);
  const [filteredStates, setFilteredStates] = useState(states);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  useMemo(() => {
    const filteredSectors = sectors.filter((sector) =>
      sector.toLowerCase().includes(sectorSearch.toLowerCase())
    );
    setFilteredSectors(filteredSectors);
  }, [sectorSearch]);
  useMemo(() => {
    const totalSchemes = Object.keys(mappingData).filter((scheme) =>
      scheme.toLowerCase().includes(schemeSearch.toLowerCase())
    );
    setFilteredSchemes(totalSchemes);
    // setSchemes(totalSchemes);
  }, [schemeSearch]);
  useMemo(() => {
    const totalDepartments = departments.filter((department) =>
      department.toLowerCase().includes(departmentSearch.toLowerCase())
    );
    setFilteredDepartments(Array.from(new Set(totalDepartments)));
  }, [departmentSearch]);
  if (state) {
    useMemo(() => {
      const totalStates = states.filter((state) =>
        state["state_name"].toLowerCase().includes(stateSearch.toLowerCase())
      );
      setFilteredStates(totalStates);
    }, [stateSearch]);
  }
  if (district) {
    useMemo(() => {
      const totalDistricts = districts.filter((district) =>
        district["district_name"]
          .toLowerCase()
          .includes(districtSearch.toLowerCase())
      );
      setFilteredDistricts(totalDistricts);
    }, [districtSearch]);
  }
  // Get dynamic KPI options based on selected schemes
  const kpiOptions = selectedSchemes.flatMap((scheme) => {
    return mappingData[scheme].map((kpi) => {
      return kpi['KPI Name'] || "";
    });
  });
  
  // Filter KPIs based on search input
  const filteredKPIs = kpiOptions.filter((kpi) =>
 {
   return(kpi.toLowerCase()).includes(kpiSearch.toLowerCase())
    
 }
  );
  // Function to toggle department selection
  const toggleState = (state) => {
    setSelectedStates((prevSelectedStates) => {
      // Toggle the state in the list of selected states
      const updatedStates = prevSelectedStates.includes(state)
        ? prevSelectedStates.filter((item) => item !== state)
        : [...prevSelectedStates, state];

      const stateNames = updatedStates.map((item) => item.state_name);
      // Filter outputdata based on the selected states
      if (updatedStates.length > 0) {
        const filteredData = Object.keys(outputdata).reduce(
          (result, missionKey) => {
            // Check each mission's categories and states
            const missionData = outputdata[missionKey];

            Object.keys(missionData).forEach((categoryKey) => {
              const categoryData = missionData[categoryKey];

              // Filter out the states that are in the updatedStates list
              const filteredStates = Object.keys(categoryData).reduce(
                (statesResult, stateKey) => {
                  if (stateNames.includes(stateKey)) {
                    statesResult[stateKey] = categoryData[stateKey];
                  }
                  return statesResult;
                },
                {}
              );

              // If any states match, add this category to the result
              if (Object.keys(filteredStates).length > 0) {
                if (!result[missionKey]) {
                  result[missionKey] = {};
                }
                result[missionKey][categoryKey] = filteredStates;
              }
            });

            return result;
          },
          {}
        );

        // Call the function to update output data with the filtered data
        onUpdatedOutputData(filteredData);
        onUpdateState(updatedStates);
      } else {
        // If no states are selected, clear the filtered data (or reset to original data)
        onUpdatedOutputData(outputdata);
        onUpdateState(states);
      }

      return updatedStates;
    });
  };
  const toggleUnits = (unit) => {
  localStorage.clear();
   onUpdateUnit(unit)
  };
  const toggleDistrict = (district) => {
    setSelectedDistricts((prevSelectedDistricts) => {
      // Toggle the district in the list of selected districts
      const updatedDistricts = prevSelectedDistricts.includes(district)
        ? prevSelectedDistricts.filter((item) => item !== district)
        : [...prevSelectedDistricts, district];
      const districtNames = updatedDistricts.map((item) => item.district_name);

      // Filter outputData based on the selected districts
      if (updatedDistricts.length > 0) {
        const filteredData = Object.keys(outputdata).reduce(
          (result, missionKey) => {
            const missionData = outputdata[missionKey];

            Object.keys(missionData).forEach((categoryKey) => {
              const categoryData = missionData[categoryKey];

              // Initialize the statesResult for each category
              const statesResult = {};

              // Filter out the states and districts that are in the updatedDistricts list
              Object.keys(categoryData).forEach((stateKey) => {
                const filteredDistricts = Object.keys(
                  categoryData[stateKey]
                ).reduce((districtsResult, districtKey) => {
                  // Check if the district is selected
                  if (districtNames.includes(districtKey)) {
                    districtsResult[districtKey] =
                      categoryData[stateKey][districtKey];
                  }
                  return districtsResult;
                }, {});

                // If any districts match, add this state and districts to the result
                if (Object.keys(filteredDistricts).length > 0) {
                  statesResult[stateKey] = filteredDistricts;
                }
              });

              // If any states and districts match, add this category to the result
              if (Object.keys(statesResult).length > 0) {
                if (!result[missionKey]) {
                  result[missionKey] = {};
                }
                result[missionKey][categoryKey] = statesResult;
              }
            });

            return result;
          },
          {}
        );

        // Call the function to update output data with the filtered data
        onUpdateDistrict(updatedDistricts);
       
      } else {
        // If no districts are selected, clear the filtered data (or reset to original data)
        onUpdateDistrict(districts); // Assuming `districts` is the list of all districts
       
      }

      return updatedDistricts;
    });
  };

  const toggleStateDistrict = (state) => {
    setSelectedStates((prevSelectedStates) => {
      // Toggle the state in the list of selected states
      const updatedStates = prevSelectedStates.includes(state)
        ? prevSelectedStates.filter((item) => item !== state)
        : [...prevSelectedStates, state];

      const stateNames = updatedStates.map((item) => item.state_name);
      // Filter outputdata based on the selected states
      if (updatedStates.length > 0) {
        const filteredData = Object.keys(outputdata).reduce(
          (result, missionKey) => {
            // Check each mission's categories and states
            const missionData = outputdata[missionKey];

            Object.keys(missionData).forEach((categoryKey) => {
              const categoryData = missionData[categoryKey];

              // Filter out the states that are in the updatedStates list
              const filteredStates = Object.keys(categoryData).reduce(
                (statesResult, stateKey) => {
                  if (stateNames.includes(stateKey)) {
                    statesResult[stateKey] = categoryData[stateKey];
                  }
                  return statesResult;
                },
                {}
              );

              // If any states match, add this category to the result
              if (Object.keys(filteredStates).length > 0) {
                if (!result[missionKey]) {
                  result[missionKey] = {};
                }
                result[missionKey][categoryKey] = filteredStates;
              }
            });

            return result;
          },
          {}
        );
        let updatedDistricts = [];
        if (district) {
          if (updatedStates.length > 0) {
            Object.keys(stateDistrictArray).map((state) => {
              if (stateNames.includes(state)) {
                updatedDistricts.push(
                  ...stateDistrictArray[state]["districts"]
                );
              }
            });
          }
        }
        // Call the function to update output data with the filtered data
        if (district) {
          setFilteredDistricts(updatedDistricts);
        }
        onUpdatedOutputData(filteredData);
        onUpdateState(updatedStates);
      } else {
        // If no states are selected, clear the filtered data (or reset to original data)
        if (district) {
          setFilteredDistricts(districts);
        }
        onUpdatedOutputData(outputdata);
        onUpdateState(states);
      }

      return updatedStates;
    });
  };
  // Function to toggle department selection
  const toggleDepartment = (department) => {
    setSelectedDepartments((prevSelectedDepartments) => {
      const updatedDepartments = prevSelectedDepartments.includes(department)
        ? prevSelectedDepartments.filter((item) => item !== department)
        : [...prevSelectedDepartments, department];

      // Update selected schemes based on department mapping
      const updatedSchemes = [];
      if (updatedDepartments.length > 0) {
        Object.keys(schemeDepartmentMapping).map((scheme) => {
          if (updatedDepartments.includes(schemeDepartmentMapping[scheme])) {
            // Add schemes for this department
            updatedSchemes.push(scheme);
          }
        });
        // Set the updated schemes (you can update a state for selected schemes)
        setFilteredSchemes(updatedSchemes);
        // If schemes have been updated, filter output data based on these schemes
        if (updatedSchemes.length > 0) {
          const filteredData = Object.keys(outputdata).reduce(
            (result, schemeKey) => {
              // Include only the schemes that are in the updatedSchemes list
              if (updatedSchemes.includes(schemeKey)) {
                result[schemeKey] = outputdata[schemeKey];
              }
              return result;
            },
            {}
          );

        }
      } else {
     
        setFilteredSchemes([]);
      }

      return updatedDepartments;
    });
  };
  // Function to toggle sector selection
  const toggleSector = (sector) => {
    setSelectedSectors((prevSelectedSectors) => {
      const updatedSectors = prevSelectedSectors.includes(sector)
        ? prevSelectedSectors.filter((item) => item !== sector)
        : [...prevSelectedSectors, sector];

      // Update filteredDepartments based on the selected sectors
      let updatedFilteredDepartments = [];

      if (updatedSectors.length > 0) {
        // Loop through the departmentMapping to filter departments based on selected sectors
        Object.keys(departmentMapping).forEach((sectorMapping) => {
          Object.keys(departmentMapping[sectorMapping]).forEach((sectorKey) => {
            if (updatedSectors.includes(sectorKey)) {
              // If the sector is selected, collect the departments
              Object.keys(departmentMapping[sectorMapping][sectorKey]).forEach(
                (ministerKey) => {
                  Object.keys(
                    departmentMapping[sectorMapping][sectorKey][ministerKey]
                  ).forEach((departmentKey) => {
                    updatedFilteredDepartments.push(departmentKey);
                  });
                }
              );
            }
          });
        });

        // Remove duplicates
        updatedFilteredDepartments = Array.from(
          new Set(updatedFilteredDepartments)
        );
      } else {
        // If no sectors are selected, display all departments
        updatedFilteredDepartments = Array.from(new Set(departments));
      }

      // Set filtered departments
      setFilteredDepartments(updatedFilteredDepartments);

      // Now filter schemes based on the selected departments
      const updatedSchemes = [];

      Object.keys(schemeDepartmentMapping).forEach((scheme) => {
        if (
          updatedFilteredDepartments.includes(schemeDepartmentMapping[scheme])
        ) {
          updatedSchemes.push(scheme);
        }
      });

      // If schemes have been updated, filter output data based on these schemes
      if (updatedSchemes.length > 0) {
        const filteredData = Object.keys(outputdata).reduce(
          (result, schemeKey) => {
            // Include only the schemes that are in the updatedSchemes list
            if (updatedSchemes.includes(schemeKey)) {
              result[schemeKey] = outputdata[schemeKey];
            }
            return result;
          },
          {}
        );

        // Call the function to update output data with the filtered data
        onUpdatedOutputData(filteredData);
      }

      return updatedSectors;
    });
  };

  // Function to toggle scheme selection
  const toggleScheme = (scheme) => {
    setSelectedSchemes((prev) => {
      const updatedSchemes = prev.includes(scheme)
        ? prev.filter((item) => item !== scheme)
        : [...prev, scheme];

      return updatedSchemes;
    });
  };
  // Function to toggle KPI selection
  const toggleKPI = (kpi) => {
    setSelectedKPIs((prev) => {
      const updatedKpis = prev.includes(kpi)
        ? prev.filter((item) => item !== kpi)
        : [...prev, kpi];

      
      return updatedKpis;
    });
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sectorDropdownRef.current &&
        !sectorDropdownRef.current.contains(event.target) &&
        departmentDropdownRef.current &&
        !departmentDropdownRef.current.contains(event.target) &&
        schemeDropdownRef.current &&
        !schemeDropdownRef.current.contains(event.target) &&
        kpiDropdownRef.current &&
        !kpiDropdownRef.current.contains(event.target)
      ) {
        setSectorDropdownOpen(false);
        setDepartmentDropdownOpen(false);
        setSchemeDropdownOpen(false);
        setKpiDropdownOpen(false);
      }
      if (state) {
        if (
          stateDropdownRef.current &&
          !stateDropdownRef.current.contains(event.target)
        ) {
          setStateDropdownOpen(false);
        }
      }
      if (district) {
        if (
          districtDropdownRef.current &&
          !districtDropdownRef.current.contains(event.target)
        ) {
          setDistrictDropdownOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter schemes based on search input
  useMemo(() => {
    const filteredSchemes = Object.keys(mappingData).filter((scheme) =>
      scheme.toLowerCase().includes(schemeSearch.toLowerCase())
    );
    setFilteredSchemes(filteredSchemes);
  }, [schemeSearch]);

  return (
    <div className="flex w-full bg-[#f8f9f9] mt-1  py-1 rounded-lg ">
      <div className="w-full grid grid-col2s-1 gap-2 md:grid-cols-6 ">
        {/* Sector Filter */}
       
         
        {/* State Filter */}
        {state ? (
          <div className="w-full p-2">
            <div className="relative" ref={stateDropdownRef}>
              <button
                onClick={() => setStateDropdownOpen(!stateDropdownOpen)} // Toggle Department Dropdown
                className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
              >
                {selectedStates.length > 0
                  ? selectedStates.length + " selected"
                  : "Select State"}
              </button>

              {stateDropdownOpen && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-10">
                  <input
                    type="text"
                    placeholder="Search States..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)} // Handle Search Change
                    className="w-full p-2 border-b border-gray-300 focus:outline-none"
                  />
                  <div className="max-h-40 overflow-y-auto">
                    {filteredStates.map((state) => (
                      <label
                        key={state.state_id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStates.includes(state)} // Check if selected
                          onChange={() => toggleStateDistrict(state)} // Toggle Department Selection
                          className="w-4 h-4"
                        />
                        <span className="text-gray-700">
                          {state["state_name"]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          ""
        )}
        {district ? (
          <div className="w-full p-2">
            <div className="relative" ref={districtDropdownRef}>
              <button
                onClick={() => setDistrictDropdownOpen(!districtDropdownOpen)} // Toggle District Dropdown
                className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
              >
                {selectedDistricts.length > 0
                  ? selectedDistricts.length + " selected"
                  : "Select District"}
              </button>

              {districtDropdownOpen && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-10">
                  <input
                    type="text"
                    placeholder="Search Districts..."
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)} // Handle Search Change
                    className="w-full p-2 border-b border-gray-300 focus:outline-none"
                  />
                  <div className="max-h-40 overflow-y-auto">
                    {filteredDistricts.map((district) => (
                      <label
                        key={district.district_id} // Assuming district has an id property
                        className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDistricts.includes(district)} // Check if selected
                          onChange={() => toggleDistrict(district)} // Toggle District Selection
                          className="w-4 h-4"
                        />
                        <span className="text-gray-700">
                          {district.district_name}{" "}
                          {/* Assuming district has a district_name property */}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          ""
        )}

        {/* Scheme Filter */}
        <div className="w-full p-2">
          {/* Schemes Dropdown */}
          <div className="relative" ref={schemeDropdownRef}>
            {/* <label className="block text-[14px] text-[#5c5656] font-small mb-1">
        Schemes
      </label> */}
            <button
              onClick={() => setSchemeDropdownOpen(!schemeDropdownOpen)}
              className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
            >
              {selectedSchemes.length > 0
                ? selectedSchemes.length + " selected"
                : "Select Schemes"}
            </button>

            {schemeDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-10">
                <input
                  type="text"
                  placeholder="Search schemes..."
                  value={schemeSearch}
                  onChange={(e) => setSchemeSearch(e.target.value)}
                  className="w-full p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {filteredSchemes.map((scheme) => (
                    <label
                      key={scheme}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSchemes.includes(scheme)}
                        onChange={() => toggleScheme(scheme)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">{scheme}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full p-2">
          {/* KPIs Dropdown (Based on Selected Schemes) */}
          <div className="relative " ref={kpiDropdownRef}>
            {/* <label className="block text-[14px] text-[#5c5656] font-small mb-1">
        KPI
      </label> */}
            <button
              onClick={() => setKpiDropdownOpen(!kpiDropdownOpen)}
              className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
              //   disabled={selectedSchemes.length === 0} // Disable KPI selection if no scheme is selected
            >
              {selectedKPIs.length > 0
                ? selectedKPIs.length + " selected"
                : "Select KPIs"}
            </button>

            {kpiDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-10">
                <input
                  type="text"
                  placeholder="Search KPIs..."
                  value={kpiSearch}
                  onChange={(e) => setKpiSearch(e.target.value)}
                  className="w-full p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {filteredKPIs.length > 0 ? (
                    filteredKPIs.map((kpi) => (
                      <label
                        key={kpi}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedKPIs.includes(kpi)}
                          onChange={() => toggleKPI(kpi)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-700">{kpi}</span>
                      </label>
                    ))
                  ) : (
                    <p className="p-2 text-gray-500">No results found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Data Format Filter */}
     
          <div className=" w-full bg-transparent rounded-3xl p-2 ">
            <select
              onChange={(e) => {
                toggleUnits(e.target.value);
              }}
              className=" w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-[white] rounded-2xl"
            >
              <option>Select Input</option>
              <option>In Absolute</option>
              <option>In Units</option>
            </select>
          </div>
        

        {/* Date Filter */}
        {/* <div className="p-3 bg-transparent rounded-3xl">
    <label className="block text-[#5c5656] font-medium mb-2">
      Date Range
    </label>
    <input
      type="date"
      className="w-full bg-[#e0e6e4] p-[.6rem] text-center text-[black] rounded-2xl"
      defaultValue={new Date().toISOString().split("T")[0]}
    />
  </div> */}

        {/*Input Type*/}
        {!state ? (
          <div className="p-2 w-full bg-transparent rounded-3xl ">
            <select className="w-full bg-[#70a7d8] text-[12px] p-[.5rem] text-center text-[white] rounded-2xl">
              <option>Select Format</option>
              <option>Native View</option>
              <option>Scheme View</option>
              <option>Department Excel</option>
              <option> Department API</option>
            </select>
          </div>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

export default Form;
