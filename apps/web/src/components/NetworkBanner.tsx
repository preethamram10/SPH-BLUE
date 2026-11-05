"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

export default function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnectivity = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`/api/health?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        if (!isOnline) {
          setShowReconnected(true);
          setTimeout(() => setShowReconnected(false), 2500);
        }
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      checkConnectivity();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic heartbeat every 8 seconds
    const interval = setInterval(() => {
      checkConnectivity();
    }, 8000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[99999] px-4 py-2 text-xs font-bold text-white shadow-md transition-all duration-300 flex items-center justify-between ${
        !isOnline ? "bg-rose-600 animate-in slide-in-from-top" : "bg-emerald-600 animate-in fade-in"
      }`}
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
          ) : (
            <Wifi className="w-4 h-4 shrink-0" />
          )}
          <span>
            {!isOnline
              ? "No Internet Connection — Please check your Wi-Fi or Mobile Data connection."
              : "Back Online — Connection restored successfully."}
          </span>
        </div>

        {!isOnline && (
          <button
            type="button"
            onClick={checkConnectivity}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
            <span>{isChecking ? "Checking..." : "Retry"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

