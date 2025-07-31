import { useState, useEffect } from "react";
import Filters from "../components/Filters";
import ViewTabs from "../components/ViewTabs";
import ViewTab from "../components/ViewTab";
import { useReportType } from "./ReportType";
import { useNavigate } from "react-router-dom";
import { useFetchAiReportQuery } from "../api/api";
import Loader from "../components/loader";

const AiReport = () => {
  const navigate = useNavigate();

  const { loggedIn } = useReportType();
  const {
    data: aiReport,
    error: aiReportError,
    isLoading: isAiReportLoading,
  } = useFetchAiReportQuery();

  const schemes = aiReport
    ? Array.from(
        new Set(
          Object.values(aiReport.data?.insights ?? {})
            .map((kpiObj) => Object.keys(kpiObj))
            .flat()
        )
      )
    : [];
  const [scheme, setScheme] = useState(
    () => localStorage.getItem("ai_scheme") || schemes[0]
  );

  const schemeKpiMap = {};
  Object.entries(aiReport?.data?.insights ?? {}).forEach(
    ([kpiName, schemeObj]) => {
      Object.keys(schemeObj).forEach((sch) => {
        if (!schemeKpiMap[sch]) schemeKpiMap[sch] = [];
        schemeKpiMap[sch].push(kpiName);
      });
    }
  );

  const availableKpis = scheme ? schemeKpiMap[scheme] || [] : [];
  const [kpi, setKpi] = useState(
    () => localStorage.getItem("ai_kpi") || availableKpis[0]
  );
  const [activeTab, setActiveTab] = useState("view5");

  // Table data state
  const [tableData, setTableData] = useState([]);

  // Save scheme and kpi to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("ai_scheme", scheme);
  }, [scheme]);
  useEffect(() => {
    localStorage.setItem("ai_kpi", kpi);
  }, [kpi]);

  // Update tableData whenever scheme, kpi, or activeTab changes
  useEffect(() => {
    const data =
      aiReport &&
      Array.isArray(aiReport.data?.tables?.[kpi]?.[scheme]?.[activeTab])
        ? aiReport.data.tables[kpi][scheme][activeTab]
        : [];
    setTableData(data);
  }, [scheme, kpi, activeTab, aiReport]);

  const insights = aiReport?.data?.insights?.[kpi]?.[scheme]?.[activeTab];

  useEffect(() => {
    if (!loggedIn) {
      localStorage.removeItem("ai_scheme");
      localStorage.removeItem("ai_kpi");
    }
  }, [loggedIn]);

  return (
    <div className="bg-white  mt-[2px] pb-[70px]">
      <div className="h-[45px] py-4 bg-[#4059ad] text-white flex items-center justify-center rounded-lg shadow-lg">
        <div className="flex justify-center items-center w-full px-4">
          <h1 className="text-l font-semibold w-full flex">AI Report</h1>

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
            <h2
              className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer"
              onClick={() => navigate("/scraping/exception-report")}
            >
              Go to Scrapping Exception Report
            </h2>
            <h2
              className="text-xs border py-0.5 px-2 rounded-[12px] cursor-pointer"
              onClick={() => navigate("/scraping/data-input")}
            >
              Go to Data Upload
            </h2>
          </div>
        </div>
      </div>
      <div className="text-red-700 text-left text-xs font-medium pt-2">
        *Significant means difference greater than 3%
      </div>
      <Filters
        schemes={schemes}
        selectedScheme={scheme}
        setScheme={(s) => {
          setScheme(s);
          // Reset KPI to first available for the new scheme
          const firstKpi = (schemeKpiMap[s] && schemeKpiMap[s][0]) || "";
          setKpi(firstKpi);
        }}
        kpis={availableKpis}
        selectedKpi={kpi}
        setKpi={setKpi}
      />

      {isAiReportLoading ? (
        <Loader />
      ) : (
        scheme &&
        kpi && (
          <>
            <ViewTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            <ViewTab insights={insights} tableData={tableData} />
          </>
        )
      )}
    </div>
  );
};

export default AiReport;
