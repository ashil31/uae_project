import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";


export default function CustomSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = "All",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const display = value || placeholder;

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
          {label}
        </label>
      )}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
      >
        <span
          className={`text-left truncate ${
            value
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {display}
        </span>

        <div className="flex items-center space-x-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setOpen(false);
              }}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="clear selection"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}

          {open ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      <div
        role="listbox"
        tabIndex={-1}
        className={`absolute left-0 right-0 mt-2 z-50 max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 transition-all transform origin-top ${
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 pointer-events-none -translate-y-1 scale-95"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 focus:bg-purple-50 dark:focus:bg-gray-700 transition ${
            value === "" || !value
              ? "bg-purple-50 dark:bg-gray-700 font-medium"
              : "text-gray-700 dark:text-gray-200"
          }`}
        >
          {placeholder}
        </button>

        {options && options.length > 0 ? (
          options.map((opt) => {
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 focus:bg-purple-50 dark:focus:bg-gray-700 transition ${
                  isSelected
                    ? "bg-purple-50 dark:bg-gray-700 font-medium"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {opt}
              </button>
            );
          })
        ) : (
          <div className="px-4 py-2 text-sm text-gray-500">No options</div>
        )}
      </div>
    </div>
  );
}
