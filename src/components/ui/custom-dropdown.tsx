"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomDropdownOption {
  value: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

export interface CustomDropdownProps {
  labelPrefix?: string; // e.g. "Role", "Access"
  value: string;
  onChange: (value: string) => void;
  options: CustomDropdownOption[];
  className?: string;
  menuWidth?: string;
  size?: "sm" | "md"; // "sm" = h-9 (36px), "md" = h-11 (44px)
  disabled?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  labelPrefix,
  value,
  onChange,
  options,
  className = "",
  menuWidth = "min-w-[200px]",
  size = "md",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const rawLabel = selectedOption ? selectedOption.label : value;

  // Clean display text without redundant prefix duplication
  const cleanLabel =
    labelPrefix && rawLabel.toLowerCase().startsWith(`${labelPrefix.toLowerCase()}:`)
      ? rawLabel.slice(labelPrefix.length + 1).trim()
      : rawLabel;

  const displayText = labelPrefix ? `${labelPrefix}: ${cleanLabel}` : rawLabel;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const heightClass = size === "sm" ? "h-9 rounded-lg px-3" : "h-11 rounded-xl px-3.5";

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`bg-white border text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none cursor-pointer flex items-center justify-between gap-3 transition-all select-none ${heightClass} ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/10 text-slate-900 shadow-xs"
            : "border-slate-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 top-full mt-1.5 ${menuWidth} max-h-72 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent]`}
        >
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              const optionDisplayLabel =
                labelPrefix && opt.label.toLowerCase().startsWith(`${labelPrefix.toLowerCase()}:`)
                  ? opt.label.slice(labelPrefix.length + 1).trim()
                  : opt.label;

              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors text-left group ${
                    isSelected
                      ? "bg-blue-50/70 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {opt.color && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{optionDisplayLabel}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
