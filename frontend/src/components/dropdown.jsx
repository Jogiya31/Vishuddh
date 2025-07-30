import { useState, useRef, useEffect } from "react";

function Dropdown({
  options = [],              // List of all options (strings)
  selectedOptions = [],      // Selected values (array)
  setSelectedOptions,        // Setter function to update selected values
  placeholder = "Select",    // Placeholder text for the button
  labelKey,                  // Optional key for label if options are objects
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle selection of an option
  const toggleOption = (option) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter((o) => o !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
  };

  // Filter options based on search input
  const filteredOptions = options.filter((option) => {
    const label = labelKey ? option[labelKey] : option;
    return label&&label.toLowerCase().includes(search.toLowerCase());
  });

  // Button label depending on selected items count
  const buttonLabel =
    selectedOptions.length > 0
      ? `${selectedOptions.length} ${selectedOptions.length > 1 ? "selected" : "selected"}`
      : placeholder;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-[12px] bg-[#70a7d8] p-[0.5rem] text-center text-white rounded-2xl"
      >
        {buttonLabel}
      </button>

      {open && (
        <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[12px] p-2 border-b border-gray-300 focus:outline-none"
          />

          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const label = labelKey ? option[labelKey] : option;
                return (
                  <label
                    key={`${label}-${index}`}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-[12px]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option)}
                      onChange={() => toggleOption(option)}
                      className="w-3 h-3"
                    />
                    <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                      {label}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="p-2 text-[12px] text-gray-500">No results found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dropdown;
