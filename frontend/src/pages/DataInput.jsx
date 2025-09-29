import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFromLocalStorage, useFetchLevelSchemeKpiQuery } from "../api/api";
import Loader from "../components/loader";
import { capitalizeFirst } from "../config/config";
import { toast, ToastContainer } from "react-toastify";

const DataInput = () => {
  const navigate = useNavigate();

  const [uploadLevelDropdownOpen, setUploadLevelDropdownOpen] = useState(false);
  const [selectedUploadLevel, setSelectedUploadLevel] = useState("");
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
  const [kpiDropdownOpen, setKpiDropdownOpen] = useState(false);
  const [schemeSearch, setSchemeSearch] = useState("");
  const [kpiSearch, setKpiSearch] = useState("");
  const [levels, setLevels] = useState(null);
  const [schemes, setSchemes] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedKpi, setKpi] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const schemeDropdownRef = useRef(null);
  const kpiDropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    data: levelSchemeKpi,
    error: levelSchemeKpiError,
    isLoading: isLevelSchemeKpiLoading,
  } = useFetchLevelSchemeKpiQuery();

  useEffect(() => {
    if (levelSchemeKpi) {
      setLevels(levelSchemeKpi.levels);
      if (selectedLevel) {
        setSchemes(levelSchemeKpi.schemes[selectedLevel]);
      }
      if (selectedScheme) {
        setKpis(levelSchemeKpi.kpis[selectedLevel][selectedScheme]);
      }
    }
  }, [levelSchemeKpi, selectedLevel]);

  const filteredSchemes = (schemes || []).filter((scheme) =>
    scheme.toLowerCase().includes(schemeSearch.toLowerCase())
  );

  const filteredKpis = (kpis || []).filter((kpi) =>
    kpi.toLowerCase().includes(kpiSearch.toLowerCase())
  );

  const handleDownloadTemplate = () => {
    const fileName = `${selectedLevel}_${selectedScheme}_${selectedKpi}_template.xlsx`;

    fetch(`${import.meta.env.VITE_API_URL}/download_excel_template`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getFromLocalStorage("token")}`,
      },
      body: JSON.stringify({
        level: selectedLevel,
        scheme_name: selectedScheme,
        kpi_name: selectedKpi,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.clear();
            sessionStorage.clear();
            navigate("/");
          }
        }
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("File Downloaded Successfully");
      })
      .catch(() => {
        toast.error("Failed to Download Template");
      });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedUploadLevel) {
      toast.warn("Please Select Granularity before uploading.");
      return;
    }
    if (!selectedFile) {
      toast.warn("Please select a file to upload.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    let uploadUrl = `${
      import.meta.env.VITE_API_URL
    }/upload_excel_national_data`;
    if (selectedUploadLevel === "district") {
      uploadUrl = `${import.meta.env.VITE_API_URL}/upload_excel_district_data`;
    } else if (selectedUploadLevel === "state") {
      uploadUrl = `${import.meta.env.VITE_API_URL}/upload_excel_state_data`;
    }

    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getFromLocalStorage("token")}`,
        },
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (data.status === 200) {
          toast.success(
            <div>
              <div>File Upload Status: Success.</div>
              <div>
                {selectedUploadLevel === "state" ? (
                  `No. of State Rows Inserted: ${data.state_rows_inserted}`
                ) : (
                  <>
                    No. of State Rows Inserted: {data.state_rows_inserted}
                    <br />
                    No. of District Rows Inserted: {data.district_rows_inserted}
                  </>
                )}
              </div>
            </div>
          );
        }
      } else {
        if (response.status === 401) {
          localStorage.clear();
          sessionStorage.clear();
          navigate("/");
        }
        toast.error(data.detail);
      }
    } catch (err) {
      toast.error(err.message || err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div
        className="py-3 font-small"
        style={{ paddingBottom: "70px" }}
      >
        <div className="h-[45px] py-4 bg-[#4059ad] text-white flex items-center justify-center rounded-lg shadow-lg">
          <div className="flex justify-center items-center w-full px-4">
            <h1 className="text-l font-semibold w-full flex">
              Data Upload via excel
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
              {/* <h2 className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer" onClick={() => navigate("/scraping/exception-report")}>
                Go to Scraping Exception Report
              </h2>
              <h2 className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer" onClick={() => navigate("/log-report")}>
                Go to Scraping Logs
              </h2> */}
            </div>
          </div>
        </div>
        {isLevelSchemeKpiLoading || !levelSchemeKpi ? (
          <div className="mt-10">
            <Loader />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap px-4 py-3 gap-4 items-center justify-between">
              <div className="flex flex-wrap py-3 gap-4 items-center">
                {/* Level Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setLevelDropdownOpen(!levelDropdownOpen)}
                    className="text-[12px] bg-[#70a7d8] px-4 py-2 text-white rounded-2xl w-40 min-w-40"
                  >
                    {selectedLevel
                      ? capitalizeFirst(selectedLevel)
                      : "Select Granularity"}
                  </button>
                  {levelDropdownOpen && (
                    <div className="absolute mt-1 w-full min-w-40 bg-white border border-gray-300 rounded-lg shadow-md z-50">
                      {levels.map((level) => (
                        <div
                          key={level}
                          className={`p-2 hover:bg-gray-100 cursor-pointer text-[12px] ${
                            selectedLevel === level
                              ? "font-bold text-[#70a7d8]"
                              : "text-gray-700"
                          }`}
                          onClick={() => {
                            setSelectedLevel(level);
                            setLevelDropdownOpen(false);
                            setSchemes(levelSchemeKpi.schemes[level]);
                            setSelectedScheme(null);
                            setKpis(null);
                            setKpi(null);
                          }}
                        >
                          {capitalizeFirst(level)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Scheme Dropdown */}
                <div className="relative" ref={schemeDropdownRef}>
                  <button
                    onClick={() =>
                      selectedLevel &&
                      setSchemeDropdownOpen(!schemeDropdownOpen)
                    }
                    className={`text-[12px] px-4 py-2 rounded-2xl w-60 ${
                      selectedLevel
                        ? "bg-[#70a7d8] text-white"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={!selectedLevel}
                  >
                    {selectedScheme || "Select Scheme"}
                  </button>
                  {schemeDropdownOpen && selectedLevel && (
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
                            onClick={() => {
                              setSelectedScheme(scheme);
                              setKpis(
                                levelSchemeKpi.kpis[selectedLevel][scheme]
                              );
                              setKpi(null);
                              setSchemeDropdownOpen(false);
                            }}
                          >
                            <span className="text-gray-700 truncate">
                              {scheme}
                            </span>
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
                    {selectedKpi ? `${selectedKpi}` : "Select KPI"}
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
                            onClick={() => {
                              setKpi(kpi);
                              setKpiDropdownOpen(false);
                            }}
                          >
                            <span className="text-gray-700 truncate">
                              {kpi}
                            </span>
                          </label>
                        ))}
                        {filteredKpis.length === 0 && (
                          <div className="p-2 text-gray-400 text-sm">
                            No KPIs found.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Download Filter */}
              <div className="relative calendar-container">
                <button
                  className={`flex items-center gap-2  font-bold rounded-xl px-6 py-2 shadow  transition
                  ${
                    selectedLevel && selectedScheme && selectedKpi
                      ? "font-bold text-[#70a7d8]"
                      : "text-gray-400"
                  }`}
                  onClick={handleDownloadTemplate}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M224,152v56a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V152a8,8,0,0,1,16,0v56H208V152a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,132.69V40a8,8,0,0,0-16,0v92.69L93.66,106.34a8,8,0,0,0-11.32,11.32Z"></path>
                  </svg>
                  <span>Download Template</span>
                </button>
              </div>
            </div>
            {/* Upload Excel File */}
            {/* Level Dropdown */}
            <div className="flex px-4 py-3 gap-4">
              <div className="relative">
                <button
                  onClick={() =>
                    setUploadLevelDropdownOpen(!uploadLevelDropdownOpen)
                  }
                  className="text-[12px] bg-[#70a7d8] px-4 py-2 text-white rounded-2xl w-40 min-w-40"
                >
                  {selectedUploadLevel
                    ? capitalizeFirst(selectedUploadLevel)
                    : "Select Granularity to Upload Excel"}
                </button>
                {uploadLevelDropdownOpen && (
                  <div className="absolute mt-1 w-full min-w-40 bg-white border border-gray-300 rounded-lg shadow-md z-50">
                    {levels.map((level) => (
                      <div
                        key={level}
                        className={`p-2 hover:bg-gray-100 cursor-pointer text-[12px] ${
                          selectedLevel === level
                            ? "font-bold text-[#70a7d8]"
                            : "text-gray-700"
                        }`}
                        onClick={() => {
                          setSelectedUploadLevel(level);
                          setUploadLevelDropdownOpen(false);
                        }}
                      >
                        {capitalizeFirst(level)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-full flex flex-col gap-4">
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[#d4dce2] px-6 py-10 bg-white">
                  <p className="text-[#101518] text-lg font-bold text-center">
                    Upload Excel File
                  </p>
                  <p className="text-[#101518] text-sm text-center">
                    Drag and drop or click to select a file
                  </p>
                  <label className="flex items-center justify-center rounded-xl h-10 px-4 bg-[#eaedf1] text-[#101518] text-sm font-bold hover:bg-[#dce8f3] transition cursor-pointer">
                    <span>Browse Files</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                  </label>
                  {selectedFile && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-[#4059ad] font-semibold">
                        {selectedFile.name}
                      </span>
                      <button
                        className="ml-2 px-3 py-1 bg-[#70a7d8] text-white rounded hover:bg-[#4059ad] text-xs"
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        {isUploading ? "Uploading..." : "Upload"}
                      </button>
                      <button
                        className="ml-2 px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        disabled={isUploading}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ToastContainer />
          </>
        )}
      </div>
    </>
  );
};

export default DataInput;
