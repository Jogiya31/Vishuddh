import LLogo from "../assets/govLion.png";
import CLogo from "../assets/prayasLogo_new.svg";
import { useReportType } from "../pages/ReportType";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const { userName, setLoggedIn } = useReportType();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    setLoggedIn(false);
    navigate("/");
  };

  return (
    <nav className="fixed top-0 z-[20] left-0 w-full bg-white text-black py-1 px-6 flex items-center justify-between shadow-md">
      {/* Left Logo */}
      <div className="w-1/3 flex justify-start">
        <img src={LLogo} alt="Left Logo" className="h-12" />
      </div>

      {/* Center Logo */}
      <div className="w-1/3 flex justify-center">
        <img src={CLogo} alt="Center Logo" className="h-12" />
      </div>

      {/* Right Section: User Greeting & Logout Button */}
      <div className="w-1/3 flex justify-end items-center space-x-4">
        <span className="text-gray-800 font-semibold">Hi, {userName}</span>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition duration-200"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
