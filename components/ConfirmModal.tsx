"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (nodes.length === 0) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previousFocus.current?.focus?.();
    };
  }, [open, onCancel, busy]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div
        onClick={() => { if (!busy) onCancel(); }}
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative bg-white py-9 px-10 w-full max-w-[400px] rounded-[20px] outline-none"
      >
        <div
          className={`w-11 h-11 rounded-lg flex items-center justify-center mb-5 ${
            variant === "danger" ? "bg-[#ffdad6]" : "bg-[#fff8e7]"
          }`}
          aria-hidden="true"
        >
          {variant === "danger" ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="#ba1a1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className="w-[22px] h-[22px]">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="#735c00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className="w-[22px] h-[22px]">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          )}
        </div>

        <h3 id="confirm-modal-title" className="text-lg font-medium text-[#1a1c1c] mb-2.5">
          {title}
        </h3>
        <p className="text-sm text-[#5f5e5e] leading-[22px] mb-8">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`bg-transparent border border-[#d0c5af] py-2.5 px-5 text-xs font-semibold tracking-[0.1em] uppercase rounded-xl transition-colors duration-200 font-inherit text-[#4d4635] ${
              busy ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#735c00]"
            }`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex items-center gap-2 border-none py-2.5 px-6 text-xs font-semibold tracking-[0.1em] uppercase rounded-xl transition-colors duration-200 font-inherit text-white ${
              busy
                ? "bg-[#999] cursor-not-allowed opacity-70"
                : variant === "danger"
                  ? "bg-[#ba1a1a] hover:bg-[#93000a] cursor-pointer"
                  : "bg-[#735c00] hover:bg-[#574500] cursor-pointer"
            }`}
          >
            {busy && (
              <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
