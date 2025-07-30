import React from "react";

const outputData = {
  Gujrat: {
    "Jal Jeevan Mission": {
      "No. of household tap connections": [
        {
          prayasValue: "15,45,00,250",
          nativeDashValue: "15,45,11,575",
          nativeDashDiff: "-11,325",
          nativeDashDiffPercent: "-0.007",
          schemeDashValue: "15,45,00,250",
          schemeDashDiff: "0",
          schemeDashDiffPercent: "0",
          deptExcelValue: "NA",
          deptExcelDiff: "NA",
          deptExcelDiffPercent: "NA",

          deptApiValue: "NA",
          deptApiDiff: "NA",
          deptApiDiffPercent: "NA",
        },
      ],
      "No. of Villages with 100% household tap connections": [
        {
          prayasValue: "3,02,865",
          nativeDashValue: "2,56,333",
          nativeDashDiff: "-46,532",
          nativeDashDiffPercent: "15.36",
          schemeDashValue: "3,03,128",
          schemeDashDiff: "263",
          schemeDashDiffPercent: "0.08",
          deptExcelValue: "NA",
          deptExcelDiff: "NA",
          deptExcelDiffPercent: "NA",

          deptApiValue: "NA",
          deptApiDiff: "NA",
          deptApiDiffPercent: "NA",
        },
      ],
    },
    "PM Awaas Yojana - Grameen": {
      "No. of Houses Sanctioned": [
        {
          prayasValue: 39026201, // General value for prayasValue

          nativeDashValue: 33560067,
          nativeDashDiff: 5466134,
          nativeDashDiffPercent: "16.33%",

          schemeDashValue: "NA",
          schemeDashDiff: "NA",
          schemeDashDiffPercent: "NA",

          deptExcelValue: "NA",
          deptExcelDiff: "NA",
          deptExcelDiffPercent: "NA",

          deptApiValue: "NA",
          deptApiDiff: "NA",
          deptApiDiffPercent: "NA",
        },
      ],

      kpi2: [
        {
          prayasValue: 120, // General value for prayasValue

          nativeDashValue: 120,
          nativeDashDiff: 10,
          nativeDashDiffPercent: "8.33%",

          schemeDashValue: 125,
          schemeDashDiff: 5,
          schemeDashDiffPercent: "4%",

          deptExcelValue: 100,
          deptExcelDiff: 20,
          deptExcelDiffPercent: "20%",

          deptApiValue: 105,
          deptApiDiff: 15,
          deptApiDiffPercent: "14.29%",
        },
      ],
    },
  },
Punjab: {
    "Jal Jeevan Mission": {
      "No. of household tap connections": [
        {
          prayasValue: "15,45,00,250",
          nativeDashValue: "15,45,11,575",
          nativeDashDiff: "-11,325",
          nativeDashDiffPercent: "-0.007",
          schemeDashValue: "15,45,00,250",
          schemeDashDiff: "0",
          schemeDashDiffPercent: "0",
          deptExcelValue: "NA",
          deptExcelDiff: "NA",
          deptExcelDiffPercent: "NA",

          deptApiValue: "NA",
          deptApiDiff: "NA",
          deptApiDiffPercent: "NA",
        },
      ],
      "No. of Villages with 100% household tap connections": [
        {
          prayasValue: "3,02,865",
          nativeDashValue: "2,56,333",
          nativeDashDiff: "-46,532",
          nativeDashDiffPercent: "15.36",
          schemeDashValue: "3,03,128",
          schemeDashDiff: "263",
          schemeDashDiffPercent: "0.08",
          deptExcelValue: "NA",
          deptExcelDiff: "NA",
          deptExcelDiffPercent: "NA",

          deptApiValue: "NA",
          deptApiDiff: "NA",
          deptApiDiffPercent: "NA",
        },
      ],
    },
    "PM Awaas Yojana - Grameen": {
      "No. of Houses Sanctioned": [
        {
          prayasValue: 39026201, // General value for prayasValue

          nativeDashValue: 33560067,
          nativeDashDiff: 5466134,
          nativeDashDiffPercent: "16.33%",

          schemeDashValue: "NA",
          schemeDashDiff: "NA",
          schemeDashDiffPercent: "NA",

          deptExcelValue: "NA",
          deptExcelDiff: "NA",
          deptExcelDiffPercent: "NA",

          deptApiValue: "NA",
          deptApiDiff: "NA",
          deptApiDiffPercent: "NA",
        },
      ],

      kpi2: [
        {
          prayasValue: 120, // General value for prayasValue

          nativeDashValue: 120,
          nativeDashDiff: 10,
          nativeDashDiffPercent: "8.33%",

          schemeDashValue: 125,
          schemeDashDiff: 5,
          schemeDashDiffPercent: "4%",

          deptExcelValue: 100,
          deptExcelDiff: 20,
          deptExcelDiffPercent: "20%",

          deptApiValue: 105,
          deptApiDiff: 15,
          deptApiDiffPercent: "14.29%",
        },
      ],
    },
  },
};

const getCellClass = (percent) => {
  if (percent === "NA" || percent === "0" || percent === "0%")
    return "bg-green-200";
  const num = parseFloat(percent);
  if (Math.abs(num) < 5) return "bg-yellow-200";
  return "bg-red-200";
};

const TableComponent = () => {
  return (
    <div className="overflow-auto">
      <table className="min-w-full border-collapse border border-gray-300 text-sm text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">State Name</th>
            {Object.entries(outputData).map(([state, schemes]) =>
              Object.entries(schemes).map(([scheme, kpis]) => (
                <th
                  key={scheme}
                  colSpan={Object.keys(kpis).length * 13}
                  className="border p-2 text-center"
                >
                  {scheme}
                </th>
              ))
            )}
          </tr>
          <tr className="bg-gray-100">
            <th className="border p-2"></th>
            {Object.entries(outputData).map(([state, schemes]) =>
              Object.entries(schemes).map(([scheme, kpis]) =>
                Object.keys(kpis).map((kpi) => (
                  <th key={kpi} colSpan={13} className="border p-2 text-center">
                    {kpi}
                  </th>
                ))
              )
            )}
          </tr>
          <tr className="bg-gray-300">
            <th className="border p-2">State</th>
            {Object.entries(outputData)
              .flatMap(([state, schemes]) =>
                Object.entries(schemes).flatMap(([scheme, kpis]) =>
                  Object.keys(kpis).flatMap(() => [
                    "PRAYAS Value",
                    "Native Dash Value",
                    "Diff",
                    "% Diff",
                    "Scheme Dash Value",
                    "Diff",
                    "% Diff",
                    "Department value via excel",
                    "Diff",
                    "% Diff",
                    "Department value via api",
                    "Diff",
                    "% Diff",
                    
                  ])
                )
              )
              .map((header, idx) => (
                <th key={idx} className="border p-2">
                  {header}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(outputData).map(([state, schemes]) => (
            <tr key={state} className="border">
              <td className="border p-2">{state}</td>
              {Object.entries(schemes).map(([scheme, kpis]) =>
                Object.entries(kpis).map(([kpi, values]) =>
                  values.map((data, idx) =>
                    [
                      data.prayasValue,
                      data.nativeDashValue,
                      data.nativeDashDiff,
                      data.nativeDashDiffPercent,
                      data.schemeDashValue,
                      data.schemeDashDiff,
                      data.schemeDashDiffPercent,

                      data.deptExcelValue,

                      data.deptExcelDiff,

                      data.deptExcelDiffPercent,

                      data.deptApiValue,

                      data.deptApiDiff,

                      data.deptApiDiffPercent,
                    ].map((value, i) => (
                      <td
                        key={`${state}-${scheme}-${kpi}-${idx}-${i}`}
                        className={`border p-2 ${getCellClass(value)}`}
                      >
                        {value}
                      </td>
                    ))
                  )
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableComponent;
