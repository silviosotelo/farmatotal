"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@platform/ui";
import { BarcodeIcon, MicIcon, ArrowUpIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ScanMode } from "./ScanVoiceModal";

const ScanVoiceModal = dynamic(() => import("./ScanVoiceModal"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ScanCfg = { scan: boolean; voice: boolean; voiceLang: string };
const DEFAULT_CFG: ScanCfg = { scan: true, voice: true, voiceLang: "es-PY" };

export default function FloatingButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const [cfg, setCfg] = useState<ScanCfg>(DEFAULT_CFG);

  useEffect(() => {
    fetch(`${API}/plugins/feat_scan_search`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const v = (d.values ?? {}) as Record<string, unknown>;
        const on = d.enabled !== false;
        setCfg({
          scan: on && (v.scanEnabled ?? true) !== false,
          voice: on && (v.voiceEnabled ?? true) !== false,
          voiceLang: (v.voiceLang as string)?.trim() || "es-PY",
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <>
      {(cfg.scan || cfg.voice) && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
          {cfg.scan && (
            <Button
              type="button"
              variant="solid"
              onClick={() => setScanMode("scan")}
              aria-label="Escanear código de barras"
              className="flex items-center gap-1.5 px-3 py-2 rounded-l-full rounded-r-none text-white text-[13px] font-medium shadow-md"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              <BarcodeIcon className="w-4 h-4 shrink-0" />
              <span>Escanear</span>
            </Button>
          )}
          {cfg.voice && (
            <Button
              type="button"
              variant="solid"
              onClick={() => setScanMode("voice")}
              aria-label="Búsqueda por voz"
              className="flex items-center gap-1.5 px-3 py-2 rounded-l-full rounded-r-none text-white text-[13px] font-medium shadow-md"
              style={{ backgroundColor: "#e74c3c" }}
            >
              <MicIcon className="w-4 h-4 shrink-0" />
              <span>Voz</span>
            </Button>
          )}
        </div>
      )}

      {scanMode && <ScanVoiceModal mode={scanMode} voiceLang={cfg.voiceLang} onClose={() => setScanMode(null)} />}

      <Button
        onClick={handleScrollTop}
        aria-label="Volver arriba"
        variant="solid"
        shape="circle"
        icon={<ArrowUpIcon className="w-5 h-5" />}
        className={cn(
          "fixed bottom-6 right-6 z-50 size-11 shadow-md transition-all duration-300",
          showScrollTop
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-75 pointer-events-none"
        )}
      />
    </>
  );
}
