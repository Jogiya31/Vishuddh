import { createContext, useContext, useState, useEffect } from "react";

// Create Context
const ReportTypeContext = createContext();

// Custom Hook to use the context
export const useReportType = () => useContext(ReportTypeContext);

// Provider Component
export const ReportTypeProvider = ({ children }) => {
  const [reportType, setReportType] = useState(() => {
    const saved = sessionStorage.getItem("reportType");
    return saved ? JSON.parse(saved) : "Current";
  });
  const [granularityType, setGranularityType] = useState(() => {
    const saved = sessionStorage.getItem("granularityType");
    return saved ? JSON.parse(saved) : "National";
  });
  const [dateType, setDateType] = useState(() => {
    const saved = sessionStorage.getItem("dateType");
    return saved ? JSON.parse(saved) : "Latest Match";
  });
  const [unit, setUnit] = useState(() => {
    const saved = sessionStorage.getItem("unitType");
    return saved ? JSON.parse(saved) : "In Absolute";
  });
  const [toggleValue, setToggleValue] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => {
    const saved = localStorage.getItem("loggedIn");
    return saved ? JSON.parse(saved) : false;
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("userName") || "";
  });
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const stored = localStorage.getItem("selectedOptions");
    return stored ? JSON.parse(stored) : [];
  });


  const [showDepartmentView, setShowDepartmentView] = useState(() => {
    const stored = localStorage.getItem("showDepartmentView");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [showScemeView, setShowSchemeView] = useState(() => {
    const stored = localStorage.getItem("showSchemeView");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [showDeptExcel, setShowDeptExcel] = useState(() => {
    const stored = localStorage.getItem("showDeptExcel");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [showDeptAPI, setShowDeptAPI] = useState(() => {
    const stored = localStorage.getItem("showDeptAPI");
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [outputData, setOutputData] = useState(() => {
    const stored = localStorage.getItem("filteredOutputData");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Error parsing outputdata from sessionStorage:", error);
        return [];
      }
    }
    return stored ? JSON.parse(stored) : [];
  });
  useEffect(() => {
    sessionStorage.setItem("granularityType", JSON.stringify(granularityType));
  }, [granularityType]);

  useEffect(() => {
    sessionStorage.setItem("reportType", JSON.stringify(reportType));
  }, [reportType]);

  useEffect(() => {
    sessionStorage.setItem("dateType", JSON.stringify(dateType));
  }, [dateType]);

  useEffect(() => {
    sessionStorage.setItem("unitType", JSON.stringify(unit));
  }, [unit]);
  useEffect(() => {
    localStorage.setItem("selectedOptions", JSON.stringify(selectedOptions));
  }, [selectedOptions]);


  useEffect(() => {
    localStorage.setItem("showDepartmentView", JSON.stringify(showDepartmentView));
  }, [showDepartmentView]);

  useEffect(() => {
    localStorage.setItem("showSchemeView", JSON.stringify(showScemeView));
  }, [showScemeView]);

  useEffect(() => {
    localStorage.setItem("showDeptExcel", JSON.stringify(showDeptExcel));
  }, [showDeptExcel]);

  useEffect(() => {
    localStorage.setItem("showDeptAPI", JSON.stringify(showDeptAPI));
  }, [showDeptAPI]);

  useEffect(() => {
    if (!loggedIn) {
      setReportType("Current");
      setGranularityType("National");
      setDateType("Latest Match");
      setSelectedOptions([]);
      setOutputData([]);
      setUnit("In Absolute");
      setToggleValue(false);
      setShowDepartmentView(true);
      setShowSchemeView(true);
      setShowDeptExcel(true);
      setShowDeptAPI(true);
      localStorage.clear();
      sessionStorage.clear();
    }
  }, [loggedIn]);

  return (
    <ReportTypeContext.Provider
      value={{
        reportType,
        setReportType,
        loggedIn,
        setLoggedIn,
        userName,
        setUserName,
        granularityType,
        setGranularityType,
        dateType,
        setDateType,
        toggleValue,
        setToggleValue,
        unit,
        setUnit,
        selectedOptions,
        setSelectedOptions,
        outputData,
        setOutputData,
        showDepartmentView,
        setShowDepartmentView,
        showScemeView,
        setShowSchemeView,
        showDeptExcel,
        setShowDeptExcel,
        showDeptAPI,
        setShowDeptAPI

      }}
    >
      {children}
    </ReportTypeContext.Provider>
  );
};
