import { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faAngleDoubleRight,
  faClose,
} from "@fortawesome/free-solid-svg-icons";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import {
  useFetchAllSummaryQuery,
  useFetchDateTimeQuery,
  useFetchSummaryQuery,
} from "../../api/externalSanityApi";
import Loader from "../../components/loader";
import { exportModalDataToExcel, exportToExcel } from "../../utils/generateCSV";
import excelicon from "../../assets/excel.svg";
import pdfIcon from "../../assets/pdf_i.svg";

const Sanity = () => {
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const modalTableRef = useRef(null);

  const {
    data: sanityData,
    isLoading: sanityLoader,
    error: sanityError,
    refetch: refetchSanityData,
  } = useFetchSummaryQuery();

  const {
    data: DetailData,
    isLoading: detailDataLoader,
    error: detailDataError,
    refetch: RefetchDetailData,
  } = useFetchAllSummaryQuery();

  const {
    data: LastDateTime,
  } = useFetchDateTimeQuery();

  const [titleDetails, settitleDetails] = useState({
    totalSchemsCount: 0,
    totalKpisCount: 0,
    latestDate: LastDateTime || null,
    totalSchemeMatch: 0,
    totalKpisMatch: 0,
    totalSchemesNotMatch: 0,
    totalKpisNotMatch: 0,
  });
  const [modalData, setModalData] = useState(null);

  const [activeFilter, setActiveFilter] = useState("ALL");

  const [selectedRow, setSelectedRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to handle popup open
  const handleOpenPopup = (rowData) => {
    setSelectedRow(rowData);
    const newData = DetailData.filter(
      (item) =>
        item.Scheme_Code === rowData.View_SchemeCode &&
        item.KPI_Name === rowData.KPI_Name_E
    );
    setModalData(newData);
    setIsModalOpen(true);
  };

  // Function to close popup
  const handleClosePopup = () => {
    setIsModalOpen(false);
    setModalData(null);
    setSelectedRow(null);
  };

  // Helpers
  const getDiff = (a, b) => a - b;

  const getPercentage = (a, b) => {
    if (b === 0) return "0 %";
    return ((getDiff(a, b) / b) * 100).toFixed(2) + " %";
  };

  // Grouping logic with rowSpan
  const groupData = (list) => {
    const grouped = [];
    let i = 0;
    let snoCounter = 1;

    while (i < list?.length) {
      let scheme = list[i]?.Project_Name_E;
      let darpanDate = list[i]?.PrayasDate?.split(" ")[0];
      let prayasDate = list[i]?.CedaDate?.split(" ")[0];

      let rowSpanCount = 1;
      for (
        let j = i + 1;
        j < list.length &&
        list[j].Project_Name_E === scheme &&
        list[j]?.PrayasDate?.split(" ")[0] === darpanDate &&
        list[j]?.CedaDate?.split(" ")[0] === prayasDate;
        j++
      ) {
        rowSpanCount++;
      }

      for (let k = 0; k < rowSpanCount; k++) {
        grouped.push({
          ...list[i + k],
          showSno: k === 0,
          showScheme: k === 0,
          showDarpanDate: k === 0,
          showPrayasDate: k === 0,
          rowSpan: rowSpanCount,
          sno: snoCounter,
        });
      }

      snoCounter++;
      i += rowSpanCount;
    }
    return grouped;
  };

  // Filter first
  const filteredRawData = sanityData?.filter((item) => {
    const darpanDate = item?.PrayasDate?.split(" ")[0];
    const prayasDate = item?.CedaDate?.split(" ")[0];
    const diff = getDiff(item.outvalue, item.CedaValue);

    if (activeFilter === "MATCHED") return diff === 0;
    if (activeFilter === "MISMATCHED") return diff !== 0;
    if (activeFilter === "MISMATCHED_DATE")
      return diff !== 0 && darpanDate !== prayasDate;
    if (activeFilter === "MISMATCHED_NO_DATE")
      return diff !== 0 && darpanDate === prayasDate;

    return true; // ALL
  });

  // Then group for rendering
  const filteredDataForRender = groupData(filteredRawData);

  // For Modal Details
  useEffect(() => {
    let totalSchemsCount = new Set(sanityData?.map((d) => d.Project_Name_E))
      .size;
    let totalKpisCount = sanityData?.length;

    let allDates = sanityData
      ?.flatMap((d) => [d.PrayasDate, d.CedaDate])
      ?.filter(Boolean)
      ?.map((dateStr) => new Date(dateStr).getTime())
      ?.filter((time) => !isNaN(time));

    // group KPIs by scheme
    const grouped = sanityData?.reduce((acc, d) => {
      const scheme = d.Project_Name_E ?? "__UNKNOWN__";
      if (!acc[scheme]) acc[scheme] = [];
      acc[scheme].push(d);
      return acc;
    }, {});

    let totalSchemeMatch = 0;
    let totalKpisMatch = 0;
    let totalSchemesNotMatch = 0;
    let totalKpisNotMatch = 0;

    Object.values(grouped || {}).forEach((rows) => {
      let kpiMatchCount = 0;
      let kpiNotMatchCount = 0;

      rows.forEach((d) => {
        if (getDiff(d.outvalue, d.CedaValue) === 0) {
          kpiMatchCount++;
          totalKpisMatch++;
        } else {
          kpiNotMatchCount++;
          totalKpisNotMatch++;
        }
      });

      if (kpiNotMatchCount === 0) {
        totalSchemeMatch++; // all KPIs in scheme match
      } else {
        totalSchemesNotMatch++; // at least one KPI mismatched
      }
    });

    settitleDetails({
      totalSchemsCount,
      totalKpisCount,
      latestDate: LastDateTime || null,
      totalSchemeMatch,
      totalKpisMatch,
      totalSchemesNotMatch,
      totalKpisNotMatch,
    });
  }, [sanityData]);

  // PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Title ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const title = "Data Comparison Sheet For Critical KPIs";
    const titleWidth = doc.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
    const titleY = 30;
    doc.text(title, titleX, titleY);

    // --- Footer function ---
    const footer = (doc, pageNumber, totalPages) => {
      const date = new Date();
      const dateTime = date.toLocaleString();

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      // Left: Generated date
      doc.text(`Generated on: ${dateTime}`, 40, pageHeight - 10);

      // Right: Page x/y
      doc.text(
        `Page: ${pageNumber} / ${totalPages}`,
        pageWidth - 80,
        pageHeight - 10
      );
    };

    // --- Table ---
    doc.autoTable({
      html: tableRef.current,
      startY: titleY + 20,
      margin: { top: 10, left: 5, right: 5, bottom: 20 },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        overflow: "linebreak",
        halign: "center",
        valign: "middle",
        lineWidth: 0.5,
        lineColor: [200, 200, 200],
      },
      headStyles: {
        fillColor: [64, 89, 173],
        textColor: [255, 255, 255],
        fontSize: 8,
        lineWidth: 0.5,
        lineColor: [200, 200, 200],
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
      },
      didDrawPage: (data) => {
        const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;

        // Placeholder for total pages
        const totalPagesExp = "{total_pages_count_string}";

        footer(doc, pageNumber, totalPagesExp);
      },
    });

    // Replace placeholder with total pages
    if (typeof doc.putTotalPages === "function") {
      doc.putTotalPages("{total_pages_count_string}");
    }

    // Save PDF
    doc.save("DataComparisonSheetForCriticalKPIs.pdf");
  };

  // For Modal PDF
  const exportModalToPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Title ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const title = "Data Comparison Sheet For Critical KPIs state-wise";
    const titleWidth = doc.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
    const titleY = 30;
    doc.text(title, titleX, titleY);

    // --- Scheme + KPI in same row (centered) ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const schemeKpiText = `Scheme: ${
      selectedRow?.Project_Name_E || ""
    }    |    KPI: ${selectedRow?.KPI_Name_E || ""}`;
    const schemeKpiWidth = doc.getTextWidth(schemeKpiText);
    const schemeKpiX = (pageWidth - schemeKpiWidth) / 2;
    const schemeKpiY = titleY + 20;
    doc.text(schemeKpiText, schemeKpiX, schemeKpiY);

    // --- Footer function ---
    const footer = (doc, pageNumber, totalPages) => {
      const date = new Date();
      const dateTime = date.toLocaleString();
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      // Left: Generated date
      doc.text(`Generated on: ${dateTime}`, 40, pageHeight - 10);

      // Right: Page x/y
      doc.text(
        `Page: ${pageNumber} / ${totalPages}`,
        pageWidth - 80,
        pageHeight - 10
      );
    };

    // --- Table ---
    doc.autoTable({
      html: modalTableRef.current,
      startY: schemeKpiY + 20,
      margin: { top: 10, left: 5, right: 5, bottom: 20 },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        overflow: "linebreak",
        halign: "center",
        valign: "middle",
        lineWidth: 0.5,
        lineColor: [200, 200, 200],
      },
      headStyles: {
        fillColor: [64, 89, 173],
        textColor: [255, 255, 255],
        fontSize: 12,
        lineWidth: 1,
        lineColor: [200, 200, 200],
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
      },
      didDrawPage: (data) => {
        const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
        const totalPagesExp = "{total_pages_count_string}";
        footer(doc, pageNumber, totalPagesExp);
      },
    });

    // Replace placeholder with total pages
    if (typeof doc.putTotalPages === "function") {
      doc.putTotalPages("{total_pages_count_string}");
    }

    // Save PDF
    doc.save("DataComparisonSheetForCriticalKPIsState-wise.pdf");
  };

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden"; // disable background scroll
    } else {
      document.body.style.overflow = "auto"; // re-enable scroll
    }

    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);

  return (
    <div>
      <nav className="bg-[#4059ad] text-white p-2 flex items-center justify-between">
        <div className="text-xl font-bold">
          Data Comparison B/W DARPAN & Prayas Portal
        </div>
        <div className="flex space-x-2">
          <button
            className="flex items-center justify-center py-1 px-3 bg-[#4f67b7] text-white hover:bg-gray-700 transition-colors duration-200 rounded"
            onClick={() => navigate("/sanity")}
          >
            <FontAwesomeIcon icon={faHome} />
          </button>
          <button
            className="bg-white text-[#4f67b7] font-medium px-4 py-1 rounded-md hover:bg-gray-700 transition-colors duration-200"
            onClick={() => navigate("/sanity")}
          >
            Summary
          </button>
          <button
            className="bg-[#4f67b7] text-white px-4 py-1 rounded-md hover:bg-gray-700 transition-colors duration-200"
            onClick={() => navigate("/pullData")}
          >
            Pull Data
          </button>
        </div>
      </nav>

      {/* Summary */}
      <div className="px-10 py-5 bg-white">
        <div className="bg-gray-200 p-4 rounded-lg text-center font-semibold text-[#004d99] mb-4">
          {titleDetails.totalSchemsCount} Schemes having{" "}
          {titleDetails.totalKpisCount} kpis have been Compared as on :{" "}
          {titleDetails.latestDate} || {titleDetails.totalSchemeMatch} Schemes
          and {titleDetails.totalKpisMatch} kpis are Matching ||{" "}
          {titleDetails.totalSchemesNotMatch} Schemes and{" "}
          {titleDetails.totalKpisNotMatch} kpis are not Matching
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <a href="#">
              <img
                src={excelicon}
                alt="Excel"
                className="h-8 w-8"
                onClick={() => exportToExcel(filteredRawData)}
              />
            </a>
            <a href="#">
              <img
                src={pdfIcon}
                alt="PDF"
                className="h-8 w-8"
                onClick={exportToPDF}
              />
            </a>
            {activeFilter !== "ALL" && (
              <button
                className="bg-[#4f67b7] text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors duration-200"
                onClick={() => setActiveFilter("ALL")}
              >
                All Records
              </button>
            )}
          </div>
          <div className="flex space-x-4 text-sm font-medium">
            <div
              className={`flex items-center border-2 ${
                activeFilter === "MATCHED" ? "bg-[#4f67b7] text-white" : ""
              } rounded-md p-2 cursor-pointer`}
              onClick={() => setActiveFilter("MATCHED")}
            >
              <div className="w-4 h-4 mr-1 bg-green-500 border border-gray-400"></div>
              Matched
            </div>

            <div className="flex rounded-md border-2">
              <div
                className={`flex items-center ${
                  activeFilter === "MISMATCHED" ? "bg-[#4f67b7] text-white" : ""
                } p-2 cursor-pointer`}
                onClick={() => setActiveFilter("MISMATCHED")}
              >
                <div className="w-4 h-4 mr-1 bg-red-500 border "></div>
                Mismatched
              </div>
              <div
                className={`flex items-center  ${
                  activeFilter === "MISMATCHED_DATE"
                    ? "bg-[#4f67b7] text-white"
                    : ""
                } p-2 cursor-pointer border-l `}
                onClick={() => setActiveFilter("MISMATCHED_DATE")}
              >
                Mismatched with Date Diff.
              </div>
              <div
                className={`flex items-center ${
                  activeFilter === "MISMATCHED_NO_DATE"
                    ? "bg-[#4f67b7] text-white"
                    : ""
                }  p-2 cursor-pointer border-l `}
                onClick={() => setActiveFilter("MISMATCHED_NO_DATE")}
              >
                Mismatched without Date Diff.
              </div>
            </div>
          </div>
        </div>

        {/* Table - Add the ref here */}

        {sanityLoader ? (
          <Loader />
        ) : filteredDataForRender && filteredDataForRender.length === 0 ? (
          <div className="p-4 text-center">No details available.</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table
              ref={tableRef}
              className="w-full text-sm text-left text-gray-700 border-collapse border border-gray-600"
            >
              <thead>
                <tr className="bg-[#4059ad] text-white">
                  <th
                    rowSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  >
                    SL No.
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  >
                    Scheme Name
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  >
                    KPI Name
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  >
                    Unit
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  >
                    Date Freq.
                  </th>
                  <th
                    colSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  >
                    Darpan Data
                  </th>
                  <th
                    colSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  >
                    Prayas Data
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  >
                    Diff. (A-B)
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  >
                    Diff. Percentage (%)
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-gray-300 text-center"
                  ></th>
                </tr>
                <tr className="bg-[#4059ad] text-white">
                  <th className="p-2 border border-gray-300 text-center">
                    Date
                  </th>
                  <th className="p-2 border border-gray-300 text-center">
                    Value (A)
                  </th>
                  <th className="p-2 border border-gray-300 text-center">
                    Date
                  </th>
                  <th className="p-2 border border-gray-300 text-center">
                    Value (B)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDataForRender.map((item, idx) => {
                  const darpanDate = item?.PrayasDate?.split(" ")[0];
                  const prayasDate = item?.CedaDate?.split(" ")[0];
                  const diff = getDiff(item.outvalue, item.CedaValue);
                  const percentage = getPercentage(
                    item.outvalue,
                    item.CedaValue
                  );
                  return (
                    <tr key={idx}>
                      {item.showSno && (
                        <td
                          className="p-3 border border-gray-300"
                          rowSpan={item.rowSpan}
                        >
                          {item.sno}
                        </td>
                      )}
                      {item.showScheme && (
                        <td
                          className="p-3 border border-gray-300"
                          rowSpan={item.rowSpan}
                        >
                          {item.Project_Name_E}
                        </td>
                      )}

                      <td className="p-3 border border-gray-300">
                        {item.KPI_Name_E}
                      </td>
                      <td className="p-3 border border-gray-300">
                        {item.Unit_Name}
                      </td>
                      <td className="p-3 border border-gray-300">
                        {item.Data_Freq}
                      </td>

                      {item.showDarpanDate && (
                        <td
                          className={`p-3 border border-gray-300 text-nowrap ${
                            darpanDate !== prayasDate
                              ? "text-red-600 font-bold"
                              : ""
                          }`}
                          rowSpan={item.rowSpan}
                        >
                          {darpanDate}
                        </td>
                      )}
                      <td className="p-3 border border-gray-300">
                        {item.outvalue}
                      </td>

                      {item.showPrayasDate && (
                        <td
                          className={`p-3 border border-gray-300 text-nowrap ${
                            darpanDate !== prayasDate
                              ? "text-red-600 font-bold"
                              : ""
                          }`}
                          rowSpan={item.rowSpan}
                        >
                          {prayasDate}
                        </td>
                      )}
                      <td className="p-3 border border-gray-300">
                        {item.CedaValue}
                      </td>

                      <td
                        className={`p-3 border border-gray-300 ${
                          diff !== 0
                            ? "bg-red-500 text-white"
                            : "bg-green-500 text-black"
                        }`}
                      >
                        {diff}
                      </td>
                      <td
                        className={`p-3 border border-gray-300 ${
                          diff !== 0
                            ? "bg-red-500 text-white"
                            : "bg-green-500 text-black"
                        }`}
                      >
                        {percentage}
                      </td>
                      <td className="p-3 border border-gray-300 text-center">
                        <button
                          className="btn rounded-md p-1 text-white bg-[#4f67b7] cursor-pointer"
                          type="button"
                          onClick={() => handleOpenPopup(item)}
                        >
                          <FontAwesomeIcon icon={faAngleDoubleRight} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 pt-3">
          <div className="bg-white max-h-[95vh] rounded-lg shadow-lg p-6 relative overflow-y-auto">
            {/* Close button */}
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-red-600"
              onClick={handleClosePopup}
            >
              <FontAwesomeIcon icon={faClose} />
            </button>

            <div className="flex mb-4">
              <div className="flex-grow">
                <h5 className="font-semibold">
                  <span className="font-bold">Scheme :</span>{" "}
                  {selectedRow?.Project_Name_E}
                </h5>
                <h3 className="font-medium">
                  <span className="font-bold">KPI :</span>{" "}
                  {selectedRow?.KPI_Name_E}
                </h3>
              </div>
              <div className="flex justify-end items-end space-x-4">
                <a href="#">
                  <img
                    src={excelicon}
                    alt="Excel"
                    className="h-8 w-8 "
                    onClick={() => exportModalDataToExcel(modalData)}
                  />
                </a>
                <a href="#">
                  <img
                    src={pdfIcon}
                    alt="PDF"
                    className="h-8 w-8"
                    onClick={exportModalToPDF}
                  />
                </a>
              </div>
            </div>
            {/* Scrollable table */}
            <div className="max-h-[747px] overflow-y-auto border rounded">
              {sanityLoader || detailDataLoader ? (
                <Loader />
              ) : modalData && modalData.length === 0 ? (
                <div className="p-4 text-center">No details available.</div>
              ) : (
                <table
                  className="w-full text-sm text-left border-collapse"
                  ref={modalTableRef}
                >
                  <thead className="sticky top-0 bg-[#4059ad] text-white z-10">
                    <tr>
                      <th className="p-2 border border-gray-300 text-center">
                        State Code
                      </th>
                      <th className="p-2 border border-gray-300 text-center">
                        State
                      </th>
                      <th className="p-2 border border-gray-300 text-center">
                        Darpan Value
                      </th>
                      <th className="p-2 border border-gray-300 text-center">
                        Prayas Value
                      </th>
                      <th className="p-2 border border-gray-300 text-center">
                        Diff.
                      </th>
                      <th className="p-2 border border-gray-300 text-center">
                        Diff. %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData && modalData.length > 0 ? (
                      modalData.map((item, index) => (
                        <tr key={index}>
                          <td className="p-2 border border-gray-300 text-center">
                            {item.statecode}
                          </td>
                          <td className="p-2 border border-gray-300 text-center">
                            {item.statename}
                          </td>
                          <td
                            className={`p-2 border border-gray-300 text-center ${
                              getDiff(
                                item.Localkpi_Value,
                                item.Viewkpi_value
                              ) !== 0
                                ? "bg-red-500 text-white"
                                : "bg-green-500 text-black"
                            }`}
                          >
                            {item.Localkpi_Value}
                          </td>
                          <td
                            className={`p-2 border border-gray-300 text-center ${
                              getDiff(
                                item.Localkpi_Value,
                                item.Viewkpi_value
                              ) !== 0
                                ? "bg-red-500 text-white"
                                : "bg-green-500 text-black"
                            }`}
                          >
                            {item.Viewkpi_value}
                          </td>
                          <td
                            className={`p-2 border border-gray-300 text-center ${
                              getDiff(
                                item.Localkpi_Value,
                                item.Viewkpi_value
                              ) !== 0
                                ? "bg-red-500 text-white"
                                : "bg-green-500 text-black"
                            }`}
                          >
                            {getDiff(item.Localkpi_Value, item.Viewkpi_value)}
                          </td>
                          <td
                            className={`p-2 border border-gray-300 text-center ${
                              getDiff(
                                item.Localkpi_Value,
                                item.Viewkpi_value
                              ) !== 0
                                ? "bg-red-500 text-white"
                                : "bg-green-500 text-black"
                            }`}
                          >
                            {getPercentage(
                              item.Localkpi_Value,
                              item.Viewkpi_value
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-2 border border-gray-300 text-center"
                        >
                          No details available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sanity;
