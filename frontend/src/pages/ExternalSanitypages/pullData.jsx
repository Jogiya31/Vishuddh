import { faHome } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const PullData = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedDate) {
      setError("");
    }
  }, [selectedDate]);

  const handlePullData = () => {
    if (!selectedDate) {
      setError("Please select a date before pulling data.");
      return;
    }

    setError(""); // clear error if validation passes
    console.log("Pulling data for date:", selectedDate);
    // Logic to pull data from Darpan and Prayas portals
  };

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
            className="bg-[#4f67b7] text-white px-4 py-1 rounded-md hover:bg-gray-700 transition-colors duration-200"
            onClick={() => navigate("/sanity")}
          >
            Summary
          </button>
          <button
            className="bg-white text-[#4f67b7] font-medium px-4 py-1 rounded-md hover:bg-gray-700 transition-colors duration-200"
            onClick={() => navigate("/pullData")}
          >
            Pull Data
          </button>
        </div>
      </nav>

      <div className="px-10 py-5 bg-white rounded-lg shadow-lg m-4">
        <div className="bg-gray-200 p-4 rounded-lg text-center font-semibold text-[#004d99] mb-4">
          Pull Data From Darpan & Prayas into SQLite DB || Data last Pulled on:
          9/16/2025 9:58:32 AM
        </div>

        <div>
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              onClick={(e) => e.target.showPicker()}
              className={`border rounded-md p-2 mr-2 ${
                error ? "border-red-500" : "border-gray-300"
              }`}
              required
            />

            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors duration-200"
              onClick={handlePullData}
            >
              Pull Data
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors duration-200">
          Estimated Time Remaining(MM:SS): 00:00
        </button>
      </div>
    </div>
  );
};

export default PullData;
