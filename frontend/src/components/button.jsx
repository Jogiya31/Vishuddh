import React from "react";

const Button = ({ name, callFunction }) => {
  return (
    <button
      className="w-full sm:w-1/2 md:w-1/2 lg:w-1/2 xl:w-1/5 font-bold border shadow px-4 py-3 rounded-lg bg-[#1269a9] text-white transition-all duration-300 hover:bg-[#0e5a90] active:scale-95"
      onClick={callFunction}
    >
      {name}
    </button>
  );
};

export default Button;
