"use client";

import React, { useEffect, useRef, useState } from "react";

export interface ZoomableImageViewerProps {
  src: string;
  alt: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  rotation?: number;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
  imgClassName?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  children?: React.ReactNode;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function getTouchDistance(t1: React.Touch | Touch, t2: React.Touch | Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.hypot(dx, dy);
}

/**
 * Interactive image viewer supporting physical pinch-to-zoom, mouse wheel zoom,
 * double-click/double-tap zoom, and drag-to-pan when zoomed in.
 */
export const ZoomableImageViewer: React.FC<ZoomableImageViewerProps> = ({
  src,
  alt,
  zoom: controlledZoom,
  onZoomChange,
  rotation = 0,
  minZoom = 0.5,
  maxZoom = 4,
  className = "",
  imgClassName = "",
  onError,
  children,
}) => {
  const [internalZoom, setInternalZoom] = useState(1);
  const zoom = controlledZoom !== undefined ? controlledZoom : internalZoom;

  const setZoom = (next: number) => {
    const clamped = Math.round(clamp(next, minZoom, maxZoom) * 100) / 100;
    if (controlledZoom === undefined) {
      setInternalZoom(clamped);
    }
    onZoomChange?.(clamped);
    if (clamped <= 1) {
      setPan({ x: 0, y: 0 });
    }
  };

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  // Reset pan when src changes or zoom returns to <= 1
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [src]);

  useEffect(() => {
    if (zoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  // Non-passive wheel listener for smooth mouse-wheel / trackpad zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.12 : 0.89;
      const next = zoomRef.current * factor;
      setZoom(next);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setPan({
      x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1.1) {
      setZoom(1);
    } else {
      setZoom(2);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.stopPropagation();
      pinchStartDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
      pinchStartZoomRef.current = zoom;
      dragStartRef.current = null;
      return;
    }

    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        e.stopPropagation();
        if (zoom > 1.1) {
          setZoom(1);
        } else {
          setZoom(2);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (zoom > 1) {
        e.stopPropagation();
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: pan.x,
          panY: pan.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      e.stopPropagation();
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const ratio = dist / pinchStartDistRef.current;
      setZoom(pinchStartZoomRef.current * ratio);
      return;
    }

    if (e.touches.length === 1 && dragStartRef.current && zoom > 1) {
      e.stopPropagation();
      setPan({
        x: dragStartRef.current.panX + (e.touches[0].clientX - dragStartRef.current.x),
        y: dragStartRef.current.panY + (e.touches[0].clientY - dragStartRef.current.y),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: zoom > 1 ? "none" : "pan-y",
        cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
      }}
      className={`relative flex items-center justify-center overflow-hidden select-none ${className}`}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onError={onError}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: "center center",
          transition: isDragging || pinchStartDistRef.current ? "none" : "transform 0.15s ease-out",
        }}
        className={`pointer-events-none select-none ${imgClassName}`}
      />
      {children}
    </div>
  );
};
