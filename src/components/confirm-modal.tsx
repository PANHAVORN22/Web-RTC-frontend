"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Icon Badge */}
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-2xs ${
              isDanger
                ? "bg-red-50 border border-red-100 text-red-600"
                : variant === "warning"
                ? "bg-amber-50 border border-amber-100 text-amber-600"
                : "bg-blue-50 border border-blue-100 text-blue-600"
            }`}
          >
            {isDanger ? (
              <Trash2 className="w-5 h-5" />
            ) : variant === "warning" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          {/* Text Content */}
          <h3 className="text-base font-bold text-slate-900 font-serif">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onClose}
            className="flex-1 h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={`flex-1 h-9 rounded-xl text-white text-xs font-semibold gap-1.5 shadow-xs ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                : "bg-codex-accent hover:bg-codex-hover focus:ring-blue-500"
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? "Processing..." : confirmText}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
