import { useNavigate } from "react-router-dom";
import { X, FileText, UploadCloud, PlayCircle, Settings } from "lucide-react";

const Overlay = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 relative flex flex-col items-center">
        {/* Close Button */}
        <button
          className="absolute top-3 right-3 text-gray-600 hover:text-black"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-4">Vishuddh</h2>

        {/* Buttons Section */}
        <div className="flex flex-col gap-4 w-full">
          <button
            className="flex items-center gap-2 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
            onClick={() => {
              navigate("/current/national");
              localStorage.setItem("refresh", "true");
            }}
          >
            <FileText size={20} /> Go to Report
          </button>
          <button
            className="flex items-center gap-2 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition"
            onClick={() => navigate("/aireport")}
          >
            <UploadCloud size={20} /> Ai Report
          </button>
          <button
            className="flex items-center gap-2 w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition"
            onClick={() => navigate("/scraping/data-input")}
          >
            <PlayCircle size={20} /> Input Data
          </button>
          <button
            className="flex items-center gap-2 w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition"
            onClick={() => navigate("/manual-scraping")}
          >
            <Settings size={20} /> Manual Scraping
          </button>
        </div>
      </div>
    </div>
  );
};

export default Overlay;
