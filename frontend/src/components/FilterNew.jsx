import React, { useState, useEffect, useMemo, useRef } from "react";
const Filter = ({
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
  historical,
  onDateChange,
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
  const [filteredSectors, setFilteredSectors] = useState(sectors);
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
  const [filteredSchemes, setFilteredSchemes] = useState(
    Object.keys(mappingData).filter((scheme) => scheme)
  );
  const [filteredDistricts, setFilteredDistricts] = useState(districts);
  const [filteredStates, setFilteredStates] = useState(states);
  const [filteredKPIs, setFilteredKPIs] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);

  const updateFilteredData = () => {
    let filteredData = { ...outputdata }; // Start with the original data
    // Step 0: Filter based on department
    if (selectedDepartments.length > 0) {
      const updatedSchemes = Object.keys(schemeDepartmentMapping).filter(
        (scheme) =>
          selectedDepartments.includes(schemeDepartmentMapping[scheme])
      );
      filteredData = Object.keys(filteredData).reduce((result, schemeKey) => {
        const data = filteredData[schemeKey];
        if (updatedSchemes.includes(schemeKey) && typeof data === 'object') {
          result[schemeKey] = filteredData[schemeKey];
        }
        return result;
      });
    }
    // Step 1: Filter based on selected schemes
    if (selectedSchemes.length > 0) {
      filteredData = Object.keys(filteredData).reduce((result, schemeKey) => {
        if (selectedSchemes.includes(schemeKey)) {
          result[schemeKey] = filteredData[schemeKey];
        }
        return result;
      }, {});
    }

    // Step 2: Filter based on selected KPIs
    if (selectedKPIs.length > 0) {
      filteredData = Object.keys(filteredData).reduce((result, schemeKey) => {
        if (!filteredData[schemeKey]) return result; // Prevent errors
        Object.keys(filteredData[schemeKey]).forEach((kpiKey) => {
          if (selectedKPIs.includes(kpiKey)) {
            result[schemeKey] = result[schemeKey] || {};
            result[schemeKey][kpiKey] = filteredData[schemeKey][kpiKey];
          }
        });
        return result;
      }, {});
    }

    // Step 3: Filter based on selected states
    if (selectedStates.length > 0) {
      const stateNames = selectedStates.map((item) => item.state_name);
      filteredData = Object.keys(filteredData).reduce((result, missionKey) => {
        const missionData = filteredData[missionKey];

        Object.keys(missionData).forEach((categoryKey) => {
          const categoryData = missionData[categoryKey];

          // Filter states
          const filteredStates = Object.keys(categoryData).reduce(
            (statesResult, stateKey) => {
              if (stateNames.includes(stateKey)) {
                statesResult[stateKey] = categoryData[stateKey];
              }
              return statesResult;
            },
            {}
          );

          if (Object.keys(filteredStates).length > 0) {
            result[missionKey] = result[missionKey] || {};
            result[missionKey][categoryKey] = filteredStates;
          }
        });

        return result;
      }, {});
    }

    // Step 4: Filter based on selected districts, but RETAIN states
    if (selectedDistricts.length > 0) {
      const districtNames = selectedDistricts.map((item) => item.district_name);
      filteredData = Object.keys(filteredData).reduce((result, missionKey) => {
        const missionData = filteredData[missionKey];

        Object.keys(missionData).forEach((categoryKey) => {
          const categoryData = missionData[categoryKey];

          // Keep states even if no districts match
          const statesResult = { ...categoryData };

          Object.keys(categoryData).forEach((stateKey) => {
            const filteredDistricts = Object.keys(
              categoryData[stateKey]
            ).reduce((districtsResult, districtKey) => {
              if (districtNames.includes(districtKey)) {
                districtsResult[districtKey] =
                  categoryData[stateKey][districtKey];
              }
              return districtsResult;
            }, {});

            // If districts match, update state
            if (Object.keys(filteredDistricts).length > 0) {
              statesResult[stateKey] = filteredDistricts;
            }
          });

          if (Object.keys(statesResult).length > 0) {
            result[missionKey] = result[missionKey] || {};
            result[missionKey][categoryKey] = statesResult;
          }
        });

        return result;
      }, {});
    }

    // Ensure output data updates correctly
    onUpdatedOutputData(filteredData);
  };

  // 🛠️ Fix: Ensure `outputdata` is included in dependencies to avoid unexpected resets
  useEffect(() => {
    updateFilteredData();
  }, [
    outputdata, // Added dependency
    selectedSectors,
    selectedDepartments,
    selectedStates,
    selectedDistricts,
    selectedSchemes,
    selectedKPIs,
  ]);

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
  // Filter schemes based on search input
  useMemo(() => {
    const filteredSchemes = Object.keys(mappingData).filter((scheme) =>
      scheme.toLowerCase().includes(schemeSearch.toLowerCase())
    );
    setFilteredSchemes(filteredSchemes);
  }, [schemeSearch]);

  // Get dynamic KPI options based on selected schemes
  const kpiOptions = filteredSchemes.flatMap((scheme) => {
    return mappingData[scheme].map((kpi) => {
      return kpi["KPI Name"] || "";
    });
  });
  useMemo(() => {
    // Filter KPIs based on search input
    const filteredKPIs1 = kpiOptions.filter((kpi) => {
      return kpi.toLowerCase().includes(kpiSearch.toLowerCase());
    });
    setFilteredKPIs(filteredKPIs1);
  }, [kpiSearch]);
  useMemo(() => {
    if (selectedSchemes.length > 0) {
      const kpiOptions = selectedSchemes.flatMap((scheme) => {
        return mappingData[scheme].map((kpi) => {
          return kpi["KPI Name"] || "";
        });
      });
      setFilteredKPIs(kpiOptions);
    } else {
      const kpiOptions = filteredSchemes.flatMap((scheme) => {
        return mappingData[scheme].map((kpi) => {
          return kpi["KPI Name"] || "";
        });
      });

      setFilteredKPIs(kpiOptions);
    }
  }, [selectedSchemes]);
  const toggleDistrict = (district) => {
    setSelectedDistricts((prevSelectedDistricts) => {
      // Toggle the district in the list of selected districts
      const updatedDistricts = prevSelectedDistricts.includes(district)
        ? prevSelectedDistricts.filter((item) => item !== district)
        : [...prevSelectedDistricts, district];

      if (updatedDistricts.length > 0) {
        let updatedStates = [];
        updatedDistricts.forEach((selectedDistrict) => {
          Object.keys(stateDistrictArray).forEach((stateKey) => {
            stateDistrictArray[stateKey]["districts"].forEach((district) => {
              if (
                district["district_name"] == selectedDistrict["district_name"]
              ) {
                updatedStates.push({
                  state_name: stateKey,
                  state_id: stateDistrictArray[stateKey]["state_id"],
                });
              }
            });
          });
        });
        const uniqueStates = [
          ...new Map(
            updatedStates.map((item) => [item.state_id, item])
          ).values(),
        ];

        setFilteredStates(uniqueStates);

        onUpdateDistrict(updatedDistricts, selectedStates);
      } else {
        setFilteredStates(states);
        onUpdateDistrict(districts, selectedStates); // Assuming `districts` is the list of all districts
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
        // onUpdatedOutputData(filteredData);

        if (selectedDistricts.length > 0) {
          onUpdateDistrict(selectedDistricts, updatedStates);
        } else {
          onUpdateState(updatedStates);
        }
      } else {
        // If no states are selected, clear the filtered data (or reset to original data)
        setFilteredStates(states);

        // onUpdatedOutputData(outputdata);
        onUpdateState(states);
        if (district) {
          setFilteredDistricts(districts);
          if (selectedDistricts.length > 0) {
            setFilteredDistricts(selectedDistricts);
            onUpdateDistrict(selectedDistricts, updatedStates);
          }
        }
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
      if (updatedDepartments.length > 0) {
        // Update selected schemes based on department mapping
        const updatedSchemes = Object.keys(schemeDepartmentMapping).filter(
          (scheme) =>
            updatedDepartments.includes(schemeDepartmentMapping[scheme])
        );

        setFilteredSchemes(updatedSchemes);

        // Determine sectors linked to the selected departments
        const updatedSectors = [];
        Object.keys(departmentMapping).forEach((sectorMapping) => {
          Object.keys(departmentMapping[sectorMapping]).forEach((sectorKey) => {
            Object.keys(departmentMapping[sectorMapping][sectorKey]).forEach(
              (ministerKey) => {
                Object.keys(
                  departmentMapping[sectorMapping][sectorKey][ministerKey]
                ).forEach((departmentKey) => {
                  if (updatedDepartments.includes(departmentKey)) {
                    updatedSectors.push(sectorKey);
                  }
                });
              }
            );
          });
        });

        setFilteredSectors(Array.from(new Set(updatedSectors)));
      } else {
        if (selectedSchemes.length > 0) {
          const updatedSectors = [];
          Object.keys(departmentMapping).forEach((sectorMapping) => {
            Object.keys(departmentMapping[sectorMapping]).forEach(
              (sectorKey) => {
                Object.keys(
                  departmentMapping[sectorMapping][sectorKey]
                ).forEach((ministerKey) => {
                  Object.keys(
                    departmentMapping[sectorMapping][sectorKey][ministerKey]
                  ).forEach((departmentKey) => {
                    if (updatedDepartments.includes(departmentKey)) {
                      updatedSectors.push(sectorKey);
                    }
                  });
                });
              }
            );
          });

          //setSelectedSectors(Array.from(new Set(updatedSectors)));
          setFilteredSectors(Array.from(new Set(updatedSectors)));
          // toggleScheme(selectedSchemes);
        } else {
          setFilteredSectors(sectors);
          const totalSchemes = Object.keys(mappingData).filter(
            (scheme) => scheme
          );

          setFilteredSchemes(totalSchemes);
          setFilteredDepartments(Array.from(new Set(departments)));
          setFilteredSectors(sectors);
        }
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
        const updatedSchemes = [];

        Object.keys(schemeDepartmentMapping).forEach((scheme) => {
          if (
            updatedFilteredDepartments.includes(schemeDepartmentMapping[scheme])
          ) {
            updatedSchemes.push(scheme);
          }
        });
        setFilteredSchemes(updatedSchemes);
        setFilteredDepartments(updatedFilteredDepartments);
      } else {
        // If no sectors are selected, display all departments
        updatedFilteredDepartments = Array.from(new Set(departments));
        if (selectedDepartments.length > 0) {
          const updatedSchemes = [];

          Object.keys(schemeDepartmentMapping).forEach((scheme) => {
            if (selectedDepartments.includes(schemeDepartmentMapping[scheme])) {
              updatedSchemes.push(scheme);
            }
          });
          setFilteredSchemes(updatedSchemes);
        } else {
          const totalSchemes = Object.keys(mappingData).filter(
            (scheme) => scheme
          );

          setFilteredSchemes(totalSchemes);
        }
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
      if (updatedSchemes.length > 0) {
        // Determine departments linked to the selected schemes
        const updatedDepartments = updatedSchemes.map(
          (selectedScheme) => schemeDepartmentMapping[selectedScheme]
        );

        //setSelectedDepartments(Array.from(new Set(updatedDepartments)));
        setFilteredDepartments(Array.from(new Set(updatedDepartments)));
        // Determine sectors linked to the selected departments
        const updatedSectors = [];
        Object.keys(departmentMapping).forEach((sectorMapping) => {
          Object.keys(departmentMapping[sectorMapping]).forEach((sectorKey) => {
            Object.keys(departmentMapping[sectorMapping][sectorKey]).forEach(
              (ministerKey) => {
                Object.keys(
                  departmentMapping[sectorMapping][sectorKey][ministerKey]
                ).forEach((departmentKey) => {
                  if (updatedDepartments.includes(departmentKey)) {
                    updatedSectors.push(sectorKey);
                  }
                });
              }
            );
          });
        });

        //setSelectedSectors(Array.from(new Set(updatedSectors)));
        setFilteredSectors(Array.from(new Set(updatedSectors)));
      } else {
        if (selectedSectors.length > 0) {
          toggleSector(selectedSectors);
          setSelectedSectors(selectedSectors);
          setFilteredSectors(sectors);
        }
        if (selectedDepartments.length > 0) {
          toggleDepartment(selectedDepartments);
          setSelectedDepartments(selectedDepartments);
        } else {
          setFilteredDepartments(Array.from(new Set(departments)));
          setFilteredSectors(sectors);
        }
      }
      return updatedSchemes;
    });
  };
  // Function to toggle KPI selection
  const toggleKPI = (kpi) => {
    const totalSchemes = Object.keys(mappingData).filter((scheme) => scheme);
    setSelectedKPIs((prev) => {
      const updatedKpis = prev.includes(kpi)
        ? prev.filter((item) => item !== kpi)
        : [...prev, kpi];
      if (updatedKpis.length > 0) {
        const KpiselectedSchemes = totalSchemes.filter((scheme) =>
          mappingData[scheme]?.some((kpiSelected) => {
            return (
              selectedKPIs.includes(kpiSelected["KPI Name"]) ||
              kpiSelected["KPI Name"] == kpi
            );
          })
        );

        setFilteredSchemes(KpiselectedSchemes);
      } else {
        // setFilteredKPIs([]);
        if (selectedSectors.length > 0) {
          toggleSector(selectedSectors);
          setSelectedSectors(selectedSectors);
        }
        if (selectedDepartments.length > 0) {
          toggleDepartment(selectedDepartments);
          setSelectedDepartments(selectedDepartments);
        }

        if (selectedSchemes.length > 0) {
          toggleScheme(selectedSchemes);
          setSelectedSchemes(selectedSchemes);
        } else {
          const kpiOptions = filteredSchemes.flatMap((scheme) => {
            return mappingData[scheme].map((kpi) => {
              return kpi["KPI Name"] || "";
            });
          });

          setFilteredKPIs(kpiOptions);
        }
        if (
          selectedSectors.length == 0 &&
          selectedDepartments.length == 0 &&
          selectedSchemes.length == 0
        ) {
          setFilteredSchemes(totalSchemes);
        }
      }
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

  return (
    <div className="flex w-full bg-[#f8f9f9] mt-1  py-1 rounded-lg ">
      <div className="w-full flex gap-2 ">
        {/* Sector Filter */}
        <div className="w-full p-2">
          {/* Sector Dropdown */}
          <div className="relative" ref={sectorDropdownRef}>
            <button
              onClick={() => setSectorDropdownOpen(!sectorDropdownOpen)} // Toggle Sector Dropdown
              className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
            >
              {selectedSectors.length > 0
                ? selectedSectors.length +
                  (selectedSectors.length > 1 ? " sectors" : " sector") +
                  " selected"
                : "Select Sector"}
            </button>

            {sectorDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <input
                  type="text"
                  placeholder="Search sectors..."
                  value={sectorSearch}
                  onChange={(e) => setSectorSearch(e.target.value)} // Handle Search Change
                  className="w-full text-[12px] p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {filteredSectors.map((sector, index) => (
                    <label
                      key={`${sector}-${index}`} // Combine sector value and index to ensure uniqueness
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSectors.includes(sector)}
                        onChange={() => toggleSector(sector)}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                        {sector}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/*Department Filter*/}
        <div className="w-full p-2">
          <div className="relative" ref={departmentDropdownRef}>
            <button
              onClick={() => setDepartmentDropdownOpen(!departmentDropdownOpen)} // Toggle Department Dropdown
              className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
            >
              {selectedDepartments.length > 0
                ? selectedDepartments.length +
                  (selectedDepartments.length > 1
                    ? " departments"
                    : " department") +
                  " selected"
                : "Select Department"}
            </button>

            {departmentDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)} // Handle Search Change
                  className=" text-[12px] w-full p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {filteredDepartments.map((department, index) => (
                    <label
                      key={`${department}-${index}`} // Ensure uniqueness with a combination of the department and index
                      className="flex items-center space-x-2 p-1 hover:bg-gray-100 cursor-pointer text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDepartments.includes(department)}
                        onChange={() => toggleDepartment(department)}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                        {department}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* State Filter */}
        {state ? (
          <div className="w-full p-2">
            <div className="relative" ref={stateDropdownRef}>
              <button
                onClick={() => setStateDropdownOpen(!stateDropdownOpen)} // Toggle Department Dropdown
                className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
              >
                {selectedStates.length > 0
                  ? selectedStates.length +
                    (selectedStates.length > 1 ? " states" : " state") +
                    " selected"
                  : "Select State"}
              </button>

              {stateDropdownOpen && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                  <input
                    type="text"
                    placeholder="Search States..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)} // Handle Search Change
                    className="text-[12px] w-full p-2 border-b border-gray-300 focus:outline-none"
                  />
                  <div className="max-h-40 overflow-y-auto">
                    {filteredStates.map((state) => (
                      <label
                        key={state.state_id}
                        className="flex items-center space-x-2 p-1 hover:bg-gray-100 cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStates.some(
                            (s) => s.state_id === state.state_id
                          )}
                          onChange={() => toggleStateDistrict(state)} // Toggle Department Selection
                          className="w-3 h-3"
                        />
                        <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
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
                  ? selectedDistricts.length +
                    (selectedDistricts.length > 1
                      ? " districts"
                      : " district") +
                    " selected"
                  : "Select District"}
              </button>

              {districtDropdownOpen && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                  <input
                    type="text"
                    placeholder="Search Districts..."
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)} // Handle Search Change
                    className="text-[12px] w-full p-2 border-b border-gray-300 focus:outline-none"
                  />
                  <div className="max-h-40 overflow-y-auto">
                    {filteredDistricts.map((district) => (
                      <label
                        key={district.district_id} // Assuming district has an id property
                        className="flex items-center space-x-2 p-1 hover:bg-gray-100 cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDistricts.includes(district)} // Check if selected
                          onChange={() => toggleDistrict(district)} // Toggle District Selection
                          className="w-3 h-3"
                        />
                        <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
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
                ? selectedSchemes.length +
                  (selectedSchemes.length > 1 ? " schemes" : " scheme") +
                  " selected"
                : "Select Schemes"}
            </button>

            {schemeDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <input
                  type="text"
                  placeholder="Search schemes..."
                  value={schemeSearch}
                  onChange={(e) => setSchemeSearch(e.target.value)}
                  className="text-[12px] w-full p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {filteredSchemes.map((scheme) => (
                    <label
                      key={scheme}
                      className="flex items-center space-x-2 p-1 hover:bg-gray-100 cursor-pointer text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSchemes.includes(scheme)}
                        onChange={() => toggleScheme(scheme)}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                        {scheme}
                      </span>
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
                ? selectedKPIs.length +
                  (selectedKPIs.length > 1 ? " KPIs" : " KPI") +
                  " selected"
                : "Select KPIs"}
            </button>

            {kpiDropdownOpen && (
              <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
                <input
                  type="text"
                  placeholder="Search KPIs..."
                  value={kpiSearch}
                  onChange={(e) => setKpiSearch(e.target.value)}
                  className="text-[12px] w-full p-2 border-b border-gray-300 focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {filteredKPIs ? (
                    filteredKPIs.length > 0 ? (
                      filteredKPIs.map((kpi) => (
                        <label
                          key={kpi}
                          className="flex items-center space-x-2 p-1 hover:bg-gray-100 cursor-pointer text-[12px]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedKPIs.includes(kpi)}
                            onChange={() => toggleKPI(kpi)}
                            className="w-3 h-3"
                          />
                          <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                            {kpi}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500">No results found</p>
                    )
                  ) : (
                    ""
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Data Format Filter */}

        {/* <div className=" w-full bg-transparent rounded-3xl p-2 ">
            <select
              onChange={(e) => {
                toggleUnits(e.target.value);
              }}
              className=" w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-[white] rounded-2xl"
            >
             
              <option>In Absolute</option>
              <option>In Units</option>
            </select>
          </div> */}

        {/* Date Filter */}
        {historical ? (
          <div className="p-2 w-full">
            <input
              type="date"
              className="w-full text-[12px] bg-[#70a7d8] p-[.5rem] text-center text-white rounded-2xl"
              defaultValue={new Date().toISOString().split("T")[0]}
              onChange={(e) => onDateChange(e.target.value)} // ✅ pass selected date
            />
          </div>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

export default Filter;
