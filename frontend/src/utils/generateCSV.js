import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const getDiff = (a, b) => a - b;
const getPercentage = (a, b) => {
  if (b === 0) return "0 %";
  return ((getDiff(a, b) / b) * 100).toFixed(2) + " %";
};

export const exportToExcel = async (data) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sanity Report");

  // Title row
  worksheet.mergeCells("A1:K2");
  const titleCell = worksheet.getCell("A1");
  titleCell.value =
    "Data Comparison Sheet For Critical KPIs Between DARPAN & Prayas Portal";
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.font = { bold: true, size: 14 };

  // Headers (2 rows)
  const header1 = [
    "S.No",
    "Scheme Name",
    "KPI Name",
    "Unit",
    "Date Freq.",
    "Darpan Data",
    "",
    "Prayas Data",
    "",
    "Diff. (A-B)",
    "Diff. Percentage (%)",
  ];
  const header2 = [
    "",
    "",
    "",
    "",
    "",
    "Date",
    "Value (A)",
    "Date",
    "Value (B)",
    "",
    "",
  ];

  worksheet.addRow(header1);
  worksheet.addRow(header2);

  // Merge header cells
  worksheet.mergeCells("A3:A4");
  worksheet.mergeCells("B3:B4");
  worksheet.mergeCells("C3:C4");
  worksheet.mergeCells("D3:D4");
  worksheet.mergeCells("E3:E4");
  worksheet.mergeCells("F3:G3");
  worksheet.mergeCells("H3:I3");
  worksheet.mergeCells("J3:J4");
  worksheet.mergeCells("K3:K4");

  // Style header rows (row 2 & 3 only)
  [3, 4].forEach((rowNumber) => {
    const row = worksheet.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4059AD" }, // Blue background
      };
      cell.font = {
        color: { argb: "FFFFFFFF" },
        bold: true,
        size: 12,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Add data rows (start from row 4)
  data.forEach((item, idx) => {
    const darpanDate = item?.PrayasDate?.split(" ")[0] || "";
    const prayasDate = item?.CedaDate?.split(" ")[0] || "";
    const diff = getDiff(item.outvalue, item.CedaValue);
    const percentage = getPercentage(item.outvalue, item.CedaValue);

    worksheet.addRow([
      idx + 1,
      item.Project_Name_E,
      item.KPI_Name_E,
      item.Unit_Name,
      item.Data_Freq,
      darpanDate,
      item.outvalue,
      prayasDate,
      item.CedaValue,
      diff,
      percentage,
    ]);
  });

  // Auto width
  worksheet.columns.forEach((col) => {
    col.width = 18;
  });

  // Save Excel
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "Sanity_Report.xlsx");
};

export const exportModalDataToExcel = async (data) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sanity Report");

  // --- Title row (merge A1:F2) ---
  worksheet.mergeCells("A1:F2");
  const titleCell = worksheet.getCell("A1");
  titleCell.value =
    "Data comparison sheet for critical KPIs state wise between DARPAN & Prayas Portal";
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.font = { bold: true, size: 14 };

  const schemeName = data?.[0]?.Scheme_Name || "";
  const kpiName = data?.[0]?.KPI_Name || "";

  // --- Scheme + KPI row (merge A3:F3) ---
  worksheet.mergeCells("A3:F3");
  const schemeKpiCell = worksheet.getCell("A3");
  schemeKpiCell.value = `Scheme: ${schemeName || ""}   |   KPI: ${
    kpiName || ""
  }`;
  schemeKpiCell.alignment = { vertical: "middle", horizontal: "center" };
  schemeKpiCell.font = { bold: true, size: 12 };

  // --- Headers (row 4) ---
  const header = [
    "StateCode",
    "State",
    "Darpan Value",
    "Prayas Value",
    "Diff. (A-B)",
    "Diff. Percentage (%)",
  ];
  worksheet.addRow(header);

  // --- Style header row (row 4) ---
  const headerRow = worksheet.getRow(4);
  headerRow.eachCell((cell) => {
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4059AD" }, // Blue
    };
    cell.font = {
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 12,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // --- Data rows (start from row 5) ---
  data.forEach((item) => {
    const diff = getDiff(item.Localkpi_Value, item.Viewkpi_value);
    const percentage = getPercentage(item.Localkpi_Value, item.Viewkpi_value);

    worksheet.addRow([
      item.statecode,
      item.statename,
      item.Localkpi_Value,
      item.Viewkpi_value,
      diff,
      percentage,
    ]);
  });

  // --- Auto width ---
  worksheet.columns.forEach((col) => {
    col.width = 18;
  });

  // --- Save Excel ---
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    "Data comparison sheet for critical KPIs state wise between DARPAN & Prayas Portal.xlsx"
  );
};
