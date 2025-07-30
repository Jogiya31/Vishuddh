import { useState } from "react";
import {
  Listbox,
  ListboxOption,
  ListboxOptions,
  ListboxButton,
} from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { useReportType } from "../pages/ReportType";
const options = [
  { id: 1, name: "Department View" },
  { id: 2, name: "Scheme View" },
  { id: 3, name: "Department Excel" },
  { id: 4, name: "Department API" },
];

export default function MultiSelectDropdown({
  onUpdateUnit,
  onSelectingOptions,
  selectedUnit
}) {
  const {selectedOptions,setSelectedOptions} = useReportType();

  const toggleOption = (option) => {
    setSelectedOptions((prev) => {
      const exists = prev.some((item) => item.id === option.id); // Check by ID
  
      const updatedOptions = exists
        ? prev.filter((item) => item.id !== option.id) // Remove if already selected
        : [...prev, option]; // Add if not selected
  
      onSelectingOptions(updatedOptions); // Call parent function if needed
      return updatedOptions; // Return updatedOptions directly
    });
  };
  
  return (
    <div className="flex gap-2 items-center z-10">
    {/* Unit Selection Dropdown */}
    <div className="w-[100px]">
      <select
      title="Data Unit Conversion"
         value={selectedUnit}
        onChange={(e) => onUpdateUnit(e.target.value)}
        className="w-full text-[10px] bg-white p-[0.2rem] text-gray-700 border border-gray-300 rounded-md focus:outline-none"
      >
        <option>In Absolute</option>
        <option>In Units</option>
      </select>
    </div>
  
    {/* Multi-Select Dropdown */}
    <div className="relative w-[100px]">
      <Listbox value={selectedOptions} onChange={toggleOption} multiple title="Input selector for data comparison">
        <div className="w-full bg-transparent rounded-md">
          <ListboxButton className="flex justify-between items-center w-full text-[10px] bg-white p-[0.2rem] text-gray-700 border border-gray-300 rounded-md focus:outline-none overflow-hidden whitespace-nowrap">
            <span className="truncate">
              {selectedOptions.length > 0
                ? selectedOptions.map((o) => o.name).join(", ")
                : "Select Format"}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </ListboxButton>
  
          <ListboxOptions className="absolute w-full mt-1 bg-white border border-gray-300 rounded-md shadow-md overflow-hidden z-20 text-[10px]">
            {options.map((option) => (
              <ListboxOption key={option.id} value={option} as="div">
                {({ active }) => (
                  <div
                    className={`cursor-pointer p-2 flex items-center justify-between ${
                      active ? "bg-gray-200" : ""
                    }`}
                    onClick={() => toggleOption(option)}
                  >
                    <span>{option.name}</span>
                    {selectedOptions.some((o) => o.id === option.id) && (
                      <Check className="w-3 h-3 text-blue-600" />
                    )}
                  </div>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  
    {/* Custom Toggle Aligned with others */}
    {/* <div className="w-[120px] flex flex-col items-center">
      <CustomToggle onToggle={handleToggleChange} Description={Description} />
    </div> */}
  </div>
  
  );
}
