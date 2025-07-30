import { useEffect, useRef, useState } from "react";
import { formatToDDMMYYYY } from "../config/config";
import { Calendar } from "react-date-range";

/**
 * A generic multi-select dropdown filter component.
 * 
 * @param {Array} options - Array of all options for the filter (array of strings or objects with label/value).
 * @param {Array} selected - Array of selected options.
 * @param {Function} onChange - Callback when selected options change.
 * @param {String} label - Label for the filter dropdown.
 * @param {String} searchPlaceholder - Placeholder for search input.
 * @param {String} selectAllLabel - Label for "Select All" checkbox.
 * @param {Function} optionLabel - (optional) function to get option label from option object. Defaults to option itself.
 * @param {Function} optionValue - (optional) function to get option value from option object. Defaults to option itself.
 */
function MultiSelectDropdown({
  options,
  selected,
  onChange,
  label,
  searchPlaceholder = "Search...",
  selectAllLabel = "Select All",
  optionLabel = (opt) => (typeof opt === "object" ? opt.label : opt),
  optionValue = (opt) => (typeof opt === "object" ? opt.value : opt),
}) {
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filter options by search
  const filteredOptions = options.filter((opt) =>
    optionLabel(opt).toLowerCase().includes(search.toLowerCase())
  );

  // Select All logic
  const allSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((opt) =>
      selected.some((sel) => optionValue(sel) === optionValue(opt))
    );

  const toggleOption = (opt) => {
    const value = optionValue(opt);
    let newSelected;
    if (selected.some((sel) => optionValue(sel) === value)) {
      newSelected = selected.filter((sel) => optionValue(sel) !== value);
    } else {
      newSelected = [...selected, opt];
    }
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      // Remove all filtered options from selected
      const filteredValues = filteredOptions.map(optionValue);
      onChange(selected.filter((sel) => !filteredValues.includes(optionValue(sel))));
    } else {
      // Add all filtered options to selected
      const currentValues = selected.map(optionValue);
      const toAdd = filteredOptions.filter(
        (opt) => !currentValues.includes(optionValue(opt))
      );
      onChange([...selected, ...toAdd]);
    }
  };

  // To close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <div className="w-full p-2">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full text-xs bg-[#70a7d8] p-2 text-center text-white rounded-2xl"
        >
          {selected.length > 0
            ? `${selected.length} ${label}${selected.length > 1 ? "s" : ""} selected`
            : `Select ${label}`}
        </button>
        {dropdownOpen && (
          <div className="absolute w-full bg-white border border-gray-300 rounded-lg shadow-md mt-1 z-50">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs p-2 border-b border-gray-300 focus:outline-none"
            />
            <div className="max-h-40 overflow-y-auto">
              <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="w-3 h-3"
                />
                <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                  {selectAllLabel}
                </span>
              </label>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => (
                  <label
                    key={`${optionLabel(opt)}-${idx}`}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selected.some((sel) => optionValue(sel) === optionValue(opt))}
                      onChange={() => toggleOption(opt)}
                      className="w-3 h-3"
                    />
                    <span className="text-gray-700 overflow-hidden whitespace-nowrap truncate">
                      {optionLabel(opt)}
                    </span>
                  </label>
                ))
              ) : (
                <p className="p-2 text-gray-500">No results found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A generic filter bar component for multiple filters and an optional date picker.
 * 
 * @param {Array} filters - Array of filter config objects:
 *    { label, options, selected, onChange, [searchPlaceholder], [selectAllLabel], [optionLabel], [optionValue] }
 * @param {Boolean} showDate - Enable date picker.
 * @param {String} date - Date value, ISO string.
 * @param {Function} onDateChange - Callback for date change.
 * @param {String} dateMin - Minimum date (ISO string).
 * @param {String} dateMax - Maximum date (ISO string).
 * @param {Function} formatDate - Function to format date.
 */
export default function FilterBar({
  filters = [],
  showDate = false,
  date = "",
  onDateChange = () => {},
  dateMin = "2020-01-01",
  dateMax = (new Date()).toISOString().slice(0, 10),
  formatDate = formatToDDMMYYYY,
}) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [localDate, setLocalDate] = useState(date);

  useEffect(() => {
    setLocalDate(date);
  }, [date]);

  const handleCalendarChange = (newDate) => {
    const localDateObj = new Date(newDate);
    const yyyy = localDateObj.getFullYear();
    const mm = String(localDateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(localDateObj.getDate()).padStart(2, "0");
    const isoString = `${yyyy}-${mm}-${dd}`;
    setLocalDate(isoString);
  };

  return (
    <div className="flex w-full bg-[#f8f9f9] mt-1 py-1 rounded-lg">
      <div className="w-full flex gap-2">
        {filters.map((filter, idx) => (
          <MultiSelectDropdown key={idx} {...filter} />
        ))}
        {showDate && (
          <div className="p-2 w-full flex items-center justify-start">
            <div className="relative inline-block w-full">
              <button
                onClick={() => setShowCalendar((v) => !v)}
                className="w-full flex items-center justify-center rounded-2xl bg-[#70a7d8] text-white shadow-md text-xs px-3 py-2 text-center"
              >
                {formatDate(localDate)}
              </button>
              {showCalendar && (
                <div className="absolute z-10 bg-white shadow-lg rounded right-0">
                  <Calendar
                    date={localDate}
                    onChange={handleCalendarChange}
                    minDate={new Date(dateMin)}
                    maxDate={new Date(dateMax)}
                  />
                  <div className="flex justify-end m-2 gap-1">
                    <button
                      onClick={() => {
                        setShowCalendar(false);
                        onDateChange(localDate);
                      }}
                      className="bg-blue-500 text-white px-1 text-xs py-1 rounded hover:bg-blue-700"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setShowCalendar(false)}
                      className="bg-blue-500 text-white px-1 text-xs py-1 rounded hover:bg-blue-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}