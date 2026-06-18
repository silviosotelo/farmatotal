"use client";

import { useEffect, useState } from "react";
import { BarcodeIcon, MicIcon, ArrowUpIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export default function FloatingButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Right-edge pill buttons */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        {/* Escanear */}
        <button
          aria-label="Escanear código de barras"
          className="flex items-center gap-1.5 px-3 py-2 rounded-l-full text-white text-[13px] font-medium shadow-md"
          style={{ backgroundColor: "#2d9cdb" }}
        >
          <BarcodeIcon className="w-4 h-4 shrink-0" />
          <span>Escanear</span>
        </button>

        {/* Voz */}
        <button
          aria-label="Búsqueda por voz"
          className="flex items-center gap-1.5 px-3 py-2 rounded-l-full text-white text-[13px] font-medium shadow-md"
          style={{ backgroundColor: "#e74c3c" }}
        >
          <MicIcon className="w-4 h-4 shrink-0" />
          <span>Voz</span>
        </button>
      </div>

      {/* Scroll-to-top */}
      <button
        onClick={handleScrollTop}
        aria-label="Volver arriba"
        className={cn(
          "fixed bottom-6 right-6 z-50 size-11 rounded-full bg-brand-orange text-white shadow-md flex items-center justify-center transition-all duration-300",
          showScrollTop
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-75 pointer-events-none"
        )}
      >
        <ArrowUpIcon className="w-5 h-5" />
      </button>
    </>
  );
}
