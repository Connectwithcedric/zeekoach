"use client";

import { useEffect } from "react";

// Dimmed overlay with a centered panel, used for the session card and booking steps.
export function Modal({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-40 overflow-y-auto bg-[#191a1e]/50 px-4 py-10" onClick={onClose}>
      <div className="mx-auto flex w-fit justify-center" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
