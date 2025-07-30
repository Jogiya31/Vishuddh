import Insights from "./Insights";
import TableComponent from "./TableComponent";

const ViewTab = ({ insights, tableData }) => {
  return (
    <div className="mb-8">
      {/* <h3 className="text-lg font-semibold mb-2">Insights</h3> */}
      <Insights insights={insights} />

      {/* <h3 className="text-lg font-semibold mt-6 mb-2">Table</h3> */}
      <TableComponent rows={tableData} />
    </div>
  );
};

export default ViewTab;
