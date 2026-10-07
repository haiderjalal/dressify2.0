"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Download, Loader2, ScanLine, Scissors, ShieldCheck } from "lucide-react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { useI18n } from "@/i18n/client";
import { Button, buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Camera try-on. Everything runs in the browser:
 *  1. getUserMedia → <video>
 *  2. MediaPipe Pose (WASM, self-hosted in /public/mediapipe) finds shoulders
 *  3. the design's transparent overlay is scaled/rotated onto the shoulder line
 * Frames never leave the device.
 *
 * Overlay convention: 300×500 image, shoulder seam at y=60 from x=60 to x=240.
 */
const ART = { w: 300, h: 500, shoulderY: 60, shoulderW: 180, cx: 150 };
const MODEL_URL = process.env.NEXT_PUBLIC_POSE_MODEL_URL || "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

type Status = "idle" | "starting" | "loading" | "tracking" | "searching" | "manual" | "denied" | "unsupported";
type Pose = { x: number; y: number; d: number; a: number };

export function TryOnStudio({ overlayUrl, title, bookHref }: { overlayUrl: string; title: string; bookHref: string }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLImageElement | null>(null);
  const landmarker = useRef<PoseLandmarker | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);
  const smooth = useRef<Pose | null>(null);
  const manualPos = useRef({ x: 0.5, y: 0.28 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const settings = useRef({ scale: 1, lift: 0 });

  const [status, setStatus] = useState<Status>("idle");
  const [scale, setScale] = useState(1);
  const [lift, setLift] = useState(0);
  const [shot, setShot] = useState<string | null>(null);
  settings.current = { scale, lift };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = overlayUrl;
    overlay.current = img;
  }, [overlayUrl]);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    landmarker.current?.close();
  }, []);

  const draw = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const img = overlay.current;
    if (!video || !canvas || video.readyState < 2) {
      raf.current = requestAnimationFrame(draw);
      return;
    }
    const W = video.videoWidth;
    const H = video.videoHeight;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Mirror like a real mirror.
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, W, H);
    ctx.restore();

    let pose: Pose | null = null;
    if (landmarker.current) {
      const res = landmarker.current.detectForVideo(video, performance.now());
      const lm = res.landmarks[0];
      if (lm && lm[11]?.visibility > 0.5 && lm[12]?.visibility > 0.5) {
        const a = { x: (1 - lm[11].x) * W, y: lm[11].y * H };
        const b = { x: (1 - lm[12].x) * W, y: lm[12].y * H };
        const [p1, p2] = a.x < b.x ? [a, b] : [b, a];
        pose = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, d: Math.hypot(p2.x - p1.x, p2.y - p1.y), a: Math.atan2(p2.y - p1.y, p2.x - p1.x) };
      }
    }

    if (pose) {
      // Exponential smoothing removes jitter without noticeable lag.
      const s = smooth.current;
      const k = 0.35;
      smooth.current = s ? { x: s.x + (pose.x - s.x) * k, y: s.y + (pose.y - s.y) * k, d: s.d + (pose.d - s.d) * k, a: s.a + (pose.a - s.a) * k } : pose;
      setStatus((st) => (st === "searching" || st === "loading" ? "tracking" : st));
    } else if (landmarker.current) {
      setStatus((st) => (st === "tracking" ? "searching" : st));
    }

    const target: Pose | null = landmarker.current
      ? smooth.current
      : { x: manualPos.current.x * W, y: manualPos.current.y * H, d: Math.min(W, H) * 0.3, a: 0 };

    if (img?.complete && img.naturalWidth && target) {
      const { scale: sc, lift: lf } = settings.current;
      const k = (target.d * 1.12 * sc) / ART.shoulderW;
      ctx.save();
      ctx.translate(target.x, target.y - (lf / 100) * target.d);
      ctx.rotate(target.a);
      ctx.scale(k, k);
      ctx.globalAlpha = 0.96;
      ctx.drawImage(img, -ART.cx, -ART.shoulderY, ART.w, ART.h);
      ctx.restore();
    }
    raf.current = requestAnimationFrame(draw);
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setStatus("unsupported");
    setShot(null);
    setStatus("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch {
      return setStatus("denied");
    }
    const video = videoRef.current!;
    video.srcObject = stream.current;
    await video.play().catch(() => undefined);
    raf.current = requestAnimationFrame(draw);

    if (landmarker.current) return setStatus("searching");
    setStatus("loading");
    try {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks("/mediapipe");
      const create = (delegate: "GPU" | "CPU") =>
        PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numPoses: 1 });
      landmarker.current = await create("GPU").catch(() => create("CPU"));
      setStatus("searching");
    } catch (e) {
      console.warn("[try-on] pose model unavailable, manual mode", e);
      setStatus("manual");
    }
  }, [draw]);

  const capture = () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      setShot(c.toDataURL("image/jpeg", 0.9));
    } catch {
      /* tainted canvas (cross-origin overlay without CORS) */
    }
  };

  // Manual mode: drag the garment with mouse / finger.
  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>, phase: "down" | "move" | "up") => {
    if (status !== "manual") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (phase === "down") {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { dx: manualPos.current.x - x, dy: manualPos.current.y - y };
    } else if (phase === "move" && drag.current) {
      manualPos.current = { x: x + drag.current.dx, y: y + drag.current.dy };
    } else drag.current = null;
  };

  const live = status === "tracking" || status === "searching" || status === "manual" || status === "loading";
  const message =
    status === "denied" ? t("tryon.denied") : status === "unsupported" ? t("tryon.unsupported") : status === "loading" ? t("tryon.loadingModel") : status === "searching" ? t("tryon.noPose") : status === "manual" ? t("tryon.manual") : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-ink shadow-lift">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas
          ref={canvasRef}
          className={cn("block aspect-video w-full touch-none bg-ink object-contain", !live && "hidden")}
          onPointerDown={(e) => onPointer(e, "down")}
          onPointerMove={(e) => onPointer(e, "move")}
          onPointerUp={(e) => onPointer(e, "up")}
        />
        {!live && (
          <div className="grid aspect-video w-full place-items-center p-8 text-center text-paper">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={overlayUrl} alt={title} className="mx-auto h-48 object-contain opacity-90 sm:h-64" />
              <Button variant="gold" size="lg" className="mt-6" onClick={start} disabled={status === "starting"}>
                {status === "starting" ? <Loader2 className="animate-spin" /> : <Camera />} {t("tryon.start")}
              </Button>
              {message && <p className="mx-auto mt-4 max-w-sm text-sm text-paper/80">{message}</p>}
            </div>
          </div>
        )}
        {live && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-4">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium backdrop-blur", status === "tracking" ? "bg-emerald/80 text-paper" : "bg-ink/60 text-paper")}>
              {status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <ScanLine className="size-3.5" />}
              {status === "tracking" ? t("tryon.tracking") : message}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="font-display text-2xl font-medium">{title}</p>
          <label className="mt-5 block text-sm font-medium text-ink-soft">
            {t("tryon.size")}
            <input type="range" min={0.7} max={1.5} step={0.01} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="mt-2 w-full accent-gold" />
          </label>
          <label className="mt-4 block text-sm font-medium text-ink-soft">
            {t("tryon.height")}
            <input type="range" min={-40} max={40} step={1} value={lift} onChange={(e) => setLift(Number(e.target.value))} className="mt-2 w-full accent-gold" />
          </label>
          <div className="mt-5 grid gap-2">
            {live ? (
              <>
                <Button onClick={capture} variant="primary">
                  <Camera /> {t("tryon.capture")}
                </Button>
                <Button onClick={stop} variant="outline">
                  <CameraOff /> {t("tryon.stop")}
                </Button>
              </>
            ) : null}
            <Link href={bookHref} className={buttonClass("emerald", "md")}>
              <Scissors /> {t("tryon.bookThis")}
            </Link>
          </div>
        </div>
        {shot && (
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot} alt="" className="w-full" />
            <a href={shot} download="dressify-try-on.jpg" className={buttonClass("outline", "sm", "m-3")}>
              <Download /> {t("tryon.download")}
            </a>
          </div>
        )}
        <p className="flex items-start gap-2 text-xs text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald" /> {t("tryon.privacy")}
        </p>
      </div>
    </div>
  );
}
