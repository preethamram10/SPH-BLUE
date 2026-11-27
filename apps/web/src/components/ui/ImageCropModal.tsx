"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Crop, RotateCw, X } from "lucide-react";

export interface ImageCropModalProps {
  file: File | null;
  title?: string;
  onCancel: () => void;
  onConfirm: (resultFile: File) => void;
}

interface CropRect {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
}

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

const MIN_CROP_SIZE = 0.08;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  file,
  title = "Crop Prescription Image",
  onCancel,
  onConfirm,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  const [isProcessing, setIsProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const handlePointerMove = (clientX: number, clientY: number) => {
      const drag = dragStateRef.current;
      const stage = stageRef.current;
      if (!drag || !stage) return;

      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dx = (clientX - drag.startX) / rect.width;
      const dy = (clientY - drag.startY) / rect.height;
      const s = drag.startCrop;

      if (drag.mode === "move") {
        const nx = clamp(s.x + dx, 0, 1 - s.w);
        const ny = clamp(s.y + dy, 0, 1 - s.h);
        setCrop({ ...s, x: nx, y: ny });
        return;
      }

      let x1 = s.x;
      let y1 = s.y;
      let x2 = s.x + s.w;
      let y2 = s.y + s.h;

      if (drag.mode === "nw" || drag.mode === "sw") {
        x1 = clamp(s.x + dx, 0, x2 - MIN_CROP_SIZE);
      }
      if (drag.mode === "ne" || drag.mode === "se") {
        x2 = clamp(s.x + s.w + dx, x1 + MIN_CROP_SIZE, 1);
      }
      if (drag.mode === "nw" || drag.mode === "ne") {
        y1 = clamp(s.y + dy, 0, y2 - MIN_CROP_SIZE);
      }
      if (drag.mode === "sw" || drag.mode === "se") {
        y2 = clamp(s.y + s.h + dy, y1 + MIN_CROP_SIZE, 1);
      }

      setCrop({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    };

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (dragStateRef.current && e.touches.length === 1) {
        e.preventDefault();
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onEnd = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  if (!file || !imageUrl) return null;

  const startDrag = (mode: DragMode, clientX: number, clientY: number) => {
    dragStateRef.current = {
      mode,
      startX: clientX,
      startY: clientY,
      startCrop: crop,
    };
  };

  const handleRotate90 = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const nextUrl = URL.createObjectURL(blob);
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
        setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
      },
      "image/jpeg",
      0.92
    );
  };

  const handleConfirmCrop = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      onConfirm(file);
      return;
    }

    setIsProcessing(true);
    const sx = Math.round(crop.x * img.naturalWidth);
    const sy = Math.round(crop.y * img.naturalHeight);
    const sw = Math.max(1, Math.round(crop.w * img.naturalWidth));
    const sh = Math.max(1, Math.round(crop.h * img.naturalHeight));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsProcessing(false);
      onConfirm(file);
      return;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(
      (blob) => {
        setIsProcessing(false);
        if (!blob) {
          onConfirm(file);
          return;
        }
        const baseName = file.name.replace(/\.[^.]+$/, "") || "prescription";
        const croppedFile = new File([blob], `${baseName}_cropped.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onConfirm(croppedFile);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-sky-400" />
            <span className="text-xs sm:text-sm font-extrabold">{title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRotate90}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate</span>
            </button>
            <button
              type="button"
              onClick={() => setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 })}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-400 cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Crop Canvas */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 overflow-hidden select-none">
          <div
            ref={stageRef}
            className="relative inline-block max-w-full max-h-[62vh]"
            style={{ touchAction: "none" }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop preview"
              draggable={false}
              className="max-w-full max-h-[62vh] object-contain block pointer-events-none select-none rounded-lg"
            />

            {/* Darkened outside overlay using 4 strips */}
            <div
              className="absolute inset-x-0 top-0 bg-black/55 pointer-events-none"
              style={{ height: `${crop.y * 100}%` }}
            />
            <div
              className="absolute inset-x-0 bottom-0 bg-black/55 pointer-events-none"
              style={{ height: `${(1 - crop.y - crop.h) * 100}%` }}
            />
            <div
              className="absolute left-0 bg-black/55 pointer-events-none"
              style={{
                top: `${crop.y * 100}%`,
                height: `${crop.h * 100}%`,
                width: `${crop.x * 100}%`,
              }}
            />
            <div
              className="absolute right-0 bg-black/55 pointer-events-none"
              style={{
                top: `${crop.y * 100}%`,
                height: `${crop.h * 100}%`,
                width: `${(1 - crop.x - crop.w) * 100}%`,
              }}
            />

            {/* Interactive Crop Box */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                startDrag("move", e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  startDrag("move", e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
                touchAction: "none",
              }}
              className="absolute border-2 border-sky-400 cursor-move shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
            >
              {/* Rule of thirds grid */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-white/25" />
                <div className="border-r border-white/25" />
                <div />
              </div>

              {/* 4 Corner Handles */}
              {(
                [
                  { mode: "nw", pos: "-top-2 -left-2 cursor-nwse-resize" },
                  { mode: "ne", pos: "-top-2 -right-2 cursor-nesw-resize" },
                  { mode: "sw", pos: "-bottom-2 -left-2 cursor-nesw-resize" },
                  { mode: "se", pos: "-bottom-2 -right-2 cursor-nwse-resize" },
                ] as const
              ).map(({ mode, pos }) => (
                <div
                  key={mode}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    startDrag(mode, e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) {
                      startDrag(mode, e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  className={`absolute ${pos} w-5 h-5 rounded-full bg-sky-400 border-2 border-white shadow-md`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-slate-900">
          <span className="text-[11px] text-slate-400">
            Drag corners to crop or drag inside box to move
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(file)}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white cursor-pointer"
            >
              Use Full Image
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isProcessing ? "Cropping..." : "Crop & Upload"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
