"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@platform/ui";
import type { QuaggaJSCodeReader } from "@ericblade/quagga2";

export type ScanMode = "scan" | "voice";

const READERS: QuaggaJSCodeReader[] = [
  "ean_reader",
  "ean_8_reader",
  "upc_reader",
  "upc_e_reader",
  "code_128_reader",
  "code_39_reader",
];

interface SpeechAlternative { transcript: string }
interface SpeechResult { readonly length: number; isFinal: boolean; [i: number]: SpeechAlternative }
interface SpeechRecognitionEvent { results: { readonly length: number; [i: number]: SpeechResult } }
interface SpeechRecognitionErrorEvent { error: string }
interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new Ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = 800;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ac.close(); }, 180);
  } catch { /* sin audio */ }
}

export default function ScanVoiceModal({ mode, voiceLang = "es-PY", onClose }: { mode: ScanMode; voiceLang?: string; onClose: () => void }) {
  const router = useRouter();
  const scanRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState("");
  const lastCode = useRef<{ code: string; at: number } | null>(null);
  const quaggaRef = useRef<typeof import("@ericblade/quagga2").default | null>(null);
  const closedRef = useRef(false);

  const submit = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      closedRef.current = true;
      router.push(`/buscar?q=${encodeURIComponent(q)}`);
      onClose();
    },
    [router, onClose],
  );

  useEffect(() => {
    if (mode !== "scan") return;
    let cancelled = false;
    setStatus("Solicitando acceso a la cámara…");
    (async () => {
      try {
        const Quagga = (await import("@ericblade/quagga2")).default;
        if (cancelled || !scanRef.current) return;
        quaggaRef.current = Quagga;
        await new Promise<void>((resolve, reject) => {
          Quagga.init(
            {
              inputStream: {
                type: "LiveStream",
                target: scanRef.current!,
                constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
                area: { top: "15%", right: "10%", left: "10%", bottom: "15%" },
              },
              locator: { patchSize: "medium", halfSample: false },
              numOfWorkers: Math.min(4, navigator.hardwareConcurrency || 2),
              frequency: 10,
              decoder: { readers: READERS },
            },
            (err: unknown) => (err ? reject(err) : resolve()),
          );
        });
        if (cancelled) { Quagga.stop(); return; }
        Quagga.start();
        setStatus("Apuntá la cámara al código de barras.");
        Quagga.onDetected((res: { codeResult?: { code?: string | null } }) => {
          const code = res?.codeResult?.code ?? "";
          if (!code || code.length < 8) return;
          const now = Date.now();
          if (lastCode.current && lastCode.current.code === code && now - lastCode.current.at < 2000) {
            beep();
            if (navigator.vibrate) navigator.vibrate(200);
            submit(code);
            return;
          }
          lastCode.current = { code, at: now };
          setStatus(`Detectando… ${code}`);
        });
      } catch {
        setStatus("No pudimos acceder a la cámara. Ingresá el código manualmente.");
      }
    })();
    return () => {
      cancelled = true;
      try { quaggaRef.current?.stop(); } catch { /* ignore */ }
    };
  }, [mode, submit]);

  useEffect(() => {
    if (mode !== "voice") return;
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) { setStatus("Tu navegador no soporta búsqueda por voz."); return; }
    const rec = new SR();
    rec.lang = voiceLang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    setStatus("Escuchando… decí el producto que buscás.");
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(" ").trim();
      if (e.results[e.results.length - 1].isFinal && text) {
        setStatus(`"${text}"`);
        submit(text);
      } else {
        setStatus(text ? `"${text}"…` : "Escuchando…");
      }
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      const msg: Record<string, string> = {
        "no-speech": "No te escuchamos. Intentá de nuevo.",
        "audio-capture": "No detectamos micrófono.",
        "not-allowed": "Permiso de micrófono denegado.",
        network: "Error de red en el reconocimiento.",
      };
      setStatus(msg[e.error] ?? "No pudimos reconocer tu voz.");
    };
    try { rec.start(); } catch { /* ignore */ }
    return () => { try { rec.stop(); } catch { /* ignore */ } };
  }, [mode, submit, voiceLang]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-text">
            {mode === "scan" ? "Escanear código" : "Búsqueda por voz"}
          </h3>
          <Button
            type="button"
            variant="plain"
            shape="circle"
            aria-label="Cerrar"
            onClick={onClose}
            className="text-brand-muted hover:bg-gray-100"
          >
            ✕
          </Button>
        </div>

        {mode === "scan" ? (
          <div className="overflow-hidden rounded-xl bg-black [&_video]:w-full [&_canvas]:hidden" style={{ aspectRatio: "4/3" }} ref={scanRef} />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl bg-search-bg">
            <div className="size-16 animate-pulse rounded-full bg-brand-orange/20 flex items-center justify-center">
              <span className="text-3xl">🎤</span>
            </div>
          </div>
        )}

        <p className="mt-3 min-h-[1.25rem] text-center text-sm text-brand-muted">{status}</p>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); submit(manual); }}
        >
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={mode === "scan" ? "O ingresá el código manualmente" : "O escribí tu búsqueda"}
            className="flex-1 h-10"
          />
          <Button
            type="submit"
            variant="solid"
            shape="round"
            className="brand-gradient h-10 px-4 text-sm font-semibold"
          >
            Buscar
          </Button>
        </form>
      </div>
    </div>
  );
}
