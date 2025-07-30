import React from "react";

const Tooltip = ({ text, children, position = "top" }) => {
  return (
    <div className="relative group flex items-center z-400">
      {/* Tooltip Content */}
      <div
        className={`absolute bg-gray-700 text-white text-[10px] px-1 py-1 rounded-md shadow-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100 w-60 max-w-60 break-words whitespace-normal z-100
    ${
      position === "top"
        ? "bottom-full mb-0 left-[-70px] transform -translate-x-1/2"
        : ""
    }
    ${
      position === "bottom"
        ? "top-full mt-2 left-[-60px] transform -translate-x-1/2"
        : ""
    }
    ${
      position === "left"
        ? "right-full mr-2 top-1/2 transform -translate-y-1/2"
        : ""
    }
    ${
      position === "right"
        ? "left-full ml-2 top-1/2 transform -translate-y-1/2"
        : ""
    }
  `}
      >
        {text}
      </div>

      {/* Wrapped Child Component (Icon, Text, etc.) */}
      {children}
    </div>
  );
};

export default Tooltip;
