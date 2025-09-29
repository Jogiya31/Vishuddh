import {
  faBrain,
  faScaleUnbalancedFlip,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";
import logo3 from "../../assets/logo3.png";

const MenuCard = ({ icon, title, description, path }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(path);
    localStorage.setItem("refresh", "true");
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className="group bg-white rounded-xl p-6 shadow-lg border border-gray-200 
                 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-200 
                 cursor-pointer flex flex-col items-center text-center transition-all"
      aria-label={`Open ${title}`}
    >
      <div className="mb-6 text-sky-700 group-hover:scale-110 transition-transform duration-300">
        <FontAwesomeIcon icon={icon} className="w-20 h-20" />
      </div>

      <h3 className="text-2xl font-semibold mb-2"></h3>
      <p className="text-gray-600 max-w-xs">{description}</p>

      <div className="mt-8 w-full">
        <button
          className="inline-flex items-center justify-center w-full rounded-md 
                     px-4 py-2 text-sm font-medium bg-sky-700 text-white shadow 
                     hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
         Show
        </button>
      </div>
    </article>
  );
};

const ToggleMenu = () => {
  const menuItems = [
    {
      title: "Sanity",
      description:
        "Data comparison between Darpan & Prayas portal for enhanced accuracy and reliability.",
      path: "/sanity",
      icon: faScaleUnbalancedFlip,
    },
    {
      title: "Vishuddh AI",
      description:
        "Data comparison between Prayas, Tableau and ministry dashboard .",
      path: "/home",
      icon: faBrain,
    },
  ];

  return (
    <div className="flex items-center justify-center flex-col min-h-full mt-24 ">
      <img src={logo3} alt="Logo" className="w-100 h-20 mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-6">
        {menuItems.map((item) => (
          <MenuCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
};

export default ToggleMenu;
