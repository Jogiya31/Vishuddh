import React, { useEffect, useState } from "react";

const CustomToggle = ({ onToggle, Description = "Prayas Match" }) => {
  const [isRightPrayas, setIsRightPrayas] = useState(true);

  useEffect(() => {
    const localIsRightPrayas = localStorage.getItem("isRightPrayas");
    if (localIsRightPrayas !== null) {
      setIsRightPrayas(localIsRightPrayas === "true");
    }
  }, [])

  const handleChange = (event) => {
    const newValue = event.target.value === "true";
    setIsRightPrayas(newValue);
    onToggle(newValue);
    localStorage.setItem("isRightPrayas", newValue); 
  };

  return (
    <div className="flex items-center gap-2 text-[8px] font-medium text-gray-600">
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="prayas-toggle"
            value="true"
            checked={isRightPrayas === true}
            onChange={handleChange}
            className="accent-gray-600"
          />
          <span>Latest Match</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="prayas-toggle"
            value="false"
            checked={isRightPrayas === false}
            onChange={handleChange}
            className="accent-blue-500"
          />
          <span>Date Match</span>
        </label>
      </div>
    </div>
  );
};

export default CustomToggle;
