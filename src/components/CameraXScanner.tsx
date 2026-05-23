import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Flashlight, FlashlightOff } from "lucide-react";
import { BarcodeFormat, BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { useToastActions } from "@/components/ui/toast";

type CameraXScannerProps = {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  continuous?: boolean;
};

type BarcodeDetectorLike = {
  detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

const ROI_RATIO = 0.6;
const ROI_MAX = 800;
const NATIVE_FORMATS = ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"];
const ZXING_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.QR_CODE,
];
const BLACKLIST = ["ultra", "wide", "geniş", "0.5", "0.6", "aux", "ultrawide"];

export default function CameraXScanner({
  isOpen,
  onClose,
  onScan,
  continuous = false,
}: CameraXScannerProps) {
  const toast = useToastActions();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const roiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const rafRef = useRef<number | null>(null);
  const focusIntervalRef = useRef<number | null>(null);
  const cooldownTimeoutRef = useRef<number | null>(null);
  const scanningRef = useRef<boolean>(true);
  const zoomRef = useRef<number>(1);
  const preferredFocusModeRef = useRef<string>("continuous");

  const [isLoading, setIsLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });

  const formats = useMemo(() => NATIVE_FORMATS, []);

  const getZxingReader = useCallback(() => {
    if (!zxingReaderRef.current) {
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      zxingReaderRef.current = new BrowserMultiFormatReader(hints);
    }
    return zxingReaderRef.current;
  }, []);

  const detectBarcode = useCallback(async (canvas: HTMLCanvasElement) => {
    if (window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({ formats });
        const detected = await detector.detect(canvas);
        const raw = detected.find((d) => d.rawValue?.trim())?.rawValue?.trim();
        if (raw) return raw;
      } catch {
        // Fall back to ZXing if the native detector exists but fails.
      }
    }

    try {
      const result = getZxingReader().decodeFromCanvas(canvas);
      return result.getText().trim() || "";
    } catch {
      return "";
    }
  }, [formats, getZxingReader]);

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (focusIntervalRef.current) {
      window.clearInterval(focusIntervalRef.current);
      focusIntervalRef.current = null;
    }
    if (cooldownTimeoutRef.current) {
      window.clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    const stream = streamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
    setTorchOn(false);
    setTorchAvailable(false);
    scanningRef.current = true;
    setFocusPoint((p) => ({ ...p, show: false }));
  }, []);

  const getTrackCapabilities = () => {
    const track = trackRef.current as MediaStreamTrack & {
      getCapabilities?: () => MediaTrackCapabilities & {
        torch?: boolean;
        zoom?: { min?: number; max?: number };
        focusMode?: string[];
        focusDistance?: { min?: number; max?: number };
      };
    };
    return track?.getCapabilities ? track.getCapabilities() : null;
  };

  const applyTrackConstraints = async (advanced: Record<string, any>) => {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [advanced] });
    } catch {
      // Cihaz desteği yoksa sessiz geç
    }
  };

  const selectPreferredFocusMode = (modes: string[] | undefined) => {
    if (!modes || modes.length === 0) return "";
    if (modes.includes("macro")) return "macro";
    if (modes.includes("continuous")) return "continuous";
    if (modes.includes("auto")) return "auto";
    return modes[0];
  };

  const setupInitialCameraParams = useCallback(async () => {
    const caps = getTrackCapabilities();
    if (!caps) return;

    const capsAny = caps as any;
    if (typeof capsAny.torch === "boolean") setTorchAvailable(capsAny.torch);

    const focusMode = selectPreferredFocusMode((caps as any).focusMode);
    if (focusMode) preferredFocusModeRef.current = focusMode;

    const advanced: Record<string, any> = {};

    const zoomCaps = (caps as any).zoom;
    if (zoomCaps && typeof zoomCaps.min === "number" && typeof zoomCaps.max === "number") {
      const z = Math.max(zoomCaps.min, Math.min(2.0, zoomCaps.max));
      zoomRef.current = z;
      advanced.zoom = z;
    } else {
      zoomRef.current = 1;
    }

    if (focusMode) advanced.focusMode = focusMode;

    const focusDistance = (caps as any).focusDistance;
    if (focusDistance && typeof focusDistance.min === "number") {
      advanced.focusDistance = focusDistance.min;
    }

    if (Object.keys(advanced).length) await applyTrackConstraints(advanced);
  }, []);

  const stabilizeFocus = useCallback(async () => {
    const caps = getTrackCapabilities();
    if (!caps) return;
    const modes = (caps as any).focusMode as string[] | undefined;
    if (!modes || !modes.includes("continuous")) return;
    await applyTrackConstraints({ focusMode: "continuous", zoom: zoomRef.current });
  }, []);

  const drawOverlay = useCallback((vw: number, vh: number, rx: number, ry: number, rw: number, rh: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }

    ctx.clearRect(0, 0, vw, vh);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, vw, vh);
    ctx.clearRect(rx, ry, rw, rh);

    ctx.strokeStyle = "rgba(45,212,191,0.95)";
    ctx.lineWidth = 3;
    ctx.strokeRect(rx, ry, rw, rh);
  }, []);

  const scanLoop = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const roiCanvas = roiCanvasRef.current;
    const roiCtx = roiCanvas?.getContext("2d", { willReadFrequently: true });
    if (!roiCanvas || !roiCtx) return;

    const tick = async () => {
      if (!isOpen || !videoRef.current) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      if (vw > 0 && vh > 0) {
        const side = Math.min(ROI_MAX, Math.floor(Math.min(vw, vh) * ROI_RATIO));
        const rx = Math.floor((vw - side) / 2);
        const ry = Math.floor((vh - side) / 2);

        drawOverlay(vw, vh, rx, ry, side, side);

        if (scanningRef.current) {
          roiCanvas.width = side;
          roiCanvas.height = side;
          roiCtx.drawImage(video, rx, ry, side, side, 0, 0, side, side);

          try {
            const raw = await detectBarcode(roiCanvas);
            if (raw) {
              if ("vibrate" in navigator) navigator.vibrate(100);
              onScan(raw);
              scanningRef.current = false;

              if (!continuous) {
                onClose();
                return;
              }
              cooldownTimeoutRef.current = window.setTimeout(() => {
                scanningRef.current = true;
              }, 1500);
            }
          } catch {
            // detect hataları bir sonraki frame'de tekrar denenir
          }
        }
      }

      rafRef.current = requestAnimationFrame(() => {
        void tick();
      });
    };

    rafRef.current = requestAnimationFrame(() => {
      void tick();
    });
  }, [continuous, detectBarcode, drawOverlay, isOpen, onClose, onScan]);

  const pickBestBackCameraId = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === "videoinput");
      if (videos.length === 0) return null;

      const backCandidates = videos.filter((d) => {
        const label = (d.label || "").toLowerCase();
        return label.includes("back") || label.includes("rear") || label.includes("arka");
      });
      const pool = backCandidates.length ? backCandidates : videos;

      const filtered = pool.filter((d) => {
        const label = (d.label || "").toLowerCase();
        return !BLACKLIST.some((k) => label.includes(k));
      });

      const selected = (filtered.length ? filtered : pool)[0];
      return selected?.deviceId || null;
    } catch {
      return null;
    }
  }, []);

  const startStream = useCallback(async () => {
    if (!isOpen) return;
    if (!("mediaDevices" in navigator) || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Tarayıcı kamera API desteği sunmuyor.");
      return;
    }
    setIsLoading(true);
    try {
      const deviceId = await pickBestBackCameraId();

      const primaryConstraints: MediaStreamConstraints = {
        audio: false,
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } }),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          // TS type'ında yok, runtime'da destekleyen cihazlar kullanır
          ...( { focusMode: "continuous", focusDistance: { ideal: 0 } } as any ),
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1080 },
          },
        });
      }

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0] || null;
      trackRef.current = track;

      const video = videoRef.current;
      if (!video) throw new Error("Video elementi bulunamadı.");
      video.srcObject = stream;
      await video.play();

      await setupInitialCameraParams();
      focusIntervalRef.current = window.setInterval(() => {
        void stabilizeFocus();
      }, 5000);

      void scanLoop();
    } catch (e: any) {
      toast.error(e?.message || "Kamera başlatılamadı. Lütfen izinleri ve cihazı kontrol edin.");
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, onClose, pickBestBackCameraId, scanLoop, setupInitialCameraParams, stabilizeFocus, toast]);

  const toggleTorch = useCallback(async () => {
    if (!torchAvailable) return;
    const next = !torchOn;
    await applyTrackConstraints({ torch: next, zoom: zoomRef.current });
    setTorchOn(next);
  }, [torchAvailable, torchOn]);

  const handleTapToFocus = useCallback(async (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y, show: true });
    window.setTimeout(() => setFocusPoint((p) => ({ ...p, show: false })), 700);

    const caps = getTrackCapabilities();
    if (!caps) return;

    const modes = (caps as any).focusMode as string[] | undefined;
    const manualMode = modes?.includes("auto") ? "auto" : preferredFocusModeRef.current;

    const focusDistance = (caps as any).focusDistance;
    const advancedStart: Record<string, any> = { zoom: zoomRef.current };
    if (manualMode) advancedStart.focusMode = manualMode;
    if (focusDistance && typeof focusDistance.min === "number") advancedStart.focusDistance = focusDistance.min;
    await applyTrackConstraints(advancedStart);

    window.setTimeout(() => {
      void applyTrackConstraints({ focusMode: preferredFocusModeRef.current, zoom: zoomRef.current });
    }, 600);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }
    void startStream();
    return cleanup;
  }, [cleanup, isOpen, startStream]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90">
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        <canvas ref={overlayCanvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
      </div>

      <div
        className="absolute inset-0"
        onClick={handleTapToFocus}
        role="button"
        tabIndex={0}
        onKeyDown={() => {}}
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vw] w-[60vw] max-h-[360px] max-w-[360px] -translate-x-1/2 -translate-y-1/2 border-2 border-cyan-300/95 rounded-xl overflow-hidden">
          <div className="absolute inset-x-0 h-[2px] bg-red-500/90 shadow-[0_0_12px_rgba(239,68,68,0.95)] animate-[scannerline_2.2s_linear_infinite]" />
        </div>
        {focusPoint.show && (
          <div
            className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 animate-ping"
            style={{ left: focusPoint.x, top: focusPoint.y }}
          />
        )}
      </div>

      <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white"
          aria-label="Kapat"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          type="button"
          disabled={!torchAvailable}
          onClick={toggleTorch}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-40"
          aria-label="Flaş"
          title={torchAvailable ? "Flaş" : "Flaş desteklenmiyor"}
        >
          {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
        </button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl bg-black/60 px-4 py-3 text-sm text-white">Kamera hazırlanıyor...</div>
        </div>
      )}

      <canvas ref={roiCanvasRef} className="hidden" />

      <style>{`
        @keyframes scannerline {
          0% { transform: translateY(0); }
          50% { transform: translateY(calc(min(60vw, 360px) - 2px)); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
