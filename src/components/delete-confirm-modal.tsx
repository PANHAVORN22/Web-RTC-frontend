"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Loader2 } from "lucide-react";

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemName?: string;
  itemType?: string;
  warningText?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = "item",
  warningText = "This action cannot be undone.",
  confirmText,
  cancelText = "Cancel",
  loading = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !mounted) return null;

  const displayTitle = title || `Delete ${itemType}`;
  const displayConfirm = confirmText || `Delete ${itemType}`;

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => !loading && onClose()}
      />
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 sm:p-7 border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold font-serif text-slate-900 tracking-tight">
              {displayTitle}
            </h3>
            {itemName && (
              <p className="text-sm sm:text-base text-slate-600 font-normal mt-1">
                &ldquo;{itemName}&rdquo; will be permanently removed.
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-1 -mt-1 cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mt-4 rounded-xl border border-[#e57373] bg-[#fbf0ef] px-4 py-3.5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#c53929] shrink-0 mt-0.5 stroke-[2.2]" />
          <p className="text-sm leading-relaxed text-[#c53929] font-normal">
            {warningText}
          </p>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#c53929] hover:bg-[#b03022] rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{displayConfirm}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
