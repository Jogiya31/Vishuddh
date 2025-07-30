import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Download as DownloadIcon } from "lucide-react"; // Modern icon library
const parseNumber = (val) => {
  if (val === "NA" || val === undefined || val === null || val === "")
    return val;
  const number = parseFloat(val.toString().replace(/,/g, ""));
  return isNaN(number) ? val : number;
};
const applyExcelStyling = (worksheet, headers, height, color = "4F81BD") => {
  // Apply bold styling, blue background, and center alignment to headers
  const headerRow = worksheet.addRow(headers);
  headerRow?.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: color }, // Blue background
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "A9A9A9" } }, // Dark Gray border
      left: { style: "thin", color: { argb: "A9A9A9" } },
      bottom: { style: "thin", color: { argb: "A9A9A9" } },
      right: { style: "thin", color: { argb: "A9A9A9" } },
    };
  });
  headerRow.height = 50;
  // Auto-size columns
  worksheet.columns.forEach((column) => {
    column.width = 20;
  });
  headerRow.height = height;

  // Freeze header row
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
};
const now = new Date();
const timestamp = now
  .toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, //
  })
  .replace(/\//g, "-")
  .replace(/, /g, "_")
  .replace(/:/g, "-");
const Download = ({
  tableData,
  states,
  stateDistrictMapping,
  district,
  state,
  mappingData,
  schemeDepartmentMapping,
  schemeSectorMapping,
  stateName,
  districtName,
  showDepartmentView,
  showScemeView,
  showDeptAPI,
  showDeptExcel,
  reportName,
}) => {
  const downloadExcelState = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("State Data");
    const headers1 = ["", ""];
    const headers = ["State Name", "State Code"];
    let index = 0;
    Object.keys(tableData).forEach((schemeKey) => {
      Object.keys(tableData[schemeKey]).forEach((kpiKey) => {
        headers1.push(++index);
        headers.push(`${schemeKey}|${kpiKey}`);
      });
    });
    applyExcelStyling(worksheet, headers1, 30); // Apply general styling to headers
    applyExcelStyling(worksheet, headers, 60); // Apply general styling to headers

    // Add header row
    states.forEach((state) => {
      const rowData = [
        state["state_name"],
        state["state_id"],
        ...Object.keys(tableData).flatMap((schemeKey) =>
          Object.keys(tableData[schemeKey]).map((kpiKey) => {
            const stateData =
              tableData[schemeKey][kpiKey][state["state_name"]] || {};
            const prayasValue = stateData.prayasValue || "-";
            const schemeDashDiffPercent = stateData.schemeDashDiffPercent || 0;
            return prayasValue; // Store only the numeric value in rowData
          })
        ),
      ];

      const row = worksheet.addRow(rowData);
      row?.eachCell((cell, colNumber) => {
        cell.alignment = {
          horizontal:
            colNumber <= 2 ? (colNumber == 1 ? "left" : "center") : "right", // Center align first 2 columns, right align the rest
          vertical: "middle",
          wrapText: true,
        };

        if (typeof cell.value === "number") {
          cell.numFmt = "#,##0"; // Format with comma separator
        }
      });

      // Apply conditional background color
      let colNumber = 3; // Start from 3rd column (after state name & state_id)

      Object.keys(tableData).forEach((schemeKey) => {
        Object.keys(tableData[schemeKey]).forEach((kpiKey) => {
          const stateData =
            tableData[schemeKey][kpiKey][state["state_name"]] || {};
          const schemeDashDiffPercent = stateData.schemeDashDiffPercent || 0;

          const bgColor =
            schemeDashDiffPercent === 0
              ? "99FF99"
              : schemeDashDiffPercent > 5
              ? "FF9999"
              : "FFFF99"; // Red if >5, Green otherwise

          // const cell = row?.getCell(colNumber);
          // cell.fill = {
          //   type: "pattern",
          //   pattern: "solid",
          //   fgColor: { argb: bgColor },
          // };

          // colNumber++; // Move to the next column
        });
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `PmoReportState_${timestamp}.xlsx`);
  };

  const downloadExcelDistrict = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("District Data");

    const headers = [
      "State Name",
      "State Code",
      "District Name",
      "District Code",
    ];
    const headers1 = ["", "", "", ""];
    let index = 0;
    Object.keys(tableData).forEach((schemeKey) => {
      Object.keys(tableData[schemeKey]).forEach((kpiKey) => {
        headers1.push(++index);
        headers.push(`${schemeKey}|${kpiKey}`);
      });
    });

    applyExcelStyling(worksheet, headers1, 30);
    applyExcelStyling(worksheet, headers, 60);

    Object.keys(stateDistrictMapping).forEach((state) => {
      stateDistrictMapping[state]["districts"].forEach((district) => {
        const rowData = [
          state,
          stateDistrictMapping[state]["state_id"],
          district["district_name"],
          district["district_id"],
          ...Object.keys(tableData).flatMap((schemeKey) =>
            Object.keys(tableData[schemeKey]).map((kpiKey) => {
              const prayasValue =
                tableData[schemeKey][kpiKey][state]?.[district["district_name"]]
                  ?.prayasValue || "-";
              const schemeDashDiffPercent =
                tableData[schemeKey][kpiKey][state]?.[district["district_name"]]
                  ?.schemeDashDiffPercent || 0;

              // Convert prayasValue to a number (removing commas)

              return prayasValue;
            })
          ),
        ];

        const row = worksheet.addRow(rowData);
        row?.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal:
              colNumber <= 4
                ? colNumber == 1 || colNumber == 3
                  ? "left"
                  : "center"
                : "right", // Center align first 2 columns, right align the rest
            vertical: "middle",
            wrapText: true,
          };
          if (typeof cell.value === "number") {
            cell.numFmt = "#,##0"; // Format with comma separator
          }
        });
        // Apply conditional background color
        // row?.eachCell((cell, colNumber) => {
        //   if (colNumber > 4) { // Ignore "State Name", "State Code", "District Name", "District Code"
        //     const cellValue = row?.getCell(colNumber).value;
        //     const schemeDashDiffPercent = cellValue.schemeDashDiffPercent || 0;

        //     // Define background color based on `schemeDashDiffPercent`
        //     const bgColor =
        //       schemeDashDiffPercent === 0 ? "99FF99" : // Green
        //       schemeDashDiffPercent > 5 ? "FF9999" :   // Red
        //       "FFFF99"; // Yellow

        //     cell.fill = {
        //       type: "pattern",
        //       pattern: "solid",
        //       fgColor: { argb: bgColor },
        //     };

        //     // Ensure the cell only shows the numeric value
        //     cell.value = cellValue.value;
        //   }
        // });
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `PmoReportDistrict_${timestamp}.xlsx`);
  };
  //Download National Excel Summary
  const downloadExcelSummary = async (
    outputData,
    mappingData,
    schemeSectorMapping,
    schemeDepartmentMapping
  ) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${reportName}`);

    // First Row (Merged Header)
    let headerRow1 = [];
    let mergeRanges = []; // Store merge cell ranges

    Object.keys(outputData).forEach((schemeKey, schemeIndex) => {
      Object.keys(outputData[schemeKey]).forEach((kpiKey, kpiIndex) => {
        let colStart = headerRow1.length + 1; // Start column index
        headerRow1.push(
          `${schemeKey} | ${kpiKey} (${mappingData[schemeKey][0]["Frequency"]})`
        );
        let colCount = 3; // Sector Name, Department Name
        if (showDepartmentView) colCount += 3;
        if (showScemeView) colCount += 3;
        if (showDeptExcel) colCount += 3;
        if (showDeptAPI) colCount += 3;
        headerRow1.push(...Array(colCount - 1).fill(""));

        let colEnd = colStart + colCount - 1; // End column index (dynamic)
        mergeRanges.push({ start: colStart, end: colEnd });
      });
    });
    applyExcelStyling(worksheet, headerRow1, 50, "366092");
    mergeRanges.forEach(({ start, end }) => {
      worksheet.mergeCells(1, start, 1, end); // Merging in first row
    });

    // Second Row
    let headerRow2 = [];
    Object.keys(outputData).forEach((schemeKey) => {
      Object.keys(outputData[schemeKey]).forEach((kpiKey) => {
        headerRow2.push("Sector Name", "Department Name");
        headerRow2.push(
          `Prayas Value(A)\n${
            outputData[schemeKey][kpiKey]["India"]?.["prayas_date_of_data"] ||
            ""
          }`
        );
        if (showDepartmentView) {
          headerRow2.push(
            `Department Dashboard (via Web Scraping) ${
              outputData[schemeKey][kpiKey]["India"]?.["date_of_data"] || ""
            }`,
            "",
            ""
          );
        }
        if (showScemeView) {
          headerRow2.push(
            `Prayas Scheme Dashboard Views  ${
              outputData[schemeKey][kpiKey]["India"]?.["scheme_date_of_data"] ||
              ""
            }`,
            "",
            ""
          );
        }
        if (showDeptExcel) {
          headerRow2.push("Department Value (via Excel)", "", "");
        }
        if (showDeptAPI) {
          headerRow2.push("Department Value (via API)", "", "");
        }
      });
    });

    applyExcelStyling(worksheet, headerRow2, 50, "366092");

    // Dynamically merge based on schemes (adjusting columns for each set)

    mergeRanges.forEach(({ start }) => {
      let col = start + 2; // After "Sector Name" and "Department Name"
      if (showDepartmentView) {
        worksheet.mergeCells(2, col + 1, 2, col + 3);
        col += 3;
      }
      if (showScemeView) {
        worksheet.mergeCells(2, col + 1, 2, col + 3);
        col += 3;
      }
      if (showDeptExcel) {
        worksheet.mergeCells(2, col + 1, 2, col + 3);
        col += 3;
      }
      if (showDeptAPI) {
        worksheet.mergeCells(2, col + 1, 2, col + 3);
        col += 3;
      }
    });
    // Third Row
    let headerRow3 = [];
    Object.keys(outputData).forEach((schemeKey) => {
      Object.keys(outputData[schemeKey]).forEach(() => {
        headerRow3.push("", "", "");
        if (showDepartmentView) {
          headerRow3.push("Value (B)", "Difference (B-A)", "Difference%");
        }
        if (showScemeView) {
          headerRow3.push("Value (C)", "Difference (C-A)", "Difference%");
        }
        if (showDeptExcel) {
          headerRow3.push("Value (D)", "Difference (D-A)", "Difference%");
        }
        if (showDeptAPI) {
          headerRow3.push("Value (E)", "Difference (E-A)", "Difference%");
        }
      });
    });
    applyExcelStyling(worksheet, headerRow3, 20, "366092");

    let rowDataArray = [];
    let diffColumns = []; // Store indexes of Difference columns
    let diffPercentColumns = []; // Store indexes of Difference % columns
    Object.keys(outputData).forEach((schemeKey) => {
      Object.keys(outputData[schemeKey]).forEach((keyRow) => {
        let rowData = outputData[schemeKey][keyRow]["India"] || {};
        rowDataArray.push(
          schemeSectorMapping[schemeKey],
          schemeDepartmentMapping[schemeKey]
        );
        rowDataArray.push(rowData.prayasValue ?? "NA");
        let startIndex = rowDataArray.length; // Track start index for this scheme
        if (showDepartmentView) {
          rowDataArray.push(
            rowData.nativeDashValue ?? "NA",
            rowData.nativeDashDiff ?? "NA",
            rowData.nativeDashDiffPercent ?? "NA"
          );
        }
        if (showScemeView) {
          rowDataArray.push(
            rowData.schemeDashValue ?? "NA",
            rowData.schemeDashDiff ?? "NA",
            rowData.schemeDashDiffPercent ?? "NA"
          );
        }
        if (showDeptExcel) {
          rowDataArray.push(
            rowData.deptExcelValue ?? "NA",
            rowData.deptExcelDiff ?? "NA",
            rowData.deptExcelDiffPercent ?? "NA"
          );
        }
        if (showDeptAPI) {
          rowDataArray.push(
            rowData.deptApiValue ?? "NA",
            rowData.deptApiDiff ?? "NA",
            rowData.deptApiDiffPercent ?? "NA"
          );
        }

        // Store indexes dynamically for Difference & Difference %
        for (let i = startIndex; i < rowDataArray.length; i++) {
          if ((i - startIndex) % 3 === 1) {
            diffColumns.push(i + 1); // Difference columns
          } else if ((i - startIndex) % 3 === 2) {
            diffPercentColumns.push(i + 1); // Difference % columns
          }
        }
      });
    });

    let excelRow = worksheet.addRow(rowDataArray);

    // Apply Alignment & Conditional Coloring Dynamically
    excelRow?.eachCell((cell, colNumber) => {
      cell.alignment = {
        horizontal: colNumber <= 2 ? "center" : "right",
        vertical: "middle",
        wrapText: true,
      };
      if (typeof cell.value === "number") {
        cell.numFmt = "#,##0"; // Format with comma separator
      }
      let bgColor = null;
      if (diffColumns.includes(colNumber)) {
        let percentageValue =
          rowDataArray[colNumber - 1] != 0
            ? parseFloat(rowDataArray[colNumber - 1]) || "NA"
            : 0; // Get Difference Value

        let percentage = parseFloat(rowDataArray[colNumber]) || "NA"; // Get Percentage Value

        if (percentageValue != "NA") {
          bgColor =
            percentageValue === 0
              ? "81FFBA" // Green for 0%
              : percentageValue < 0
              ? "f37a78"
              : percentage > 3 || percentage < 0
              ? "FFC107" // Red for >3% or negative values
              : "f2e092"; // Yellow for intermediate values
        }
      }

      if (diffPercentColumns.includes(colNumber)) {
        let percentage = parseFloat(rowDataArray[colNumber - 1]) || "NA"; // Get Percentage Value
        let percentageValue =
          rowDataArray[colNumber - 2] != 0
            ? parseFloat(rowDataArray[colNumber - 2]) || "NA"
            : 0; // Get Difference Value
        if (percentageValue != "NA") {
          bgColor =
            percentageValue === 0
              ? "81FFBA" // Green for 0%
              : percentageValue < 0
              ? "f37a78"
              : percentage > 3
              ? "FFC107" // orange for >3% or negative values
              : "f2e092"; // Yellow for intermediate values
        }
      }

      // Apply Background Color
      if (bgColor) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgColor },
        };
      }

      if (bgColor) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgColor },
        };
      }
    });

    // Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `NationalSummary_${timestamp}.xlsx`);
  };
  //Download State Excel Summary
  const downloadStateSummary = async (
    outputData,
    filteredStates,
    mappingData,
    schemeSectorMapping,
    schemeDepartmentMapping
  ) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${reportName}`);

    // First Row (Merged Header)
    let headerRow1 = ["", ""];
    let mergeRanges = []; // Store merge cell ranges

    Object.keys(outputData).forEach((schemeKey, schemeIndex) => {
      Object.keys(outputData[schemeKey]).forEach((kpiKey, kpiIndex) => {
        let colStart = headerRow1.length + 1; // Start column index
        headerRow1.push(
          `${schemeKey} | ${kpiKey} (${mappingData[schemeKey][0]["Frequency"]})`
        );
        let colCount = 3; // Sector Name, Department Name
        if (showDepartmentView) colCount += 3;
        if (showScemeView) colCount += 3;
        if (showDeptExcel) colCount += 3;
        if (showDeptAPI) colCount += 3;
        headerRow1.push(...Array(colCount - 1).fill(""));

        let colEnd = colStart + colCount - 1; // End column index (dynamic)
        mergeRanges.push({ start: colStart, end: colEnd });
      });
    });
    applyExcelStyling(worksheet, headerRow1, 50, "366092");
    mergeRanges.forEach(({ start, end }) => {
      worksheet.mergeCells(1, start, 1, end); // Merging in first row
    });

    // Second Row
    let headerRow2 = ["State", "State Code"];
    Object.keys(outputData).forEach((schemeKey) => {
      Object.keys(outputData[schemeKey]).forEach((kpiKey) => {
        headerRow2.push(
          "Sector Name",
          "Department Name",
          `Prayas Value(A) \n  ${
            outputData[schemeKey][kpiKey][stateName]?.["prayas_date_of_data"] ||
            ""
          }`
        );
        if (showDepartmentView) {
          headerRow2.push(
            `Department Dashboard (via Web Scraping) ${
              outputData[schemeKey][kpiKey][stateName]?.["date_of_data"] || ""
            }`,
            "",
            ""
          );
        }
        if (showScemeView) {
          headerRow2.push(
            `Prayas Scheme Dashboard Views  ${
              outputData[schemeKey][kpiKey][stateName]?.[
                "scheme_date_of_data"
              ] || ""
            }`,
            "",
            ""
          );
        }
        if (showDeptExcel) {
          headerRow2.push("Department Value (via Excel)", "", "");
        }
        if (showDeptAPI) {
          headerRow2.push("Department Value (via API)", "", "");
        }
      });
    });

    applyExcelStyling(worksheet, headerRow2, 50, "366092");

    // Dynamically merge based on schemes (adjusting columns for each set)

    mergeRanges.forEach(({ start }) => {
      // Start after "Sector Name", "Department Name", "Prayas Value(A)"
      let col = start + 3;
      if (showDepartmentView) {
        worksheet.mergeCells(2, col, 2, col + 2); // Merge 3 columns for Department Dashboard
        col += 3;
      }
      if (showScemeView) {
        worksheet.mergeCells(2, col, 2, col + 2); // Merge 3 columns for Scheme Dashboard
        col += 3;
      }
      if (showDeptExcel) {
        worksheet.mergeCells(2, col, 2, col + 2); // Merge 3 columns for Excel
        col += 3;
      }
      if (showDeptAPI) {
        worksheet.mergeCells(2, col, 2, col + 2); // Merge 3 columns for API
        col += 3;
      }
    });
    // Third Row
    let headerRow3 = ["", ""];
    Object.keys(outputData).forEach((schemeKey) => {
      Object.keys(outputData[schemeKey]).forEach(() => {
        headerRow3.push("", "", "");

        if (showDepartmentView) {
          headerRow3.push("Value (B)", "Difference (B-A)", "Difference%");
        }
        if (showScemeView) {
          headerRow3.push("Value (C)", "Difference (C-A)", "Difference%");
        }
        if (showDeptExcel) {
          headerRow3.push("Value (D)", "Difference (D-A)", "Difference%");
        }
        if (showDeptAPI) {
          headerRow3.push("Value (E)", "Difference (E-A)", "Difference%");
        }
      });
    });
    applyExcelStyling(worksheet, headerRow3, 20, "366092");

    filteredStates.forEach((state) => {
      let rowDataArray = [state["state_name"], state["state_id"]];
      let diffColumns = []; // Store indexes of Difference columns
      let diffPercentColumns = []; // Store indexes of Difference % columns

      Object.keys(outputData).forEach((schemeKey) => {
        Object.keys(outputData[schemeKey]).forEach((keyRow) => {
          let rowData =
            outputData[schemeKey][keyRow][state["state_name"]] || {};

          rowDataArray.push(
            schemeSectorMapping[schemeKey],
            schemeDepartmentMapping[schemeKey]
          );
          rowDataArray.push(rowData.prayasValue ?? "NA");
          let startIndex = rowDataArray.length; // Track start index for this scheme
          if (showDepartmentView) {
            rowDataArray.push(
              rowData.nativeDashValue ?? "NA",
              rowData.nativeDashDiff ?? "NA",
              rowData.nativeDashDiffPercent ?? "NA"
            );
          }
          if (showScemeView) {
            rowDataArray.push(
              rowData.schemeDashValue ?? "NA",
              rowData.schemeDashDiff ?? "NA",
              rowData.schemeDashDiffPercent ?? "NA"
            );
          }
          if (showDeptExcel) {
            rowDataArray.push(
              rowData.deptExcelValue ?? "NA",
              rowData.deptExcelDiff ?? "NA",
              rowData.deptExcelDiffPercent ?? "NA"
            );
          }
          if (showDeptAPI) {
            rowDataArray.push(
              rowData.deptApiValue ?? "NA",
              rowData.deptApiDiff ?? "NA",
              rowData.deptApiDiffPercent ?? "NA"
            );
          }

          // Store indexes dynamically for Difference & Difference %
          for (let i = startIndex; i < rowDataArray.length; i++) {
            if ((i - startIndex) % 3 === 1) {
              diffColumns.push(i + 1); // Difference columns
            } else if ((i - startIndex) % 3 === 2) {
              diffPercentColumns.push(i + 1); // Difference % columns
            }
          }
        });
      });

      let excelRow = worksheet.addRow(rowDataArray);

      // Apply Alignment & Conditional Coloring Dynamically
      excelRow?.eachCell((cell, colNumber) => {
        cell.alignment = {
          horizontal: colNumber <= 2 ? "center" : "right",
          vertical: "middle",
          wrapText: true,
        };
        if (typeof cell.value === "number") {
          const isFloat = !Number.isInteger(cell.value);
          cell.numFmt = isFloat ? "#,##0.00" : "#,##0";
        }
        let bgColor = null;
        if (diffColumns.includes(colNumber)) {
          let percentageValue =
            rowDataArray[colNumber - 1] != 0
              ? parseFloat(rowDataArray[colNumber - 1]) || "NA"
              : 0; // Get Difference Value

          let percentage = parseFloat(rowDataArray[colNumber]) || "NA"; // Get Percentage Value

          if (percentageValue != "NA") {
            bgColor =
              percentageValue === 0
                ? "81FFBA" // Green for 0%
                : percentageValue < 0
                ? "f37a78"
                : percentage > 3
                ? "FFC107" // Red for >3% or negative values
                : "f2e092"; // Yellow for intermediate values
          }
        }

        if (diffPercentColumns.includes(colNumber)) {
          let percentage = parseFloat(rowDataArray[colNumber - 1]) || "NA"; // Get Percentage Value
          let percentageValue =
            rowDataArray[colNumber - 2] != 0
              ? parseFloat(rowDataArray[colNumber - 2]) || "NA"
              : 0; // Get Difference Value
          if (percentageValue != "NA") {
            bgColor =
              percentageValue === 0
                ? "81FFBA" // Green for 0%
                : percentageValue < 0
                ? "f37a78"
                : percentage > 3
                ? "FFC107" // Red for >3% or negative values
                : "f2e092"; // Yellow for intermediate values
          }
        }

        //Apply Background Color
        if (bgColor) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bgColor },
          };
        }

        if (bgColor) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bgColor },
          };
        }
      });
    });

    // Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `StateSummary_${timestamp}.xlsx`);
  };
  //Download District Excel Summary
  const downloadDistrictSummary = async (
    outputData,
    stateDistrictMapping,
    mappingData,
    schemeSectorMapping,
    schemeDepartmentMapping
  ) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${reportName}`);

    // First Row (Merged Header)
    let headerRow1 = ["", "", "", ""];
    let mergeRanges = []; // Store merge cell ranges

    Object.keys(outputData).forEach((schemeKey, schemeIndex) => {
      Object.keys(outputData[schemeKey]).forEach((kpiKey, kpiIndex) => {
        let colStart = headerRow1.length + 1; // Start column index
        headerRow1.push(
          `${schemeKey} | ${kpiKey} (${mappingData?.[schemeKey]?.[0]?.["Frequency"]})`
        );
        let colCount = 3; // Sector Name, Department Name
        if (showDepartmentView) colCount += 3;
        if (showScemeView) colCount += 3;
        if (showDeptExcel) colCount += 3;
        if (showDeptAPI) colCount += 3;
        headerRow1.push(...Array(colCount - 1).fill(""));

        let colEnd = colStart + colCount - 1; // End column index (dynamic)
        mergeRanges.push({ start: colStart, end: colEnd });
      });
    });
    applyExcelStyling(worksheet, headerRow1, 50, "366092");
    mergeRanges.forEach(({ start, end }) => {
      worksheet.mergeCells(1, start, 1, end); // Merging in first row
    });

    // Second Row
    let headerRow2 = ["State", "State Code", "District", "District Code"];
    Object.keys(outputData).forEach((schemeKey) => {
      Object.keys(outputData[schemeKey]).forEach((kpiKey) => {
        headerRow2.push(
          "Sector Name",
          "Department Name",
          `Prayas Value(A)\n
           ${
             outputData[schemeKey]?.[kpiKey]?.[stateName]?.[[districtName]]?.[
               "prayas_date_of_data"
             ] || ""
           }`
        );
        if (showDepartmentView) {
          headerRow2.push(
            `Department Dashboard (via Web Scraping) ${
              outputData[schemeKey]?.[kpiKey]?.[stateName]?.[[districtName]]?.[
                "date_of_data"
              ] || ""
            }`,
            "",
            ""
          );
        }
        if (showScemeView) {
          headerRow2.push(
            `Prayas Scheme Dashboard Views ${
              outputData[schemeKey]?.[kpiKey]?.[stateName]?.[[districtName]]?.[
                "scheme_date_of_data"
              ] || ""
            }`,
            "",
            ""
          );
        }
        if (showDeptExcel) {
          headerRow2.push("Department Value (via Excel)", "", "");
        }
        if (showDeptAPI) {
          headerRow2.push("Department Value (via API)", "", "");
        }
      });
    });

    applyExcelStyling(worksheet, headerRow2, 50, "366092");

    // Dynamically merge based on schemes (adjusting columns for each set)

    mergeRanges.forEach(({ start }) => {
      let col = start + 2; // After "Sector Name" and "Department Name"
      if (showDepartmentView) {
        worksheet.mergeCells(2, col + 1, 2, col + 3);
        col += 3;
      }
      if (showScemeView) {
        worksheet.mergeCells(2, col + 1, 2, col + 3);
        col += 3;
      }
      if (showDeptExcel) {
        worksheet.mergeCells(2, col + 1, 2, col + 3);
        col += 3;
      }
      if (showDeptAPI) {
        worksheet.mergeCells(2, col + 1, 2, col + 3);
        col += 3;
      }
    });
    // Third Row
    let headerRow3 = ["", "", "", ""];
    Object.keys(outputData).forEach((schemeKey) => {
      Object.keys(outputData[schemeKey]).forEach(() => {
        headerRow3.push("", "", "");
        if (showDepartmentView) {
          headerRow3.push("Value (B)", "Difference (B-A)", "Difference%");
        }
        if (showScemeView) {
          headerRow3.push("Value (C)", "Difference (C-A)", "Difference%");
        }
        if (showDeptExcel) {
          headerRow3.push("Value (D)", "Difference (D-A)", "Difference%");
        }
        if (showDeptAPI) {
          headerRow3.push("Value (E)", "Difference (E-A)", "Difference%");
        }
      });
    });
    applyExcelStyling(worksheet, headerRow3, 20, "366092");

    Object.keys(stateDistrictMapping).map((state, stateIndex) => {
      return stateDistrictMapping[state]?.["districts"].map(
        (district, districtIndex) => {
          let rowDataArray = [
            state,
            stateDistrictMapping?.[state]?.["state_id"],
            district["district_name"],
            district["district_id"],
          ];
          let diffColumns = []; // Store indexes of Difference columns
          let diffPercentColumns = []; // Store indexes of Difference % columns

          Object.keys(outputData).forEach((schemeKey) => {
            const schemeData = outputData[schemeKey];
            Object.keys(outputData?.[schemeKey]).forEach((keyRow) => {
              const rowData = schemeData?.[keyRow]?.[state]?.[
                district["district_name"]
              ]
                ? schemeData[keyRow]?.[state]?.[district["district_name"]]
                : {};

              rowDataArray.push(
                schemeSectorMapping?.[schemeKey],
                schemeDepartmentMapping?.[schemeKey]
              );
              rowDataArray.push(rowData.prayasValue ?? "NA");

              let startIndex = rowDataArray.length; // Track start index for this scheme
              if (showDepartmentView) {
                rowDataArray.push(
                  rowData.nativeDashValue ?? "NA",
                  rowData.nativeDashDiff ?? "NA",
                  rowData.nativeDashDiffPercent ?? "NA"
                );
              }
              if (showScemeView) {
                rowDataArray.push(
                  rowData.schemeDashValue ?? "NA",
                  rowData.schemeDashDiff ?? "NA",
                  rowData.schemeDashDiffPercent ?? "NA"
                );
              }
              if (showDeptExcel) {
                rowDataArray.push(
                  rowData.deptExcelValue ?? "NA",
                  rowData.deptExcelDiff ?? "NA",
                  rowData.deptExcelDiffPercent ?? "NA"
                );
              }
              if (showDeptAPI) {
                rowDataArray.push(
                  rowData.deptApiValue ?? "NA",
                  rowData.deptApiDiff ?? "NA",
                  rowData.deptApiDiffPercent ?? "NA"
                );
              }

              // Store indexes dynamically for Difference & Difference %
              for (let i = startIndex; i < rowDataArray.length; i++) {
                if ((i - startIndex) % 3 === 1) {
                  diffColumns.push(i + 1); // Difference columns
                } else if ((i - startIndex) % 3 === 2) {
                  diffPercentColumns.push(i + 1); // Difference % columns
                }
              }
            });
          });

          let excelRow = worksheet.addRow(rowDataArray);

          // ✅ Apply Alignment & Conditional Coloring Dynamically
          excelRow?.eachCell((cell, colNumber) => {
            cell.alignment = {
              horizontal: colNumber <= 6 ? "center" : "right",
              vertical: "middle",
              wrapText: true,
            };
            if (typeof cell.value === "number") {
              const isFloat = !Number.isInteger(cell.value);
              cell.numFmt = isFloat ? "#,##0.00" : "#,##0";
            }
            let bgColor = null;
            if (diffColumns.includes(colNumber)) {
              let percentageValue =
                rowDataArray[colNumber - 1] != 0
                  ? parseFloat(rowDataArray[colNumber - 1]) || "NA"
                  : 0; // Get Difference Value

              let percentage = parseFloat(rowDataArray[colNumber]) || "NA"; // Get Percentage Value

              if (percentageValue != "NA") {
                bgColor =
                  percentageValue === 0
                    ? "81FFBA" // Green for 0%
                    : percentageValue < 0
                    ? "f37a78"
                    : percentage > 3
                    ? "FFC107" // Red for >3% or negative values
                    : "f2e092"; // Yellow for intermediate values
              }
            }
            if (diffPercentColumns.includes(colNumber)) {
              let percentage = parseFloat(rowDataArray[colNumber - 1]) || "NA"; // Get Percentage Value
              let percentageValue =
                rowDataArray[colNumber - 2] != 0
                  ? parseFloat(rowDataArray[colNumber - 2]) || "NA"
                  : 0; // Get Difference Value
              if (percentageValue != "NA") {
                bgColor =
                  percentageValue === 0
                    ? "81FFBA" // Green for 0%
                    : percentageValue < 0
                    ? "f37a78"
                    : percentage > 3 || percentage < 0
                    ? "FFC107" // Red for >3% or negative values
                    : "f2e092"; // Yellow for intermediate values
              }
            }

            // ✅ Apply Background Color
            if (bgColor) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: bgColor },
              };
            }

            if (bgColor) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: bgColor },
              };
            }
          });
        }
      );
    });
    // Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `DistrictSummary_${timestamp}.xlsx`);
  };

  return (
    <div className="flex gap-3 w-full justify-end items-center p-1">
      {state && (
        <button
          onClick={downloadExcelState}
          className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-md shadow hover:bg-blue-700 transition-all text-xs"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          <span className="font-medium">PMO - State Wise</span>
        </button>
      )}

      {district && (
        <button
          onClick={downloadExcelDistrict}
          className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-md shadow hover:bg-blue-700 transition-all text-xs"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          <span className="font-medium">PMO - District Wise</span>
        </button>
      )}

      <button
        onClick={() =>
          state
            ? downloadStateSummary(
                tableData,
                states,
                mappingData,
                schemeSectorMapping,
                schemeDepartmentMapping
              )
            : district
            ? downloadDistrictSummary(
                tableData,
                stateDistrictMapping,
                mappingData,
                schemeSectorMapping,
                schemeDepartmentMapping
              )
            : downloadExcelSummary(
                tableData,
                mappingData,
                schemeSectorMapping,
                schemeDepartmentMapping
              )
        }
        className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-md shadow hover:bg-green-700 transition-all text-xs"
      
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        <span className="font-medium">Summary Report</span>
      </button>
    </div>
  );
};

export default Download;
